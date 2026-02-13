"""
customer_kpis.py
================
Customer Intelligence KPIs computed on Gold layer using DuckDB.

KPIs:
  1. New vs Returning customers (per month)
  2. Customer Lifetime Value (CLV)
  3. RFM Segmentation (Recency · Frequency · Monetary)
  4. Customer city distribution
  5. Top customers by revenue

Output: data/analytics/customer_kpis.json
"""

import os
import json
import duckdb
import pandas as pd
import numpy as np
from datetime import datetime

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GOLD_DIR = os.path.join(ROOT_DIR, "data", "gold")
ANALYTICS_DIR = os.path.join(ROOT_DIR, "data", "analytics")
os.makedirs(ANALYTICS_DIR, exist_ok=True)


def load_data():
    """Load Gold tables into DuckDB."""
    con = duckdb.connect()
    for table in ["fact_sales", "dim_date", "dim_product", "dim_store", "dim_customer"]:
        path = os.path.join(GOLD_DIR, f"{table}.parquet")
        con.execute(f"CREATE TABLE {table} AS SELECT * FROM read_parquet('{path}')")
    print("  ✓ All Gold tables loaded")
    return con


def query_to_dict(con, sql):
    return con.execute(sql).fetchdf().to_dict(orient="records")


# ══════════════════════════════════════════════════════════════════════
# KPI 1: NEW VS RETURNING CUSTOMERS
# ══════════════════════════════════════════════════════════════════════

def kpi_new_vs_returning(con):
    """Count new and returning customers per month."""
    result = query_to_dict(con, """
        WITH first_purchase AS (
            SELECT
                customer_sk,
                MIN(d.year_month) AS first_month
            FROM fact_sales f
            JOIN dim_date d ON f.date_key = d.date_key
            GROUP BY customer_sk
        ),
        monthly_customers AS (
            SELECT
                d.year_month,
                f.customer_sk,
                fp.first_month
            FROM fact_sales f
            JOIN dim_date d ON f.date_key = d.date_key
            JOIN first_purchase fp ON f.customer_sk = fp.customer_sk
            GROUP BY d.year_month, f.customer_sk, fp.first_month
        )
        SELECT
            year_month,
            COUNT(DISTINCT customer_sk) AS total_customers,
            COUNT(DISTINCT CASE WHEN year_month = first_month THEN customer_sk END) AS new_customers,
            COUNT(DISTINCT CASE WHEN year_month != first_month THEN customer_sk END) AS returning_customers
        FROM monthly_customers
        GROUP BY year_month
        ORDER BY year_month
    """)

    # Overall summary
    summary = query_to_dict(con, """
        WITH first_purchase AS (
            SELECT customer_sk, MIN(transaction_date) AS first_date
            FROM fact_sales
            GROUP BY customer_sk
        ),
        purchase_counts AS (
            SELECT customer_sk, COUNT(DISTINCT transaction_date) AS purchase_days
            FROM fact_sales
            GROUP BY customer_sk
        )
        SELECT
            COUNT(DISTINCT fp.customer_sk) AS total_unique_customers,
            SUM(CASE WHEN pc.purchase_days = 1 THEN 1 ELSE 0 END) AS one_time_buyers,
            SUM(CASE WHEN pc.purchase_days >= 2 THEN 1 ELSE 0 END) AS repeat_buyers,
            ROUND(SUM(CASE WHEN pc.purchase_days >= 2 THEN 1 ELSE 0 END) * 100.0 /
                  COUNT(DISTINCT fp.customer_sk), 1) AS repeat_rate_pct
        FROM first_purchase fp
        JOIN purchase_counts pc ON fp.customer_sk = pc.customer_sk
    """)

    return {
        "monthly_trend": result,
        "summary": summary[0] if summary else {},
    }


# ══════════════════════════════════════════════════════════════════════
# KPI 2: CUSTOMER LIFETIME VALUE (CLV)
# ══════════════════════════════════════════════════════════════════════

def kpi_clv(con):
    """CLV = total spend per customer, with segmentation."""
    distribution = query_to_dict(con, """
        SELECT
            c.customer_id,
            c.customer_name,
            c.city,
            SUM(f.total_amount) AS lifetime_value,
            COUNT(*) AS total_transactions,
            SUM(f.quantity) AS total_units,
            MIN(f.transaction_date) AS first_purchase,
            MAX(f.transaction_date) AS last_purchase
        FROM fact_sales f
        JOIN dim_customer c ON f.customer_sk = c.customer_sk
        WHERE c.is_current = TRUE
        GROUP BY c.customer_id, c.customer_name, c.city
        ORDER BY lifetime_value DESC
    """)

    # CLV segments
    if distribution:
        values = [d["lifetime_value"] for d in distribution]
        p25 = float(np.percentile(values, 25))
        p50 = float(np.percentile(values, 50))
        p75 = float(np.percentile(values, 75))
        p90 = float(np.percentile(values, 90))

        segments = {
            "platinum": len([v for v in values if v >= p90]),
            "gold": len([v for v in values if p75 <= v < p90]),
            "silver": len([v for v in values if p50 <= v < p75]),
            "bronze": len([v for v in values if v < p50]),
        }

        stats = {
            "avg_clv": round(float(np.mean(values)), 2),
            "median_clv": round(float(np.median(values)), 2),
            "max_clv": round(float(max(values)), 2),
            "min_clv": round(float(min(values)), 2),
            "p25": round(p25, 2),
            "p75": round(p75, 2),
            "p90": round(p90, 2),
        }
    else:
        segments = {}
        stats = {}

    return {
        "stats": stats,
        "segments": segments,
        "top_20": distribution[:20],
    }


# ══════════════════════════════════════════════════════════════════════
# KPI 3: RFM SEGMENTATION
# ══════════════════════════════════════════════════════════════════════

def kpi_rfm(con):
    """
    RFM Segmentation:
      R = Recency (days since last purchase)
      F = Frequency (number of purchase days)
      M = Monetary (total spend)

    Segments: Champions, Loyal, Potential Loyalist, At Risk, Lost
    """
    # Get RFM raw scores
    rfm_df = con.execute("""
        SELECT
            c.customer_id,
            c.customer_name,
            c.city,
            DATEDIFF('day', MAX(f.transaction_date), DATE '2025-01-31') AS recency,
            COUNT(DISTINCT f.transaction_date) AS frequency,
            SUM(f.total_amount) AS monetary
        FROM fact_sales f
        JOIN dim_customer c ON f.customer_sk = c.customer_sk
        WHERE c.is_current = TRUE
        GROUP BY c.customer_id, c.customer_name, c.city
    """).fetchdf()

    if rfm_df.empty:
        return {"segments": {}, "segment_details": [], "distribution": []}

    # Score R, F, M on 1-5 scale using quintiles
    rfm_df["r_score"] = pd.qcut(rfm_df["recency"], q=5, labels=[5, 4, 3, 2, 1]).astype(int)
    rfm_df["f_score"] = pd.qcut(rfm_df["frequency"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm_df["m_score"] = pd.qcut(rfm_df["monetary"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm_df["rfm_score"] = rfm_df["r_score"] + rfm_df["f_score"] + rfm_df["m_score"]

    # Assign segments
    def assign_segment(row):
        r, f, m = row["r_score"], row["f_score"], row["m_score"]
        if r >= 4 and f >= 4 and m >= 4:
            return "Champions"
        elif r >= 3 and f >= 3 and m >= 3:
            return "Loyal Customers"
        elif r >= 4 and f <= 2:
            return "New Customers"
        elif r >= 3 and f >= 2:
            return "Potential Loyalist"
        elif r <= 2 and f >= 3:
            return "At Risk"
        elif r <= 2 and f <= 2 and m <= 2:
            return "Lost"
        else:
            return "Need Attention"

    rfm_df["segment"] = rfm_df.apply(assign_segment, axis=1)

    # Segment summary
    segment_summary = rfm_df.groupby("segment").agg(
        count=("customer_id", "count"),
        avg_recency=("recency", "mean"),
        avg_frequency=("frequency", "mean"),
        avg_monetary=("monetary", "mean"),
    ).reset_index()

    segment_summary["avg_recency"] = segment_summary["avg_recency"].round(0)
    segment_summary["avg_frequency"] = segment_summary["avg_frequency"].round(1)
    segment_summary["avg_monetary"] = segment_summary["avg_monetary"].round(0)

    return {
        "segments": segment_summary.to_dict(orient="records"),
        "distribution": rfm_df[["customer_id", "customer_name", "city", "recency",
                                 "frequency", "monetary", "r_score", "f_score",
                                 "m_score", "rfm_score", "segment"]].to_dict(orient="records"),
    }


# ══════════════════════════════════════════════════════════════════════
# KPI 4: CUSTOMER CITY DISTRIBUTION
# ══════════════════════════════════════════════════════════════════════

def kpi_customer_cities(con):
    """Customer distribution by city (current addresses)."""
    return query_to_dict(con, """
        SELECT
            c.city,
            c.state,
            COUNT(DISTINCT c.customer_id) AS customers,
            SUM(f.total_amount) AS total_spend,
            ROUND(AVG(f.total_amount), 2) AS avg_transaction
        FROM fact_sales f
        JOIN dim_customer c ON f.customer_sk = c.customer_sk
        WHERE c.is_current = TRUE
        GROUP BY c.city, c.state
        ORDER BY total_spend DESC
    """)


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def run_customer_kpis():
    print("=" * 60)
    print("👥 CUSTOMER KPIs — CLV, RFM, New vs Returning")
    print("=" * 60)

    print("\n📂 Loading Gold layer …")
    con = load_data()

    print("\n🔢 Computing KPIs …")
    kpis = {
        "computed_at": datetime.now().isoformat(),
        "new_vs_returning": kpi_new_vs_returning(con),
        "clv": kpi_clv(con),
        "rfm": kpi_rfm(con),
        "customer_cities": kpi_customer_cities(con),
    }

    # Print summary
    nvr = kpis["new_vs_returning"]["summary"]
    clv = kpis["clv"]["stats"]
    print(f"\n  👥 Total Unique Customers : {nvr.get('total_unique_customers', 0):,}")
    print(f"  🔁 Repeat Rate           : {nvr.get('repeat_rate_pct', 0)}%")
    print(f"  💰 Avg CLV               : ₹{clv.get('avg_clv', 0):,.0f}")
    print(f"  💰 Median CLV            : ₹{clv.get('median_clv', 0):,.0f}")
    print(f"  🏆 Max CLV               : ₹{clv.get('max_clv', 0):,.0f}")

    rfm_segments = kpis["rfm"].get("segments", [])
    if rfm_segments:
        print(f"\n  📊 RFM Segments:")
        for seg in sorted(rfm_segments, key=lambda x: x["count"], reverse=True):
            print(f"     {seg['segment']:20s} → {seg['count']:,} customers (avg ₹{seg['avg_monetary']:,.0f})")

    # Save
    output_path = os.path.join(ANALYTICS_DIR, "customer_kpis.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(kpis, f, indent=2, default=str)

    print(f"\n💾 Saved → {output_path}")
    print("=" * 60)

    con.close()
    return kpis


if __name__ == "__main__":
    run_customer_kpis()
