"""
chat_engine.py
==============
Manages the conversation logic for the AI Retail Assistant.
Uses Gemini 2.5 to interpret retail data and return structured responses
(Text, Tables, or Charts).
"""

import os
import json
import google.generativeai as genai
from datetime import datetime
from dotenv import load_dotenv

# ── configuration ───────────────────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(ROOT, ".env"))

ANALYTICS_DIR = os.path.join(ROOT, "data", "analytics")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ── platform meta-context ──────────────────────────────────────────
PLATFORM_KNOWLEDGE = {
    "project_name": "Retail Data Hub",
    "architecture": "Medallion Architecture (Raw → Bronze → Silver → Gold)",
    "data_pipeline": "DuckDB-powered ELT using Apache Parquet for speed. Data moves from CSV (Bronze) to Cleaned Parquet (Silver) to Analytics-ready Star Schema (Gold).",
    "tech_stack": {
        "language": "Python 3.9+, TypeScript",
        "storage": "Apache Parquet",
        "query_engine": "DuckDB (In-process OLAP)",
        "api": "FastAPI + Uvicorn",
        "ml": "PyTorch (LSTM for Forecasting), mlxtend (Apriori for Market Basket)",
        "frontend": "Next.js 14, Tailwind CSS, Recharts"
    },
    "dashboard_pages": {
        "Overview": "Executive summary with top KPIs and revenue trends.",
        "Sales": "Detailed revenue analysis by city, category, and month.",
        "Logistics": "Delivery performance and carrier efficiency metrics.",
        "Customers": "Deep dive into RFM segments, retention, and CLV.",
        "Inventory": "Stock levels, turnover ratios, and stockout alerts.",
        "Forecast": "AI-powered 30-day revenue prediction using LSTM.",
        "Market Basket": "Association rule mining to find products bought together.",
        "Data Quality": "Automated checks for nulls, duplicates, and negative values."
    },
    "presentation_rules": [
        "Use 'table' for lists, top identifiers, or high-density granular data.",
        "Use 'chart' for temporal trends, category comparisons, or forecast vs actuals.",
        "ACT as a Consultative Lead: Don't just show data, interpret it. If stock is low and sales are high, warn the user."
    ]
}

class ChatEngine:
    def __init__(self):
        # We will initialize models on demand in the ask() method
        self.data_snapshot = self._load_data_snapshot()
        self.data_context = json.dumps({
            "platform_info": PLATFORM_KNOWLEDGE,
            "data_summary": self.data_snapshot
        }, indent=1)

    def _load_data_snapshot(self):
        """Loads a comprehensive snapshot from all analytics layers."""
        snapshot = {}
        files = {
            "commercial": "commercial_kpis.json",
            "operations": "operations_kpis.json",
            "customer": "customer_kpis.json",
            "forecast": "demand_forecast.json",
            "market_basket": "market_basket.json",
            "summary": "executive_summary.json"
        }
        
        for key, filename in files.items():
            path = os.path.join(ANALYTICS_DIR, filename)
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if key == "commercial":
                            snapshot["revenue"] = data.get("revenue", {}).get("summary", {})
                            snapshot["monthly_revenue_trend"] = data.get("revenue", {}).get("monthly_trend", [])[-12:]
                            snapshot["top_cities"] = data.get("city_sales", [])[:10]
                            snapshot["category_performance"] = data.get("category_sales", [])
                        elif key == "operations":
                            snapshot["operations_summary"] = {
                                "stockout_rate": data.get("stockout_rate", {}).get("overall", {}).get("stockout_pct"),
                                "avg_delivery": data.get("delivery_times", {}).get("overall", {}).get("avg_delivery_days")
                            }
                            snapshot["inventory_turnover"] = data.get("inventory_turnover", {}).get("by_category", [])
                            snapshot["frequently_stocked_out"] = data.get("stockout_rate", {}).get("frequently_stocked_out", [])[:5]
                        elif key == "customer":
                            snapshot["customer_health"] = {
                                "total_unique": data.get("new_vs_returning", {}).get("summary", {}).get("total_unique_customers"),
                                "monthly_mix": data.get("new_vs_returning", {}).get("monthly_trend", [])[-6:]
                            }
                            snapshot["clv_segments"] = data.get("clv", {}).get("segments", {})
                        elif key == "forecast":
                            snapshot["forecast_total_30d"] = data.get("summary", {}).get("total_30d_predicted_revenue")
                            snapshot["forecast_by_category"] = data.get("category_summary", [])
                        elif key == "market_basket":
                            snapshot["basket_rules"] = data.get("category_basket", {}).get("rules", [])[:10]
                            snapshot["top_frequent_items"] = data.get("standard_basket", {}).get("itemsets", [])[:5]
                        elif key == "summary":
                            snapshot["executive_kpis"] = data.get("kpis", {})
                except Exception as e:
                    print(f"❌ Error loading {filename}: {e}")
        
        return snapshot

    def ask(self, user_query: str, history: list = None):
        """AI-first query handler with Universal USP Platform Knowledge."""
        prompt = f"""
        Act as the 'Retail Hub Lead Consultant'. You are the USP (Unique Selling Point) of this platform.
        You have absolute awareness of the Technical Pipeline (Medallion/DuckDB), Operational Efficiency, and Commercial Health.

        PLATFORM BRAIN (CONTEXT):
        {self.data_context}

        YOUR MISSION:
        1. Be Powerful & Direct: Answer questions with deep data precision.
        2. Be Crazy Proactive: If you see a trend or a risk (e.g., high turnover but low stock), mention it!
        3. Be technical: Mention 'Parquet storage' or 'DuckDB engine' or 'LSTM models' to explain the platform's speed.
        
        PRESENTATION RULES:
        - Return 'table' for granular comparisons or lists.
        - Return 'chart' for trends (revenue over time, category split, forecasts).
        - Return 'text' for system/architecture info or general advice.
        
        STRICT JSON FORMAT:
        {{
            "text": "Your consultative response (Markdown). Interpret the data, don't just state it.",
            "data_type": "text" | "table" | "chart",
            "data": null | table_object | chart_object
        }}

        Table Object: {{ "headers": ["..."], "rows": [["..."]] }}
        Chart Object: {{ "type": "bar" | "area" | "pie", "data": [{{ "name": "...", "value": 0 }}] }}

        USER QUERY: {user_query}
        """

        models = [
            'gemini-2.0-flash-exp',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash', 
            'gemini-flash-latest'
        ]
        
        for model_name in models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(response_mime_type="application/json")
                )
                print(f"✅ AI Success: Using {model_name}")
                return json.loads(response.text)
            except Exception as e:
                print(f"⚠️ {model_name} Fail: {e}")
                continue

        return self._dynamic_query_engine(user_query)

    def _dynamic_query_engine(self, query: str):
        """Ultra-Fallback engine if AI models fail."""
        q = query.lower()
        s = self.data_snapshot
        
        resp = {
            "text": "I'm accessing the Retail Hub's deep data layers to answer: ",
            "data_type": "text",
            "data": None
        }

        if any(w in q for w in ["revenue", "sales", "money"]):
            rev = s.get("revenue", {}).get("total_revenue", 0)
            resp["text"] += f"Total revenue is ₹{rev:,.2f}. The DuckDB analytics engine is showing a steady monthly trend."
            resp["data_type"] = "chart"
            resp["data"] = {"type": "area", "data": [{"name": i.get("year_month"), "value": i.get("revenue")} for i in s.get("monthly_revenue_trend", [])]}

        elif any(w in q for w in ["tech", "arch", "duckdb", "how"]):
            p = PLATFORM_KNOWLEDGE
            resp["text"] = f"The **{p['project_name']}** runs on a highly-optimized **{p['architecture']}**. " \
                           f"We use **DuckDB** for zero-latency OLAP queries and **Parquet** for storage efficiency. " \
                           f"Predictions are powered by **PyTorch LSTM** models."

        elif any(w in q for w in ["inventory", "stock", "turnover"]):
            turnover = s.get("inventory_turnover", [])[:5]
            resp["text"] += "Inventory turnover analysis (Gold Layer):"
            resp["data_type"] = "table"
            resp["data"] = {
                "headers": ["Category", "Turnover Ratio"],
                "rows": [[i.get("category"), f"{i.get('turnover_ratio')}x"] for i in turnover]
            }

        else:
            resp["text"] = "I can analyze Sales, Logistics, Customers, AI Forecasts, and Medallion Architecture. How shall we proceed?"

        return resp

# Singleton instance
engine = ChatEngine()
