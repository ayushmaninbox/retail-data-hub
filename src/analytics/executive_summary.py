"""
executive_summary.py
====================
Aggregates all KPI JSONs and uses Gemini AI to generate a high-level 
"Executive Summary" for the dashboard.

Logic:
1. Load commercial, operations, customer, and forecast KPIs.
2. Prepare a condensed "Business Snapshot" string.
3. Send to Gemini 1.5 Flash with a specific retail persona prompt.
4. Save the resulting insights to data/analytics/executive_summary.json.
"""

import os
import json
import traceback
from datetime import datetime
import google.generativeai as genai

# ── configuration ───────────────────────────────────────────────────
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ANALYTICS_DIR = os.path.join(ROOT, "data", "analytics")
OUT_FILE = os.path.join(ANALYTICS_DIR, "executive_summary.json")

# User provided API Key
GEMINI_API_KEY = "AIzaSyBtngwiNc7c7DwKQ9ZhnRq8oeJATQZgDt8"

def load_json(name):
    path = os.path.join(ANALYTICS_DIR, name)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_deterministic_fallback(data_summary):
    """Simple rule-based insights if AI fails."""
    insights = [
        "Business performance is being tracked across all channels.",
        "Revenue trends and inventory health are within monitoring range.",
        "Demand forecasting is active for the next 30 days."
    ]
    return {
        "source": "deterministic_fallback",
        "generated_at": datetime.now().isoformat(),
        "insights": insights
    }

def main():
    print("="*60)
    print("🧠 GENERATING EXECUTIVE SUMMARY (GEMINI AI)")
    print("="*60)

    # 1. Load Data
    commercial = load_json("commercial_kpis.json")
    operations = load_json("operations_kpis.json")
    customers = load_json("customer_kpis.json")
    forecast = load_json("demand_forecast.json")

    if not commercial:
        print("❌ Error: Missing commercial_kpis.json. Run kpi_analysis.sh first.")
        return

    # 2. Build Snapshot for AI
    # We condense the data so we stay within context/token limits and focus on "punchy" facts.
    rev_sum = commercial.get("revenue", {}).get("summary", {})
    top_city = commercial.get("city_sales", [{}])[0].get("city", "Unknown") if commercial.get("city_sales") else "N/A"
    stockout_rate = operations.get("stockout_rate", {}).get("overall", {}).get("stockout_pct", 0) if operations else 0
    repeat_rate = customers.get("new_vs_returning", {}).get("summary", {}).get("repeat_rate_pct", 0) if customers else 0
    
    top_growth_cat = "N/A"
    predicted_rev = 0
    if forecast:
        top_growth_cat = forecast.get("summary", {}).get("top_growth_category", "N/A")
        predicted_rev = forecast.get("summary", {}).get("total_30d_predicted_revenue", 0)

    snapshot = f"""
    BUSINESS SNAPSHOT:
    - Total Revenue: ₹{rev_sum.get('total_revenue', 0):,.0f}
    - Total Transactions: {rev_sum.get('total_transactions', 0):,}
    - Top Performing City: {top_city}
    - Stockout Rate (Inventory Risk): {stockout_rate}%
    - Customer Repeat Rate: {repeat_rate}%
    - 30-Day Predicted Revenue: ₹{predicted_rev:,.0f}
    - Top Growth Category Predicted: {top_growth_cat}
    """

    print("📊 Data Snapshot Prepared.")
    
    # 3. Call Gemini
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""
        You are a high-level Retail Strategy Consultant. Based on the following business metrics, 
        provide exactly 3-4 punchy, high-impact "Executive Insights" for a dashboard summary.
        
        Rules:
        - Keep each bullet point under 15 words.
        - Use a confident, professional, and data-driven tone.
        - Focus on the most interesting findings (e.g. city performance, inventory risks, or growth predictions).
        - Output ONLY the bullet points (no intro or outro).
        
        DATA:
        {snapshot}
        """
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean up bullet points (split by lines/dashes)
        insights = [line.strip().replace("- ", "").replace("* ", "") for line in text.split('\n') if line.strip()]
        
        # Limit to 4
        insights = insights[:4]
        
        result = {
            "source": "gemini_pro",
            "generated_at": datetime.now().isoformat(),
            "insights": insights
        }
        print("✅ Gemini AI generated insights successfully.")

    except Exception as e:
        print(f"⚠️ Gemini API Error: {e}")
        traceback.print_exc()
        result = generate_deterministic_fallback(snapshot)

    # 4. Save
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    
    print(f"📁 Summary saved to {OUT_FILE}")
    print("="*60)

if __name__ == "__main__":
    main()
