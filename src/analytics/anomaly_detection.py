"""
anomaly_detection.py
====================
Detects anomalies in Gold layer sales data using statistical methods
and machine learning (Isolation Forest).

Detection Methods:
  1. Revenue anomalies  — Z-Score on daily store revenue (±2.5σ)
  2. Quantity outliers   — IQR on transaction quantities per product
  3. Price anomalies     — Deviation from product median price (>50%)
  4. Multivariate        — Isolation Forest on (quantity, price, total)

Output: data/analytics/anomaly_report.json
"""

import os
import json
import duckdb
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import IsolationForest

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GOLD_DIR = os.path.join(ROOT_DIR, "data", "gold")
ANALYTICS_DIR = os.path.join(ROOT_DIR, "data", "analytics")
os.makedirs(ANALYTICS_DIR, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════

def load_star_schema():
    """Load all Gold tables into a DuckDB in-memory database."""
    con = duckdb.connect()

    for table in ["fact_sales", "dim_date", "dim_product", "dim_store", "dim_customer"]:
        path = os.path.join(GOLD_DIR, f"{table}.parquet")
        con.execute(f"CREATE TABLE {table} AS SELECT * FROM read_parquet('{path}')")
        count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  ✓ Loaded {table}: {count:,} rows")

    return con


def severity_label(score):
    """Map a numeric score (0–100) to a severity label."""
    if score >= 80:
        return "Critical"
    elif score >= 60:
        return "High"
    elif score >= 40:
        return "Medium"
    return "Low"


# ══════════════════════════════════════════════════════════════════════
# 1. REVENUE ANOMALIES — Z-Score on daily store revenue
# ══════════════════════════════════════════════════════════════════════

def detect_revenue_anomalies(con):
    """Flag days where a store's revenue deviates ±2.5σ from its mean."""
    df = con.execute("""
        SELECT
            s.store_id,
            s.city,
            d.full_date,
            SUM(f.total_amount) AS daily_revenue,
            COUNT(*) AS daily_txns
        FROM fact_sales f
        JOIN dim_store s ON f.store_sk = s.store_sk
        JOIN dim_date d ON f.date_key = d.date_key
        GROUP BY s.store_id, s.city, d.full_date
    """).fetchdf()

    anomalies = []
    for store_id, group in df.groupby("store_id"):
        mean_rev = group["daily_revenue"].mean()
        std_rev = group["daily_revenue"].std()
        if std_rev == 0 or pd.isna(std_rev):
            continue

        group = group.copy()
        group["z_score"] = (group["daily_revenue"] - mean_rev) / std_rev
        outliers = group[group["z_score"].abs() > 2.5]

        for _, row in outliers.iterrows():
            # Calibrated scoring: Z=3 -> 44 (Medium), Z=5 -> 60 (High), Z=10+ -> 100 (Critical)
            score = min(100, int(abs(row["z_score"]) * 8 + 20))
            anomalies.append({
                "type": "revenue_spike" if row["z_score"] > 0 else "revenue_drop",
                "store_id": store_id,
                "city": row["city"],
                "date": str(row["full_date"])[:10],
                "daily_revenue": round(float(row["daily_revenue"]), 2),
                "mean_revenue": round(float(mean_rev), 2),
                "z_score": round(float(row["z_score"]), 2),
                "severity": severity_label(score),
                "score": score,
                "description": f"Store {store_id} in {row['city']} had ₹{row['daily_revenue']:,.0f} revenue on {str(row['full_date'])[:10]} (Z={row['z_score']:.1f}σ, mean ₹{mean_rev:,.0f})"
            })

    return anomalies


# ══════════════════════════════════════════════════════════════════════
# 2. QUANTITY OUTLIERS — IQR method per product
# ══════════════════════════════════════════════════════════════════════

def detect_quantity_outliers(con):
    """Flag transactions where quantity is beyond 1.5× IQR for that product."""
    df = con.execute("""
        SELECT
            f.transaction_id,
            p.product_name,
            p.category,
            f.quantity,
            f.total_amount,
            d.full_date,
            s.city
        FROM fact_sales f
        JOIN dim_product p ON f.product_sk = p.product_sk
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_store s ON f.store_sk = s.store_sk
    """).fetchdf()

    anomalies = []
    for product, group in df.groupby("product_name"):
        q1 = group["quantity"].quantile(0.25)
        q3 = group["quantity"].quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            iqr = 1  # avoid zero division for products with uniform qty

        upper_bound = q3 + 2.0 * iqr
        outliers = group[group["quantity"] > upper_bound]

        for _, row in outliers.iterrows():
            deviation = (row["quantity"] - upper_bound) / iqr if iqr > 0 else 0
            # Calibrated scoring for quantity
            score = min(100, int(40 + deviation * 12))
            anomalies.append({
                "type": "quantity_outlier",
                "transaction_id": row["transaction_id"],
                "product_name": product,
                "category": row["category"],
                "city": row["city"],
                "date": str(row["full_date"])[:10],
                "quantity": int(row["quantity"]),
                "upper_bound": round(float(upper_bound), 1),
                "severity": severity_label(score),
                "score": score,
                "description": f"{product}: qty {int(row['quantity'])} exceeds bound {upper_bound:.0f} (IQR={iqr:.1f}) in {row['city']}"
            })

    return anomalies


# ══════════════════════════════════════════════════════════════════════
# 3. PRICE ANOMALIES — deviation from product median
# ══════════════════════════════════════════════════════════════════════

def detect_price_anomalies(con):
    """Flag transactions where unit_price deviates >50% from product median."""
    df = con.execute("""
        SELECT
            f.transaction_id,
            p.product_name,
            p.category,
            f.unit_price,
            f.quantity,
            f.total_amount,
            d.full_date,
            s.city
        FROM fact_sales f
        JOIN dim_product p ON f.product_sk = p.product_sk
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_store s ON f.store_sk = s.store_sk
    """).fetchdf()

    # Compute median price per product
    medians = df.groupby("product_name")["unit_price"].median().to_dict()

    anomalies = []
    for _, row in df.iterrows():
        median_price = medians.get(row["product_name"], 0)
        if median_price <= 0:
            continue

        deviation_pct = abs(row["unit_price"] - median_price) / median_price
        if deviation_pct > 0.50:
            score = min(100, int(deviation_pct * 80))
            anomalies.append({
                "type": "price_anomaly",
                "transaction_id": row["transaction_id"],
                "product_name": row["product_name"],
                "category": row["category"],
                "city": row["city"],
                "date": str(row["full_date"])[:10],
                "unit_price": round(float(row["unit_price"]), 2),
                "median_price": round(float(median_price), 2),
                "deviation_pct": round(float(deviation_pct * 100), 1),
                "severity": severity_label(score),
                "score": score,
                "description": f"{row['product_name']}: ₹{row['unit_price']:,.0f} vs median ₹{median_price:,.0f} ({deviation_pct*100:.0f}% off)"
            })

    # Keep top 200 most severe to avoid massive output
    anomalies.sort(key=lambda x: x["score"], reverse=True)
    return anomalies[:200]


# ══════════════════════════════════════════════════════════════════════
# 4. ISOLATION FOREST — multivariate anomalies
# ══════════════════════════════════════════════════════════════════════

def detect_multivariate_anomalies(con):
    """Use Isolation Forest on (quantity, unit_price, total_amount) features."""
    df = con.execute("""
        SELECT
            f.transaction_id,
            p.product_name,
            p.category,
            f.quantity,
            f.unit_price,
            f.total_amount,
            d.full_date,
            s.city,
            f.channel
        FROM fact_sales f
        JOIN dim_product p ON f.product_sk = p.product_sk
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_store s ON f.store_sk = s.store_sk
    """).fetchdf()

    features = df[["quantity", "unit_price", "total_amount"]].copy()
    # Normalize features
    for col in features.columns:
        col_std = features[col].std()
        col_mean = features[col].mean()
        if col_std > 0:
            features[col] = (features[col] - col_mean) / col_std

    model = IsolationForest(
        contamination=0.02,  # expect ~2% anomalies
        random_state=42,
        n_estimators=100,
        n_jobs=-1
    )
    predictions = model.fit_predict(features)
    scores_raw = model.decision_function(features)

    # Anomalies are where prediction == -1
    anomaly_mask = predictions == -1
    anomaly_df = df[anomaly_mask].copy()
    anomaly_scores = scores_raw[anomaly_mask]

    anomalies = []
    for idx, (_, row) in enumerate(anomaly_df.iterrows()):
        # Convert isolation score to 0–100 (more negative = more anomalous)
        raw = anomaly_scores[idx]
        score = min(100, max(0, int((1 - (raw + 0.5) / 0.5) * 50 + 30)))

        anomalies.append({
            "type": "multivariate",
            "transaction_id": row["transaction_id"],
            "product_name": row["product_name"],
            "category": row["category"],
            "city": row["city"],
            "channel": row["channel"],
            "date": str(row["full_date"])[:10],
            "quantity": int(row["quantity"]),
            "unit_price": round(float(row["unit_price"]), 2),
            "total_amount": round(float(row["total_amount"]), 2),
            "isolation_score": round(float(raw), 4),
            "severity": severity_label(score),
            "score": score,
            "description": f"ML-flagged: {row['product_name']} — qty {int(row['quantity'])}, ₹{row['unit_price']:,.0f}, total ₹{row['total_amount']:,.0f} in {row['city']}"
        })

    anomalies.sort(key=lambda x: x["score"], reverse=True)
    return anomalies[:150]


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def run_anomaly_detection():
    print("=" * 60)
    print("🔍 ANOMALY DETECTION — Statistical + ML Analysis")
    print("=" * 60)

    print("\n📂 Loading Gold layer …")
    con = load_star_schema()

    print("\n🔬 Running detectors …")

    print("  → Revenue anomalies (Z-Score) …")
    revenue_anomalies = detect_revenue_anomalies(con)
    print(f"    Found {len(revenue_anomalies)} revenue anomalies")

    print("  → Quantity outliers (IQR) …")
    quantity_anomalies = detect_quantity_outliers(con)
    print(f"    Found {len(quantity_anomalies)} quantity outliers")

    print("  → Price anomalies (Median deviation) …")
    price_anomalies = detect_price_anomalies(con)
    print(f"    Found {len(price_anomalies)} price anomalies")

    print("  → Multivariate anomalies (Isolation Forest) …")
    ml_anomalies = detect_multivariate_anomalies(con)
    print(f"    Found {len(ml_anomalies)} ML-detected anomalies")

    # ── Combine all anomalies ───────────────────────────────────
    all_anomalies = revenue_anomalies + quantity_anomalies + price_anomalies + ml_anomalies
    all_anomalies.sort(key=lambda x: x["score"], reverse=True)

    # ── Summary stats ───────────────────────────────────────────
    severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    type_counts = {}
    city_counts = {}
    date_counts = {}

    for a in all_anomalies:
        severity_counts[a["severity"]] = severity_counts.get(a["severity"], 0) + 1
        type_counts[a["type"]] = type_counts.get(a["type"], 0) + 1
        city = a.get("city", "Unknown")
        city_counts[city] = city_counts.get(city, 0) + 1
        date = a.get("date", "Unknown")
        date_counts[date] = date_counts.get(date, 0) + 1

    # Timeline data (anomalies per date)
    timeline = [{"date": d, "count": c} for d, c in sorted(date_counts.items())]

    # By type
    by_type = [{"type": t, "count": c} for t, c in sorted(type_counts.items(), key=lambda x: -x[1])]

    # By city
    by_city = [{"city": c, "count": n} for c, n in sorted(city_counts.items(), key=lambda x: -x[1])]

    # Top 20 most severe
    top_anomalies = all_anomalies[:20]

    # Most affected product (ignore 'Unknown')
    product_counts = {}
    for a in all_anomalies:
        prod = a.get("product_name", "Unknown")
        if prod != "Unknown":
            product_counts[prod] = product_counts.get(prod, 0) + 1
    most_affected_product = max(product_counts, key=product_counts.get) if product_counts else "Multiple"

    # Most affected city (ignore 'Unknown')
    city_filtered_counts = {k: v for k, v in city_counts.items() if k != "Unknown"}
    most_affected_city = max(city_filtered_counts, key=city_filtered_counts.get) if city_filtered_counts else "Multiple"

    report = {
        "computed_at": datetime.now().isoformat(),
        "summary": {
            "total_anomalies": len(all_anomalies),
            "severity_distribution": severity_counts,
            "by_type": by_type,
            "most_affected_city": most_affected_city,
            "most_affected_product": most_affected_product,
        },
        "timeline": timeline,
        "by_city": by_city,
        "top_anomalies": top_anomalies,
        "all_anomalies": all_anomalies[:500],  # cap at 500 for JSON size
    }

    # Print summary
    print(f"\n  📊 Total Anomalies: {len(all_anomalies)}")
    for sev, count in severity_counts.items():
        emoji = {"Critical": "🔴", "High": "🟠", "Medium": "🟡", "Low": "🟢"}.get(sev, "⚪")
        print(f"     {emoji} {sev}: {count}")
    print(f"\n  🏙️  Most Affected City: {most_affected_city}")
    print(f"  📦 Most Affected Product: {most_affected_product}")

    # Save
    output_path = os.path.join(ANALYTICS_DIR, "anomaly_report.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n💾 Saved → {output_path}")
    print("=" * 60)

    con.close()
    return report


if __name__ == "__main__":
    run_anomaly_detection()
