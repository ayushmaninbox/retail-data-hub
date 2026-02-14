"""
commercial_kpis.py
==================
Commercial KPIs computed on Gold layer star schema using DuckDB.

KPIs:
  1. Total / Daily / Monthly revenue
  2. City-wise sales breakdown
  3. Top 10 products by quantity sold & revenue
  4. Channel mix (POS vs Web)
  5. Category-wise revenue split
  6. Average order value (AOV)

Output: data/analytics/commercial_kpis.json
"""

import os
import json
import duckdb
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


def query_to_dict(con, sql, key_col=None):
    """Run SQL and return result as list of dicts."""
    df = con.execute(sql).fetchdf()
    return df.to_dict(orient="records")


# ══════════════════════════════════════════════════════════════════════
# KPI 1: REVENUE AGGREGATIONS
# ══════════════════════════════════════════════════════════════════════

def kpi_revenue_summary(con):
    """Total, daily average, and monthly revenue."""
    result = con.execute("""
        SELECT
            SUM(total_amount)       AS total_revenue,
            AVG(total_amount)       AS avg_transaction_value,
            COUNT(*)                AS total_transactions,
            SUM(quantity)           AS total_units_sold,
            COUNT(DISTINCT transaction_id) AS unique_transactions
        FROM fact_sales
    """).fetchdf().to_dict(orient="records")[0]

    monthly = query_to_dict(con, """
        SELECT
            d.year_month,
            d.year,
            d.month,
            SUM(f.total_amount)    AS revenue,
            COUNT(*)               AS transactions,
            SUM(f.quantity)        AS units_sold
        FROM fact_sales f
        JOIN dim_date d ON f.date_key = d.date_key
        GROUP BY d.year_month, d.year, d.month
        ORDER BY d.year_month
    """)

    daily = query_to_dict(con, """
        SELECT
            d.full_date,
            d.day_name,
            d.is_weekend,
            SUM(f.total_amount)    AS revenue,
            COUNT(*)               AS transactions
        FROM fact_sales f
        JOIN dim_date d ON f.date_key = d.date_key
        GROUP BY d.full_date, d.day_name, d.is_weekend
        ORDER BY d.full_date
    """)

    return {
        "summary": result,
        "monthly_trend": monthly,
        "daily_trend": daily,
    }


# ══════════════════════════════════════════════════════════════════════
# KPI 2: CITY-WISE SALES
# ══════════════════════════════════════════════════════════════════════

def kpi_city_sales(con):
    """Revenue and units sold by city."""
    return query_to_dict(con, """
        SELECT
            s.city,
            s.state,
            s.region,
            SUM(f.total_amount)     AS revenue,
            SUM(f.quantity)         AS units_sold,
            COUNT(*)               AS transactions,
            COUNT(DISTINCT f.customer_sk) AS unique_customers
        FROM fact_sales f
        JOIN dim_store s ON f.store_sk = s.store_sk
        GROUP BY s.city, s.state, s.region
        ORDER BY revenue DESC
    """)


# ══════════════════════════════════════════════════════════════════════
# KPI 3: TOP PRODUCTS
# ══════════════════════════════════════════════════════════════════════

def kpi_top_products(con, top_n=10):
    """Top N products by revenue and quantity."""
    by_revenue = query_to_dict(con, f"""
        SELECT
            p.product_name,
            p.category,
            SUM(f.total_amount)  AS revenue,
            SUM(f.quantity)      AS quantity_sold,
            COUNT(*)             AS transactions
        FROM fact_sales f
        JOIN dim_product p ON f.product_sk = p.product_sk
        GROUP BY p.product_name, p.category
        ORDER BY revenue DESC
        LIMIT {top_n}
    """)

    by_quantity = query_to_dict(con, f"""
        SELECT
            p.product_name,
            p.category,
            SUM(f.quantity)      AS quantity_sold,
            SUM(f.total_amount)  AS revenue,
            COUNT(*)             AS transactions
        FROM fact_sales f
        JOIN dim_product p ON f.product_sk = p.product_sk
        GROUP BY p.product_name, p.category
        ORDER BY quantity_sold DESC
        LIMIT {top_n}
    """)

    return {
        "top_by_revenue": by_revenue,
        "top_by_quantity": by_quantity,
    }


# ══════════════════════════════════════════════════════════════════════
# KPI 4: CHANNEL MIX
# ══════════════════════════════════════════════════════════════════════

def kpi_channel_mix(con):
    """POS vs Web revenue, transactions, and units."""
    return query_to_dict(con, """
        SELECT
            f.channel,
            SUM(f.total_amount)     AS revenue,
            COUNT(*)               AS transactions,
            SUM(f.quantity)        AS units_sold,
            ROUND(SUM(f.total_amount) * 100.0 /
                  (SELECT SUM(total_amount) FROM fact_sales), 1) AS revenue_pct
        FROM fact_sales f
        GROUP BY f.channel
        ORDER BY revenue DESC
    """)


# ══════════════════════════════════════════════════════════════════════
# KPI 5: CATEGORY-WISE REVENUE
# ══════════════════════════════════════════════════════════════════════

def kpi_category_revenue(con):
    """Revenue breakdown by product category."""
    return query_to_dict(con, """
        SELECT
            p.category,
            SUM(f.total_amount)     AS revenue,
            SUM(f.quantity)         AS units_sold,
            COUNT(*)               AS transactions,
            COUNT(DISTINCT f.customer_sk) AS unique_customers,
            ROUND(AVG(f.unit_price), 2) AS avg_price
        FROM fact_sales f
        JOIN dim_product p ON f.product_sk = p.product_sk
        GROUP BY p.category
        ORDER BY revenue DESC
    """)


# ══════════════════════════════════════════════════════════════════════
# KPI 6: FESTIVE VS NON-FESTIVE
# ══════════════════════════════════════════════════════════════════════

def kpi_festive_analysis(con):
    """Compare festive season (Oct-Jan) vs normal period performance based on daily averages."""
    return query_to_dict(con, """
        SELECT
            CASE WHEN d.is_festive_season THEN 'Festive (Oct-Jan)' ELSE 'Normal' END AS period,
            SUM(f.total_amount)     AS total_revenue,
            COUNT(*)               AS transactions,
            SUM(f.quantity)        AS units_sold,
            COUNT(DISTINCT d.date_key) AS total_days,
            ROUND(SUM(f.total_amount) / COUNT(DISTINCT d.date_key), 2) AS avg_daily_revenue,
            ROUND(AVG(f.total_amount), 2) AS avg_transaction_value
        FROM fact_sales f
        JOIN dim_date d ON f.date_key = d.date_key
        GROUP BY d.is_festive_season
        ORDER BY total_revenue DESC
    """)


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def run_commercial_kpis():
    print("=" * 60)
    print("📈 COMMERCIAL KPIs — Revenue, Sales, Products")
    print("=" * 60)

    print("\n📂 Loading Gold layer …")
    con = load_star_schema()

    print("\n🔢 Computing KPIs …")

    kpis = {
        "computed_at": datetime.now().isoformat(),
        "revenue": kpi_revenue_summary(con),
        "city_sales": kpi_city_sales(con),
        "top_products": kpi_top_products(con),
        "channel_mix": kpi_channel_mix(con),
        "category_revenue": kpi_category_revenue(con),
        "festive_analysis": kpi_festive_analysis(con),
    }

    # Print summary
    rev = kpis["revenue"]["summary"]
    print(f"\n  💰 Total Revenue    : ₹{rev['total_revenue']:,.0f}")
    print(f"  🧾 Total Transactions: {rev['total_transactions']:,}")
    print(f"  📦 Total Units Sold  : {rev['total_units_sold']:,}")
    print(f"  💳 Avg Transaction   : ₹{rev['avg_transaction_value']:,.0f}")

    print(f"\n  📊 Channel Mix:")
    for ch in kpis["channel_mix"]:
        print(f"     {ch['channel']:5s} → ₹{ch['revenue']:>14,.0f} ({ch['revenue_pct']}%)")

    print(f"\n  🏙️  Top 3 Cities by Revenue:")
    for city in kpis["city_sales"][:3]:
        print(f"     {city['city']:12s} → ₹{city['revenue']:>14,.0f}")

    print(f"\n  🏆 Top 3 Products by Revenue:")
    for prod in kpis["top_products"]["top_by_revenue"][:3]:
        print(f"     {prod['product_name']:30s} → ₹{prod['revenue']:>12,.0f}")

    # Save
    output_path = os.path.join(ANALYTICS_DIR, "commercial_kpis.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(kpis, f, indent=2, default=str)

    print(f"\n💾 Saved → {output_path}")
    print("=" * 60)

    con.close()
    return kpis


if __name__ == "__main__":
    run_commercial_kpis()
