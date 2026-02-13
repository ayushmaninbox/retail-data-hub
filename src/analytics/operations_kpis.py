"""
operations_kpis.py
==================
Operations KPIs computed on Gold + Silver layer data using DuckDB.

KPIs:
  1. Inventory Turnover Ratio (per product, per store)
  2. Stockout Rate (% of products with zero stock)
  3. Average Delivery Time (per carrier, per route)
  4. Delivery Bottlenecks (routes with avg delivery > 7 days)
  5. Seasonal Demand Trends (monthly quantity by category)
  6. Carrier Performance Ranking

Output: data/analytics/operations_kpis.json
"""

import os
import json
import duckdb
import pandas as pd
from datetime import datetime

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GOLD_DIR = os.path.join(ROOT_DIR, "data", "gold")
SILVER_DIR = os.path.join(ROOT_DIR, "data", "silver")
ANALYTICS_DIR = os.path.join(ROOT_DIR, "data", "analytics")
os.makedirs(ANALYTICS_DIR, exist_ok=True)


def load_data():
    """Load Gold + Silver tables into DuckDB."""
    con = duckdb.connect()

    # Gold tables
    for table in ["fact_sales", "dim_date", "dim_product", "dim_store"]:
        path = os.path.join(GOLD_DIR, f"{table}.parquet")
        con.execute(f"CREATE TABLE {table} AS SELECT * FROM read_parquet('{path}')")

    # Silver tables (inventory + shipments aren't in Gold)
    for name, filename in [("inventory", "warehouse_inventory.parquet"), ("shipments", "shipments.parquet")]:
        path = os.path.join(SILVER_DIR, filename)
        con.execute(f"CREATE TABLE {name} AS SELECT * FROM read_parquet('{path}')")

    print("  ✓ All tables loaded into DuckDB")
    return con


def query_to_dict(con, sql):
    return con.execute(sql).fetchdf().to_dict(orient="records")


# ══════════════════════════════════════════════════════════════════════
# KPI 1: INVENTORY TURNOVER RATIO
# ══════════════════════════════════════════════════════════════════════

def kpi_inventory_turnover(con):
    """
    Inventory Turnover = Total Quantity Sold / Average Inventory on Hand
    Higher ratio = product sells faster = healthier.
    """
    # Per category
    by_category = query_to_dict(con, """
        WITH sold AS (
            SELECT p.category, SUM(f.quantity) AS total_sold
            FROM fact_sales f
            JOIN dim_product p ON f.product_sk = p.product_sk
            GROUP BY p.category
        ),
        stock AS (
            SELECT category, AVG(quantity_on_hand) AS avg_stock
            FROM inventory
            GROUP BY category
        )
        SELECT
            s.category,
            s.total_sold,
            ROUND(st.avg_stock, 0) AS avg_inventory,
            ROUND(s.total_sold * 1.0 / NULLIF(st.avg_stock, 0), 2) AS turnover_ratio
        FROM sold s
        JOIN stock st ON s.category = st.category
        ORDER BY turnover_ratio DESC
    """)

    # Per store
    by_store = query_to_dict(con, """
        WITH sold AS (
            SELECT ds.city, SUM(f.quantity) AS total_sold
            FROM fact_sales f
            JOIN dim_store ds ON f.store_sk = ds.store_sk
            GROUP BY ds.city
        ),
        stock AS (
            SELECT store_city AS city, AVG(quantity_on_hand) AS avg_stock
            FROM inventory
            GROUP BY store_city
        )
        SELECT
            s.city,
            s.total_sold,
            ROUND(st.avg_stock, 0) AS avg_inventory,
            ROUND(s.total_sold * 1.0 / NULLIF(st.avg_stock, 0), 2) AS turnover_ratio
        FROM sold s
        JOIN stock st ON s.city = st.city
        ORDER BY turnover_ratio DESC
    """)

    return {"by_category": by_category, "by_store": by_store}


# ══════════════════════════════════════════════════════════════════════
# KPI 2: STOCKOUT RATE
# ══════════════════════════════════════════════════════════════════════

def kpi_stockout_rate(con):
    """Percentage of product-store combos with zero stock."""
    overall = query_to_dict(con, """
        SELECT
            COUNT(*) AS total_records,
            SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) AS stockout_records,
            ROUND(SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS stockout_pct
        FROM inventory
    """)

    by_category = query_to_dict(con, """
        SELECT
            category,
            COUNT(*) AS total_records,
            SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) AS stockout_records,
            ROUND(SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS stockout_pct
        FROM inventory
        GROUP BY category
        ORDER BY stockout_pct DESC
    """)

    by_city = query_to_dict(con, """
        SELECT
            store_city AS city,
            COUNT(*) AS total_records,
            SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) AS stockout_records,
            ROUND(SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS stockout_pct
        FROM inventory
        GROUP BY store_city
        ORDER BY stockout_pct DESC
    """)

    # Products frequently stocked out (most snapshots at zero)
    frequently_stocked_out = query_to_dict(con, """
        SELECT
            product_name,
            category,
            COUNT(*) AS total_snapshots,
            SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) AS zero_stock_snapshots,
            ROUND(SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS stockout_pct
        FROM inventory
        GROUP BY product_name, category
        HAVING zero_stock_snapshots > 0
        ORDER BY stockout_pct DESC
        LIMIT 15
    """)

    return {
        "overall": overall[0] if overall else {},
        "by_category": by_category,
        "by_city": by_city,
        "frequently_stocked_out": frequently_stocked_out,
    }


# ══════════════════════════════════════════════════════════════════════
# KPI 3: DELIVERY TIMES
# ══════════════════════════════════════════════════════════════════════

def kpi_delivery_times(con):
    """Average delivery time analysis."""
    overall = query_to_dict(con, """
        SELECT
            COUNT(*) AS total_shipments,
            SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) AS delayed,
            SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END) AS in_transit,
            SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) AS returned,
            ROUND(AVG(CASE WHEN delivery_days IS NOT NULL THEN delivery_days END), 1) AS avg_delivery_days,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY delivery_days), 1) AS median_delivery_days
        FROM shipments
    """)

    by_carrier = query_to_dict(con, """
        SELECT
            carrier,
            COUNT(*) AS shipments,
            ROUND(AVG(CASE WHEN delivery_days IS NOT NULL THEN delivery_days END), 1) AS avg_days,
            SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) AS delayed,
            SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END) AS in_transit,
            SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) AS returned,
            ROUND(SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS delay_pct
        FROM shipments
        GROUP BY carrier
        ORDER BY avg_days ASC
    """)

    by_route = query_to_dict(con, """
        SELECT
            destination_city,
            COUNT(*) AS shipments,
            ROUND(AVG(CASE WHEN delivery_days IS NOT NULL THEN delivery_days END), 1) AS avg_days,
            SUM(CASE WHEN delivery_days >= 7 THEN 1 ELSE 0 END) AS bottleneck_shipments,
            ROUND(SUM(CASE WHEN delivery_days >= 7 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS bottleneck_pct
        FROM shipments
        GROUP BY destination_city
        ORDER BY avg_days DESC
    """)

    # Delivery time distribution
    distribution = query_to_dict(con, """
        SELECT
            delivery_days AS days,
            COUNT(*) AS shipments
        FROM shipments
        WHERE delivery_days IS NOT NULL
        GROUP BY delivery_days
        ORDER BY delivery_days
    """)

    return {
        "overall": overall[0] if overall else {},
        "by_carrier": by_carrier,
        "by_destination": by_route,
        "distribution": distribution,
    }


# ══════════════════════════════════════════════════════════════════════
# KPI 4: SEASONAL DEMAND TRENDS
# ══════════════════════════════════════════════════════════════════════

def kpi_seasonal_demand(con):
    """Monthly quantity sold by category — reveals seasonal patterns."""
    return query_to_dict(con, """
        SELECT
            d.year_month,
            d.year,
            d.month,
            d.month_name,
            p.category,
            SUM(f.quantity) AS units_sold,
            SUM(f.total_amount) AS revenue
        FROM fact_sales f
        JOIN dim_date d ON f.date_key = d.date_key
        JOIN dim_product p ON f.product_sk = p.product_sk
        GROUP BY d.year_month, d.year, d.month, d.month_name, p.category
        ORDER BY d.year_month, p.category
    """)


# ══════════════════════════════════════════════════════════════════════
# KPI 5: REORDER RECOMMENDATIONS
# ══════════════════════════════════════════════════════════════════════

def kpi_reorder_alerts(con):
    """Products where current stock is below reorder level (latest snapshot)."""
    return query_to_dict(con, """
        WITH latest_snapshot AS (
            SELECT MAX(snapshot_date) AS max_date FROM inventory
        )
        SELECT
            i.store_city,
            i.store_id,
            i.product_name,
            i.category,
            i.quantity_on_hand,
            i.reorder_level,
            (i.reorder_level - i.quantity_on_hand) AS units_to_order,
            i.unit_cost,
            ROUND((i.reorder_level - i.quantity_on_hand) * i.unit_cost, 2) AS reorder_cost
        FROM inventory i, latest_snapshot ls
        WHERE i.snapshot_date = ls.max_date
          AND i.quantity_on_hand < i.reorder_level
        ORDER BY units_to_order DESC
        LIMIT 20
    """)


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def run_operations_kpis():
    print("=" * 60)
    print("📦 OPERATIONS KPIs — Inventory, Logistics, Supply Chain")
    print("=" * 60)

    print("\n📂 Loading data …")
    con = load_data()

    print("\n🔢 Computing KPIs …")
    kpis = {
        "computed_at": datetime.now().isoformat(),
        "inventory_turnover": kpi_inventory_turnover(con),
        "stockout_rate": kpi_stockout_rate(con),
        "delivery_times": kpi_delivery_times(con),
        "seasonal_demand": kpi_seasonal_demand(con),
        "reorder_alerts": kpi_reorder_alerts(con),
    }

    # Print summary
    stock = kpis["stockout_rate"]["overall"]
    delivery = kpis["delivery_times"]["overall"]
    print(f"\n  📦 Stockout Rate    : {stock.get('stockout_pct', 0)}%")
    print(f"  🚚 Avg Delivery    : {delivery.get('avg_delivery_days', 'N/A')} days")
    print(f"  📦 Total Shipments : {delivery.get('total_shipments', 0):,}")
    print(f"  ⚠️  Delayed         : {delivery.get('delayed', 0):,}")
    print(f"  🔁 Returned        : {delivery.get('returned', 0):,}")

    print(f"\n  📊 Turnover by Category (top 3):")
    for cat in kpis["inventory_turnover"]["by_category"][:3]:
        print(f"     {cat['category']:18s} → {cat['turnover_ratio']}x")

    print(f"\n  🚨 Reorder Alerts: {len(kpis['reorder_alerts'])} products below reorder level")

    # Save
    output_path = os.path.join(ANALYTICS_DIR, "operations_kpis.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(kpis, f, indent=2, default=str)

    print(f"\n💾 Saved → {output_path}")
    print("=" * 60)

    con.close()
    return kpis


if __name__ == "__main__":
    run_operations_kpis()
