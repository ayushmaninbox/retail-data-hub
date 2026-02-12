# 📁 dashboard/

## Purpose
Interactive **Next.js** web application that visualizes all KPIs and data quality metrics. This is the primary demo artifact for the hackathon — what judges will see.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (React) |
| Charts | Recharts / Chart.js / Plotly.js |
| Styling | Tailwind CSS |
| Data Source | FastAPI backend → DuckDB → Gold Parquet files |

## Dashboard Pages

| # | Page | Contents | Chart Types |
|---|---|---|---|
| 1 | 🏠 **Overview** | Total revenue, orders, customers (KPI cards) + revenue trend | KPI cards, line chart |
| 2 | 📊 **Sales Analytics** | City-wise sales, top products, channel mix, daily trends | Bar, pie/donut, line |
| 3 | 📦 **Inventory Health** | Stockout alerts, turnover ratio, reorder recommendations | Gauge, alert cards, table |
| 4 | 🚚 **Logistics** | Avg delivery time, delay distribution, bottleneck routes | KPI card, histogram, bar |
| 5 | 👥 **Customers** | New vs returning, CLV distribution, RFM segments | Stacked bar, histogram, scatter |
| 6 | 🛒 **Market Basket** | Item associations, confidence scores, recommendation pairs | Table, network graph |
| 7 | ✅ **Data Quality** | Pipeline health, row counts, quality check pass/fail | Status cards, bar chart |

## Data Flow

```
Gold Parquet files (data/gold/)
        │
        ▼
FastAPI backend (Python) ── DuckDB queries ── JSON responses
        │
        ▼
Next.js frontend (this folder) ── fetch() ── render charts
```

## How to Run

```bash
cd dashboard
npm install
npm run dev
```

The dashboard expects the FastAPI backend to be running at `http://localhost:8000`.
