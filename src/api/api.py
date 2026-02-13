"""
api.py
======
FastAPI backend that serves Gold layer KPI data to the Next.js dashboard.

Endpoints:
  GET /api/commercial     → Commercial KPIs (revenue, city, products, channels)
  GET /api/operations     → Operations KPIs (inventory, delivery, stockouts)
  GET /api/customers      → Customer KPIs (CLV, RFM, new vs returning)
  GET /api/market-basket  → Market Basket Analysis results
  GET /api/data-quality   → Data Quality report
  GET /api/overview       → Combined summary for the Overview page
  GET /api/health         → Health check

Run:
  python3 src/api/api.py
  # or: uvicorn src.api.api:app --reload --port 8000
"""

import os
import io
import json
import math
from typing import Optional
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# ── paths ───────────────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ANALYTICS_DIR = os.path.join(ROOT_DIR, "data", "analytics")
DATA_DIR = os.path.join(ROOT_DIR, "data")
QUALITY_REPORT = os.path.join(ROOT_DIR, "data", "data_quality_report.json")

app = FastAPI(
    title="Retail Data Hub API",
    description="Serves KPI analytics from the Gold layer to the Next.js dashboard",
    version="1.0.0",
)

# Allow Next.js dev server (localhost:3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════

def load_json(filename: str) -> dict:
    """Load a JSON file from the analytics directory."""
    path = os.path.join(ANALYTICS_DIR, filename)
    if not os.path.exists(path):
        return {"error": f"{filename} not found. Run the corresponding KPI script first."}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ══════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    """Health check."""
    files = ["commercial_kpis.json", "operations_kpis.json", "customer_kpis.json", "market_basket.json"]
    status = {}
    for f in files:
        path = os.path.join(ANALYTICS_DIR, f)
        status[f] = os.path.exists(path)
    return {"status": "ok", "data_files": status}


@app.get("/api/commercial")
def commercial_kpis():
    """Revenue, city sales, top products, channel mix, festive analysis."""
    return load_json("commercial_kpis.json")


@app.get("/api/operations")
def operations_kpis():
    """Inventory turnover, stockout rate, delivery times, reorder alerts."""
    return load_json("operations_kpis.json")


@app.get("/api/customers")
def customer_kpis():
    """CLV, RFM segmentation, new vs returning customers."""
    return load_json("customer_kpis.json")


@app.get("/api/market-basket")
def market_basket():
    """Market Basket Analysis — standard, cross-channel, and category."""
    return load_json("market_basket.json")


@app.get("/api/data-quality")
def data_quality():
    """Data quality report from the last quality checks run."""
    if os.path.exists(QUALITY_REPORT):
        with open(QUALITY_REPORT, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "data_quality_report.json not found. Run quality_checks.py first."}


@app.get("/api/forecast")
def demand_forecast():
    """LSTM demand forecast — 30-day revenue predictions by category."""
    return load_json("demand_forecast.json")


@app.get("/api/sales")
def sales_analytics():
    """Sales-specific data for the Sales Analytics dashboard page."""
    data = load_json("commercial_kpis.json")
    if "error" in data:
        return data
    return {
        "monthly_trend": data.get("revenue", {}).get("monthly_trend", []),
        "city_sales": data.get("city_sales", []),
        "top_products": data.get("top_products", {}),
        "channel_mix": data.get("channel_mix", []),
        "category_revenue": data.get("category_revenue", []),
    }


@app.get("/api/inventory")
def inventory():
    """Inventory-specific data for the Inventory Health page."""
    data = load_json("operations_kpis.json")
    if "error" in data:
        return data
    return {
        "turnover": data.get("inventory_turnover", {}),
        "stockout_rate": data.get("stockout_rate", {}),
        "reorder_alerts": data.get("reorder_alerts", []),
    }


@app.get("/api/logistics")
def logistics():
    """Logistics-specific data for the Logistics page."""
    data = load_json("operations_kpis.json")
    if "error" in data:
        return data
    return {
        "delivery_times": data.get("delivery_times", {}),
        "seasonal_demand": data.get("seasonal_demand", []),
    }


@app.get("/api/overview")
def overview():
    """Combined summary data for the Overview dashboard page."""
    commercial = load_json("commercial_kpis.json")
    operations = load_json("operations_kpis.json")
    customers = load_json("customer_kpis.json")

    overview_data = {}

    # Revenue summary
    if "error" not in commercial:
        rev = commercial.get("revenue", {}).get("summary", {})
        overview_data["revenue"] = {
            "total_revenue": rev.get("total_revenue", 0),
            "total_transactions": rev.get("total_transactions", 0),
            "total_units_sold": rev.get("total_units_sold", 0),
            "avg_transaction_value": rev.get("avg_transaction_value", 0),
        }
        overview_data["channel_mix"] = commercial.get("channel_mix", [])
        overview_data["monthly_trend"] = commercial.get("revenue", {}).get("monthly_trend", [])

    # Operations summary
    if "error" not in operations:
        overview_data["stockout_rate"] = operations.get("stockout_rate", {}).get("overall", {})
        delivery = operations.get("delivery_times", {}).get("overall", {})
        overview_data["delivery"] = {
            "avg_days": delivery.get("avg_delivery_days", 0),
            "total_shipments": delivery.get("total_shipments", 0),
            "delayed": delivery.get("delayed", 0),
        }

    # Customer summary
    if "error" not in customers:
        overview_data["customers"] = customers.get("new_vs_returning", {}).get("summary", {})
        overview_data["clv_stats"] = customers.get("clv", {}).get("stats", {})

    return overview_data


# ══════════════════════════════════════════════════════════════════════
# DATA TABLES EXPLORER
# ══════════════════════════════════════════════════════════════════════

# Map of all tables across Bronze, Silver, Gold layers
TABLE_REGISTRY = {
    "bronze": [
        {"name": "pos_sales", "path": "bronze/pos_sales/pos_sales.parquet", "format": "parquet",
         "description": "Raw POS (in-store) sales transactions"},
        {"name": "web_orders", "path": "bronze/web_orders/web_orders.parquet", "format": "parquet",
         "description": "Raw web/online order transactions"},
        {"name": "warehouse_inventory", "path": "bronze/warehouse/warehouse_inventory.parquet", "format": "parquet",
         "description": "Raw warehouse inventory snapshot"},
        {"name": "shipments", "path": "bronze/warehouse/shipments.parquet", "format": "parquet",
         "description": "Raw shipment/delivery records"},
        {"name": "batch_ingestion_log", "path": "bronze/batch_ingestion_log.json", "format": "json",
         "description": "Batch ingestion pipeline log"},
        {"name": "realtime_ingestion_log", "path": "bronze/realtime_ingestion_log.json", "format": "json",
         "description": "Realtime ingestion pipeline log"},
    ],
    "silver": [
        {"name": "unified_sales", "path": "silver/unified_sales.parquet", "format": "parquet",
         "description": "Cleaned & merged POS + Web sales"},
        {"name": "warehouse_inventory", "path": "silver/warehouse_inventory.parquet", "format": "parquet",
         "description": "Cleaned inventory with quality flags"},
        {"name": "shipments", "path": "silver/shipments.parquet", "format": "parquet",
         "description": "Cleaned shipment records with delivery metrics"},
        {"name": "rejected_rows", "path": "silver/rejected_rows.parquet", "format": "parquet",
         "description": "Rows rejected during data quality checks"},
    ],
    "gold": [
        {"name": "fact_sales", "path": "gold/fact_sales.parquet", "format": "parquet",
         "description": "Star-schema fact table — every sale line item",
         "table_type": "fact",
         "fk_links": {
             "date_key": "dim_date",
             "product_sk": "dim_product",
             "store_sk": "dim_store",
             "customer_sk": "dim_customer",
         }},
        {"name": "dim_date", "path": "gold/dim_date.parquet", "format": "parquet",
         "description": "Date dimension — calendar, weekday, festive flags",
         "table_type": "dimension", "pk": "date_key"},
        {"name": "dim_product", "path": "gold/dim_product.parquet", "format": "parquet",
         "description": "Product dimension — name, category",
         "table_type": "dimension", "pk": "product_sk"},
        {"name": "dim_store", "path": "gold/dim_store.parquet", "format": "parquet",
         "description": "Store dimension — city, state, region",
         "table_type": "dimension", "pk": "store_sk"},
        {"name": "dim_customer", "path": "gold/dim_customer.parquet", "format": "parquet",
         "description": "Customer dimension — SCD Type 2 with versioning",
         "table_type": "dimension", "pk": "customer_sk"},
    ],
}


def _safe_val(v):
    """Make a value JSON-serializable."""
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    if isinstance(v, (pd.Timestamp,)):
        return v.isoformat()
    if hasattr(v, 'item'):  # numpy scalar
        return v.item()
    return v


def _load_table_df(rel_path: str, fmt: str) -> Optional[pd.DataFrame]:
    """Load a table file into a DataFrame."""
    full_path = os.path.join(DATA_DIR, rel_path)
    if not os.path.exists(full_path):
        return None
    if fmt == "parquet":
        return pd.read_parquet(full_path)
    elif fmt == "json":
        with open(full_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, list):
            return pd.DataFrame(raw)
        elif isinstance(raw, dict):
            return pd.DataFrame([raw])
        return None
    return None


@app.get("/api/tables")
def list_tables():
    """Return metadata for all tables across Bronze, Silver, Gold layers."""
    result = {}
    for layer, tables in TABLE_REGISTRY.items():
        layer_tables = []
        for tbl in tables:
            df = _load_table_df(tbl["path"], tbl["format"])
            if df is None:
                continue

            # Column info
            col_info = []
            fk_links = tbl.get("fk_links", {})
            pk = tbl.get("pk")
            for col in df.columns:
                info = {
                    "name": col,
                    "dtype": str(df[col].dtype),
                    "non_null": int(df[col].notna().sum()),
                    "null_count": int(df[col].isna().sum()),
                    "unique": int(df[col].nunique()),
                }
                if col == pk:
                    info["is_pk"] = True
                if col in fk_links:
                    info["fk_to"] = fk_links[col]
                # Numeric stats
                if pd.api.types.is_numeric_dtype(df[col]):
                    info["min"] = _safe_val(df[col].min())
                    info["max"] = _safe_val(df[col].max())
                    info["mean"] = _safe_val(round(df[col].mean(), 2))
                col_info.append(info)

            layer_tables.append({
                "name": tbl["name"],
                "description": tbl.get("description", ""),
                "format": tbl["format"],
                "table_type": tbl.get("table_type", "raw"),
                "rows": len(df),
                "columns": len(df.columns),
                "column_info": col_info,
                "fk_links": tbl.get("fk_links"),
                "pk": tbl.get("pk"),
            })
        result[layer] = layer_tables
    return result


@app.get("/api/tables/rows/{layer}/{table_name}")
def table_rows(
    layer: str,
    table_name: str,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Rows per page"),
):
    """Return paginated rows for a specific table."""
    tables = TABLE_REGISTRY.get(layer, [])
    tbl = next((t for t in tables if t["name"] == table_name), None)
    if not tbl:
        return {"error": f"Table {layer}/{table_name} not found"}

    df = _load_table_df(tbl["path"], tbl["format"])
    if df is None:
        return {"error": f"Could not load {tbl['path']}"}

    total_rows = len(df)
    total_pages = max(1, math.ceil(total_rows / page_size))
    start = (page - 1) * page_size
    end = min(start + page_size, total_rows)

    page_df = df.iloc[start:end]
    rows = []
    for _, row in page_df.iterrows():
        rows.append({col: _safe_val(row[col]) for col in df.columns})

    return {
        "rows": rows,
        "page": page,
        "page_size": page_size,
        "total_rows": total_rows,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


@app.get("/api/tables/download/{layer}/{table_name}")
def download_table(
    layer: str,
    table_name: str,
    format: str = Query("csv", description="Download format: csv or json"),
):
    """Download a table as CSV or JSON."""
    tables = TABLE_REGISTRY.get(layer, [])
    tbl = next((t for t in tables if t["name"] == table_name), None)
    if not tbl:
        return {"error": f"Table {layer}/{table_name} not found"}

    df = _load_table_df(tbl["path"], tbl["format"])
    if df is None:
        return {"error": f"Could not load {tbl['path']}"}

    if format == "json":
        # Convert to JSON
        records = []
        for _, row in df.iterrows():
            records.append({col: _safe_val(row[col]) for col in df.columns})
        content = json.dumps(records, indent=2, default=str)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={table_name}.json"},
        )
    else:
        # Default: CSV
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(
            io.BytesIO(buf.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={table_name}.csv"},
        )


# ══════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Retail Data Hub API on http://localhost:8000")
    print("📚 API docs → http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
