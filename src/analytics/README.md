# 📁 src/analytics/

## Purpose
KPI computation scripts that query the **Gold Layer** using DuckDB to produce business insights. These power the Streamlit dashboard and serve as standalone deliverables.

## Scripts That Will Go Here

| Script | KPI Category | Metrics |
|---|---|---|
| `commercial_kpis.py` | 📈 Commercial | Daily/monthly revenue, city-wise sales, top 10 products, channel mix (POS vs Web) |
| `operations_kpis.py` | 📦 Operations | Inventory turnover ratio, avg delivery time, stockout rate, seasonal demand heatmap |
| `customer_kpis.py` | 👥 Customer | New vs returning shoppers, Customer Lifetime Value (CLV), RFM segmentation |
| `market_basket.py` | 🛒 AI/ML | Market basket analysis using Apriori algorithm — finds items frequently bought together |

## How They Work
- Each script reads gold Parquet files via **DuckDB** (in-process SQL engine)
- Returns pandas DataFrames that the dashboard consumes
- Can also be run standalone to print results to console

## Key Formulas
- **Inventory Turnover** = Cost of Goods Sold / Average Inventory
- **CLV** = Total revenue per customer over entire history
- **RFM** = Recency (days since last order) × Frequency (order count) × Monetary (total spend)
- **Market Basket** = Apriori algorithm with `min_support=0.02`, `min_confidence=0.5`

## Dependencies
- `duckdb`, `pandas`, `mlxtend` (for Apriori)
