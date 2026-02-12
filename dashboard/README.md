# 📁 dashboard/

## Purpose
Interactive **Streamlit** dashboard that visualizes all KPIs and data quality metrics. This is the primary demo artifact for the hackathon — what judges will see.

## Files That Will Go Here

| File | What It Does |
|---|---|
| `app.py` | Main Streamlit application with 7 tabs |

## Dashboard Tabs

| # | Tab | Contents | Chart Types |
|---|---|---|---|
| 1 | 🏠 **Overview** | Total revenue, orders, customers (KPI cards) + revenue trend | KPI cards, line chart |
| 2 | 📊 **Sales Analytics** | City-wise sales, top products, channel mix, daily trends | Bar, pie/donut, line |
| 3 | 📦 **Inventory Health** | Stockout alerts, turnover ratio, reorder recommendations | Gauge, alert cards, table |
| 4 | 🚚 **Logistics** | Avg delivery time, delay distribution, bottleneck routes | KPI card, histogram, bar |
| 5 | 👥 **Customers** | New vs returning, CLV distribution, RFM segments | Stacked bar, histogram, scatter |
| 6 | 🛒 **Market Basket** | Item associations, confidence scores, recommendation pairs | Table, network graph |
| 7 | ✅ **Data Quality** | Pipeline health, row counts, quality check pass/fail | Status cards, bar chart |

## Tech
- **Streamlit** for the app framework
- **Plotly** for interactive charts
- **DuckDB** for querying gold Parquet files
- Deployable for free on **Streamlit Community Cloud**

## How to Run
```bash
cd retail-data-hub
streamlit run dashboard/app.py
```
