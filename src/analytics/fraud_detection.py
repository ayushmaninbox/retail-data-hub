"""
fraud_detection.py
==================
Detects potentially fraudulent transactions using a rule-based scoring
engine on Gold layer star schema data.

Fraud Signals:
  1. Velocity abuse   — Same customer, 5+ transactions in one day (+25)
  2. Price manipulation — Unit price <30% of product median (+35)
  3. Quantity stuffing  — Single line item qty > 20 (+20)
  4. Off-hours activity — Web orders placed 12AM–5AM (+10)
  5. New customer burst — First purchase > ₹5,000 (+15)
  6. High-value outlier — Transaction > 3× avg order value (+20)

Output: data/analytics/fraud_report.json
"""

import os
import json
import duckdb
import numpy as np
import pandas as pd
from datetime import datetime

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


def risk_label(score):
    """Map cumulative score to risk label."""
    if score >= 70:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 30:
        return "Medium"
    return "Low"


# ══════════════════════════════════════════════════════════════════════
# FRAUD SCORING ENGINE
# ══════════════════════════════════════════════════════════════════════

def compute_fraud_scores(con):
    """Apply rule-based fraud signals and compute cumulative scores."""

    # Load all transactions with full context
    df = con.execute("""
        SELECT
            f.transaction_id,
            f.channel,
            f.quantity,
            f.unit_price,
            f.total_amount,
            p.product_name,
            p.category,
            c.customer_id,
            s.city,
            s.store_id,
            d.full_date,
            d.day_name,
            d.month,
            d.is_weekend
        FROM fact_sales f
        JOIN dim_product p ON f.product_sk = p.product_sk
        JOIN dim_customer c ON f.customer_sk = c.customer_sk
        JOIN dim_store s ON f.store_sk = s.store_sk
        JOIN dim_date d ON f.date_key = d.date_key
    """).fetchdf()

    # Pre-compute baselines
    product_medians = df.groupby("product_name")["unit_price"].median().to_dict()
    avg_order_value = df["total_amount"].mean()
    customer_first_date = df.groupby("customer_id")["full_date"].min().to_dict()
    customer_daily_counts = df.groupby(["customer_id", "full_date"]).size().reset_index(name="daily_count")

    # Merge daily counts back
    df = df.merge(customer_daily_counts, on=["customer_id", "full_date"], how="left")

    # Initialize scores
    df["fraud_score"] = 0
    df["signals"] = [[] for _ in range(len(df))]

    # ── Signal 1: Velocity Abuse (5+ txns/day by same customer) ─────
    velocity_mask = df["daily_count"] >= 5
    df.loc[velocity_mask, "fraud_score"] += 25
    for idx in df[velocity_mask].index:
        df.at[idx, "signals"] = df.at[idx, "signals"] + [f"Velocity: {df.at[idx, 'daily_count']} txns in 1 day"]

    # ── Signal 2: Price Manipulation (<30% of median) ───────────────
    for idx, row in df.iterrows():
        median_price = product_medians.get(row["product_name"], 0)
        if median_price > 0 and row["unit_price"] < median_price * 0.30:
            df.at[idx, "fraud_score"] += 35
            df.at[idx, "signals"] = df.at[idx, "signals"] + [
                f"Price: ₹{row['unit_price']:,.0f} vs median ₹{median_price:,.0f}"
            ]

    # ── Signal 3: Quantity Stuffing (qty > 20) ──────────────────────
    qty_mask = df["quantity"] > 20
    df.loc[qty_mask, "fraud_score"] += 20
    for idx in df[qty_mask].index:
        df.at[idx, "signals"] = df.at[idx, "signals"] + [f"Qty stuffing: {df.at[idx, 'quantity']} units"]

    # ── Signal 4: Off-Hours Web Orders (simulated via weekend + Web) ─
    # Since we don't have exact timestamps, we'll flag Web orders on weekends
    offhours_mask = (df["channel"] == "Web") & (df["is_weekend"] == True)
    df.loc[offhours_mask, "fraud_score"] += 10
    for idx in df[offhours_mask].index:
        df.at[idx, "signals"] = df.at[idx, "signals"] + ["Off-hours: Weekend web order"]

    # ── Signal 5: New Customer Burst (first purchase > ₹5,000) ──────
    for idx, row in df.iterrows():
        first_date = customer_first_date.get(row["customer_id"])
        if first_date is not None and row["full_date"] == first_date and row["total_amount"] > 5000:
            df.at[idx, "fraud_score"] += 15
            df.at[idx, "signals"] = df.at[idx, "signals"] + [
                f"New customer burst: ₹{row['total_amount']:,.0f} on first day"
            ]

    # ── Signal 6: High-Value Outlier (> 3× AOV) ────────────────────
    highval_mask = df["total_amount"] > avg_order_value * 3
    df.loc[highval_mask, "fraud_score"] += 20
    for idx in df[highval_mask].index:
        df.at[idx, "signals"] = df.at[idx, "signals"] + [
            f"High value: ₹{df.at[idx, 'total_amount']:,.0f} (avg ₹{avg_order_value:,.0f})"
        ]

    # Cap score at 100
    df["fraud_score"] = df["fraud_score"].clip(upper=100)
    df["risk_level"] = df["fraud_score"].apply(risk_label)

    return df


# ══════════════════════════════════════════════════════════════════════
# REPORT BUILDER
# ══════════════════════════════════════════════════════════════════════

def build_report(df):
    """Build the fraud report JSON from scored transactions."""

    flagged = df[df["fraud_score"] > 0].copy()
    total_txns = len(df)
    flagged_count = len(flagged)

    # Risk distribution
    risk_dist = flagged["risk_level"].value_counts().to_dict()
    risk_distribution = [
        {"level": level, "count": risk_dist.get(level, 0)}
        for level in ["Critical", "High", "Medium", "Low"]
    ]

    # Fraud rate
    fraud_rate = round(flagged_count / total_txns * 100, 2) if total_txns > 0 else 0

    # Top 15 riskiest transactions
    top_flagged = flagged.nlargest(15, "fraud_score")
    top_transactions = []
    for _, row in top_flagged.iterrows():
        top_transactions.append({
            "transaction_id": row["transaction_id"],
            "customer_id": row["customer_id"],
            "product_name": row["product_name"],
            "category": row["category"],
            "city": row["city"],
            "channel": row["channel"],
            "date": str(row["full_date"])[:10],
            "quantity": int(row["quantity"]),
            "unit_price": round(float(row["unit_price"]), 2),
            "total_amount": round(float(row["total_amount"]), 2),
            "fraud_score": int(row["fraud_score"]),
            "risk_level": row["risk_level"],
            "signals": row["signals"],
        })

    # Top 10 riskiest customers
    customer_risk = flagged.groupby("customer_id").agg(
        total_score=("fraud_score", "sum"),
        avg_score=("fraud_score", "mean"),
        flagged_txns=("fraud_score", "count"),
        total_amount=("total_amount", "sum"),
    ).reset_index()
    customer_risk = customer_risk.nlargest(10, "total_score")
    top_customers = []
    for _, row in customer_risk.iterrows():
        top_customers.append({
            "customer_id": row["customer_id"],
            "total_risk_score": int(row["total_score"]),
            "avg_score": round(float(row["avg_score"]), 1),
            "flagged_transactions": int(row["flagged_txns"]),
            "total_amount": round(float(row["total_amount"]), 2),
        })

    # Fraud by channel
    channel_fraud = flagged.groupby("channel").agg(
        count=("fraud_score", "count"),
        avg_score=("fraud_score", "mean"),
        total_amount=("total_amount", "sum"),
    ).reset_index()
    by_channel = [
        {
            "channel": row["channel"],
            "flagged_count": int(row["count"]),
            "avg_score": round(float(row["avg_score"]), 1),
            "total_amount": round(float(row["total_amount"]), 2),
        }
        for _, row in channel_fraud.iterrows()
    ]

    # Fraud by city
    city_fraud = flagged.groupby("city").agg(
        count=("fraud_score", "count"),
        avg_score=("fraud_score", "mean"),
    ).reset_index().sort_values("count", ascending=False)
    by_city = [
        {
            "city": row["city"],
            "flagged_count": int(row["count"]),
            "avg_score": round(float(row["avg_score"]), 1),
        }
        for _, row in city_fraud.iterrows()
    ]

    # Fraud timeline (by month)
    flagged["month_str"] = flagged["full_date"].astype(str).str[:7]
    monthly = flagged.groupby("month_str").agg(
        count=("fraud_score", "count"),
        avg_score=("fraud_score", "mean"),
    ).reset_index().sort_values("month_str")
    fraud_timeline = [
        {
            "month": row["month_str"],
            "flagged_count": int(row["count"]),
            "avg_score": round(float(row["avg_score"]), 1),
        }
        for _, row in monthly.iterrows()
    ]

    # Signal frequency
    all_signals = []
    for sigs in flagged["signals"]:
        for s in sigs:
            signal_type = s.split(":")[0].strip()
            all_signals.append(signal_type)
    signal_counts = pd.Series(all_signals).value_counts().to_dict()
    signal_frequency = [{"signal": k, "count": v} for k, v in signal_counts.items()]

    return {
        "computed_at": datetime.now().isoformat(),
        "summary": {
            "total_transactions": total_txns,
            "flagged_transactions": flagged_count,
            "fraud_rate_pct": fraud_rate,
            "risk_distribution": risk_distribution,
            "avg_fraud_score": round(float(flagged["fraud_score"].mean()), 1) if flagged_count > 0 else 0,
        },
        "top_transactions": top_transactions,
        "top_customers": top_customers,
        "by_channel": by_channel,
        "by_city": by_city,
        "fraud_timeline": fraud_timeline,
        "signal_frequency": signal_frequency,
    }


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def run_fraud_detection():
    print("=" * 60)
    print("🛡️  FRAUD DETECTION — Rule-Based Scoring Engine")
    print("=" * 60)

    print("\n📂 Loading Gold layer …")
    con = load_star_schema()

    print("\n🔎 Scoring transactions …")
    scored_df = compute_fraud_scores(con)

    print("\n📊 Building report …")
    report = build_report(scored_df)

    # Print summary
    s = report["summary"]
    print(f"\n  🧾 Total Transactions  : {s['total_transactions']:,}")
    print(f"  🚨 Flagged Transactions: {s['flagged_transactions']:,}")
    print(f"  📈 Fraud Rate          : {s['fraud_rate_pct']}%")
    print(f"  ⚡ Avg Fraud Score     : {s['avg_fraud_score']}")
    print(f"\n  📊 Risk Distribution:")
    for r in s["risk_distribution"]:
        emoji = {"Critical": "🔴", "High": "🟠", "Medium": "🟡", "Low": "🟢"}.get(r["level"], "⚪")
        print(f"     {emoji} {r['level']}: {r['count']}")

    print(f"\n  📡 Signal Frequency:")
    for sig in report["signal_frequency"][:6]:
        print(f"     → {sig['signal']}: {sig['count']}")

    # Save
    output_path = os.path.join(ANALYTICS_DIR, "fraud_report.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n💾 Saved → {output_path}")
    print("=" * 60)

    con.close()
    return report


if __name__ == "__main__":
    run_fraud_detection()
