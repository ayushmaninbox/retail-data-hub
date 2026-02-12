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
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── paths ───────────────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ANALYTICS_DIR = os.path.join(ROOT_DIR, "data", "analytics")
QUALITY_REPORT = os.path.join(ROOT_DIR, "data_quality_report.json")

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
# RUN
# ══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Retail Data Hub API on http://localhost:8000")
    print("📚 API docs → http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
