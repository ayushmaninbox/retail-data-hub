<p align="center">
  <h1 align="center">Retail Data Hub</h1>
  <p align="center">
    <strong>Smart Retail Supply Chain & Customer Intelligence Platform</strong>
  </p>
  <p align="center">
    A full-stack data engineering project demonstrating ETL pipelines, Medallion Architecture, star schema modeling, automated data quality, KPI analytics, and interactive dashboarding — all at zero infrastructure cost.
  </p>
</p>

---

## ✨ Highlights

| Capability | Implementation |
|---|---|
| **Architecture** | Medallion (Raw → Bronze → Silver → Gold) with Parquet storage |
| **Data Modeling** | Star schema with fact & dimension tables, SCD Type 2 |
| **Ingestion** | Batch (CSV) + near real-time (JSON) with schema validation & retry |
| **Data Quality** | 7 automated checks with JSON evidence reports |
| **Analytics** | Commercial, Operations, Customer KPIs + Market Basket (Apriori) |
| **Dashboard** | 7-tab interactive Streamlit app with Plotly charts |
| **Query Engine** | DuckDB — in-process SQL directly on Parquet files |
| **Cost** | $0 — Python + DuckDB + Streamlit Community Cloud |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│  POS Sales (CSV)  ·  Web Orders (JSON)  ·  Warehouse (CSV)     │
└──────────────┬──────────────┬──────────────┬────────────────────┘
               │              │              │
               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│  🥉 BRONZE — Raw Parquet (schema-validated, append-only)        │
└──────────────────────────────┬──────────────────────────────────┘
                               │  clean · deduplicate · merge
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  🥈 SILVER — Cleaned & unified sales data                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │  star schema · SCD2 · surrogate keys
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  🥇 GOLD — Star Schema (facts + dimensions, partitioned)        │
│  dim_date · dim_product · dim_store · dim_customer · fact_sales │
└──────────────────────────────┬──────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
         📊 Dashboard    📝 SQL Queries   📈 KPI Scripts
         (Streamlit)      (DuckDB)        (Python)
```

---

## 📂 Project Structure

```
retail-data-hub/
│
├── data/                          # All data layers (gitignored at scale)
│   ├── raw/                       # Source files (CSV, JSON)
│   ├── bronze/                    # Ingested Parquet (schema-validated)
│   ├── silver/                    # Cleaned & merged Parquet
│   └── gold/                      # Star schema Parquet (partitioned)
│
├── src/                           # All pipeline & analytics code
│   ├── data_generation/           # Synthetic data generators (Faker + UCI)
│   ├── ingestion/                 # Raw → Bronze (batch + streaming)
│   ├── transformation/            # Bronze → Silver → Gold (+ SCD2)
│   ├── quality/                   # Automated DQ checks & JSON reports
│   └── analytics/                 # KPI scripts (commercial, ops, customer, ML)
│
├── sql/                           # Standalone SQL queries for all KPIs
├── dashboard/                     # Streamlit app (7 interactive tabs)
├── docs/                          # Architecture, security & DQ documentation
└── README.md                      # ← You are here
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- pip

### 1. Clone & Install

```bash
git clone https://github.com/ayushmaninbox/retail-data-hub.git
cd retail-data-hub
pip install -r requirements.txt
```

### 2. Generate Synthetic Data

```bash
python src/data_generation/generate_pos.py
python src/data_generation/generate_web_orders.py
python src/data_generation/generate_warehouse.py
```

### 3. Run the Pipeline

```bash
# Ingest into Bronze
python src/ingestion/ingest_batch.py
python src/ingestion/ingest_realtime.py

# Transform Bronze → Silver → Gold
python src/transformation/bronze_to_silver.py
python src/transformation/silver_to_gold.py

# Run data quality checks
python src/quality/quality_checks.py
```

### 4. Launch the Dashboard

```bash
streamlit run dashboard/app.py
```

---

## 📊 Dashboard Tabs

| # | Tab | What You'll See |
|---|---|---|
| 1 | 🏠 **Overview** | Revenue, orders, customer KPI cards + revenue trend line |
| 2 | 📊 **Sales Analytics** | City-wise sales, top products, channel mix, daily trends |
| 3 | 📦 **Inventory Health** | Stockout alerts, turnover ratio, reorder recommendations |
| 4 | 🚚 **Logistics** | Avg delivery time, delay distribution, bottleneck routes |
| 5 | 👥 **Customers** | New vs returning, CLV distribution, RFM segments |
| 6 | 🛒 **Market Basket** | Item associations, confidence scores, recommendation pairs |
| 7 | ✅ **Data Quality** | Pipeline health, row counts, check pass/fail status |

---

## 🔑 Key KPIs

### 📈 Commercial
- Daily / monthly revenue aggregation
- City-wise sales breakdown (10 Indian cities)
- Top 10 products by quantity sold
- Channel mix — POS vs Web revenue split

### 📦 Operations
- Inventory turnover ratio per product/store
- Average delivery time per route
- Stockout rate (% of products with zero stock)
- Seasonal demand trends (monthly quantity by category)

### 👥 Customer
- New vs returning customer counts
- Customer Lifetime Value (CLV)
- RFM segmentation (Recency · Frequency · Monetary)

### 🛒 AI / ML
- Market basket analysis using **Apriori algorithm**
- Association rules with support, confidence & lift scores

---

## 🛡️ Data Quality Framework

Seven automated checks run at every pipeline stage:

| # | Check | Rule | On Failure |
|---|---|---|---|
| 1 | No negative prices | `unit_price >= 0` | Quarantine row |
| 2 | No future dates | `date <= today()` | Reject row |
| 3 | No null customer IDs | `customer_id IS NOT NULL` | Fill "UNKNOWN" |
| 4 | No duplicates | Composite key uniqueness | Drop duplicate |
| 5 | Referential integrity | FK exists in dimension | Reject orphan |
| 6 | Quantity range | `1 <= qty <= 10,000` | Flag outlier |
| 7 | Column completeness | `% non-null per column` | Report metric |

Results are saved as `data_quality_report.json` and visualized in the dashboard.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.9+ |
| Data Generation | Faker, Pandas, UCI Online Retail Dataset |
| Storage Format | Apache Parquet (columnar, compressed) |
| Query Engine | DuckDB (in-process OLAP) |
| Transformations | Pandas, DuckDB SQL |
| ML / Analytics | mlxtend (Apriori), Pandas |
| Dashboard | Streamlit + Plotly |
| Deployment | Streamlit Community Cloud (free) |

---

## 📄 Documentation

Detailed docs live in the [`docs/`](docs/) directory:

- **Storage & Security Plan** — Parquet partitioning strategy, RBAC, encryption, audit logging
- **Data Quality Documentation** — Full DQ rule catalog, thresholds, and sample evidence
- **Architecture Notes** — Medallion Architecture design decisions and trade-offs

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is built for a hackathon and is open for educational use.

---

<p align="center">
  Built with ❤️ by Team SixSevenCoders
</p>
