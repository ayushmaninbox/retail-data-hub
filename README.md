<p align="center">
  <h1 align="center">🧠 Retail Data Hub</h1>
  <p align="center">
    <strong>Smart Retail Supply Chain & Customer Intelligence Platform</strong>
  </p>
  <p align="center">
    A full-stack data engineering project demonstrating ETL pipelines, Medallion Architecture, star schema modeling, automated data quality, KPI analytics, a FastAPI backend, and an interactive Next.js dashboard — all at zero infrastructure cost.
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
| **API** | FastAPI backend serving Gold layer KPIs with Swagger docs |
| **Dashboard** | 7-page interactive Next.js app with Recharts, Tailwind CSS |
| **Query Engine** | DuckDB — in-process SQL directly on Parquet files |
| **Cost** | $0 — Python + DuckDB + Next.js |

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
       📈 KPI Scripts    🚀 FastAPI       📊 Next.js
        (Python)        (REST API)        Dashboard
                             │
                             └──── serves JSON ────▶ 🖥️ Dashboard
```

---

## 📂 Project Structure

```
retail-data-hub/
│
├── data/                              # All data layers
│   ├── raw/                           # Source files (CSV, JSON)
│   ├── bronze/                        # Ingested Parquet (schema-validated)
│   ├── silver/                        # Cleaned & merged Parquet
│   ├── gold/                          # Star schema Parquet (partitioned)
│   ├── analytics/                     # KPI output (JSON files)
│   └── logs/                          # Pipeline execution logs
│
├── src/                               # All pipeline & analytics code
│   ├── data_generation/               # Synthetic data generators
│   │   ├── generate_pos.py            #   POS sales (Faker, 10 Indian cities)
│   │   ├── generate_web_orders.py     #   Web orders (JSON)
│   │   └── generate_warehouse.py      #   Warehouse inventory (CSV)
│   │
│   ├── ingestion/                     # Raw → Bronze layer
│   │   ├── ingest_batch.py            #   Batch CSV ingestion
│   │   ├── ingest_realtime.py         #   Near real-time JSON ingestion
│   │   └── schema_validator.py        #   Schema validation & enforcement
│   │
│   ├── transformation/                # Bronze → Silver → Gold
│   │   ├── bronze_to_silver.py        #   Cleaning, dedup, merging
│   │   ├── silver_to_gold.py          #   Star schema construction
│   │   └── scd_handler.py             #   SCD Type 2 implementation
│   │
│   ├── quality/                       # Data Quality framework
│   │   └── quality_checks.py          #   7 automated DQ checks + JSON report
│   │
│   ├── analytics/                     # KPI computation scripts
│   │   ├── commercial_kpis.py         #   Revenue, cities, products, channels
│   │   ├── operations_kpis.py         #   Inventory, delivery, stockouts
│   │   ├── customer_kpis.py           #   CLV, RFM, new vs returning
│   │   └── market_basket.py           #   Apriori association rules
│   │
│   └── api/                           # REST API backend
│       └── api.py                     #   FastAPI serving KPI JSON to dashboard
│
├── sql/                               # Standalone SQL queries
│   └── kpi_queries.sql                #   All KPI queries (DuckDB SQL)
│
├── dashboard/                         # Next.js 14 dashboard frontend
│   ├── src/
│   │   ├── app/                       #   App Router pages (7 routes)
│   │   │   ├── page.tsx               #     🏠 Overview (home)
│   │   │   ├── sales/                 #     📊 Sales Analytics
│   │   │   ├── inventory/             #     📦 Inventory Health
│   │   │   ├── logistics/             #     🚚 Logistics
│   │   │   ├── customers/             #     👥 Customer Intelligence
│   │   │   ├── market-basket/         #     🛒 Market Basket Analysis
│   │   │   └── data-quality/          #     ✅ Data Quality
│   │   └── components/                #   Reusable UI components
│   │       ├── Sidebar.tsx            #     Navigation sidebar
│   │       ├── KpiCard.tsx            #     Metric display cards
│   │       ├── ChartCard.tsx          #     Chart wrapper
│   │       ├── PageHeader.tsx         #     Page titles
│   │       └── Skeleton.tsx           #     Loading skeletons
│   ├── package.json
│   └── tailwind.config.ts
│
├── scripts/                           # One-click automation scripts
│   ├── installation.sh                #   Full setup (venv + pip + npm)
│   ├── generation.sh                  #   Generate synthetic data
│   ├── ingestion.sh                   #   Ingest Raw → Bronze
│   ├── transform.sh                   #   Transform Bronze → Silver → Gold
│   ├── kpi_analysis.sh                #   Run all KPI analytics
│   ├── quality_checks.sh              #   Run data quality checks
│   ├── api.sh                         #   Start FastAPI server
│   └── dashboard.sh                   #   Start Next.js dev server
│
├── docs/                              # Architecture & design documentation
│   ├── architecture.md                #   Medallion Architecture deep-dive
│   ├── architecture_diagram.png       #   Visual architecture diagram
│   ├── data_quality.md                #   DQ rule catalog & thresholds
│   ├── storage_security_plan.md       #   Partitioning, RBAC, encryption
│   └── STORAGE_AND_SECURITY.md        #   Security & compliance plan
│
├── requirements.txt                   # Python dependencies
├── .gitignore
└── README.md                          # ← You are here
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+**
- **Node.js 18+** & npm
- **Git**

### 1. Clone & Install (one-time setup)

```bash
git clone https://github.com/ayushmaninbox/retail-data-hub.git
cd retail-data-hub
./scripts/installation.sh
```

> This creates a Python virtual environment, installs all pip dependencies, installs
> DuckDB, runs `npm install` for the dashboard, and creates the `data/` directories.

### 2. Run the Data Pipeline (Terminal 1)

Run each step sequentially to walk through the full Medallion Architecture:

```bash
# Step 1 — Generate synthetic raw data (CSV/JSON → data/raw/)
./scripts/generation.sh

# Step 2 — Ingest into Bronze layer (Parquet → data/bronze/)
./scripts/ingestion.sh

# Step 3 — Transform Bronze → Silver → Gold star schema
./scripts/transform.sh

# Step 4 — Compute all KPI analytics (JSON → data/analytics/)
./scripts/kpi_analysis.sh

# Step 5 — Run data quality checks (→ data/data_quality_report.json)
./scripts/quality_checks.sh
```

### 3. Start the API Server (Terminal 2)

```bash
./scripts/api.sh
```

> 🟢 FastAPI runs on **http://localhost:8000**
> 📚 Interactive API docs at **http://localhost:8000/docs**

### 4. Start the Dashboard (Terminal 3)

```bash
./scripts/dashboard.sh
```

> 🟢 Next.js dashboard on **http://localhost:3000**

---

## 🖥️ Dashboard Pages

The dashboard is a **Next.js 14** app built with **TypeScript**, **Tailwind CSS**, and **Recharts**. It fetches live data from the FastAPI backend.

| # | Page | Route | What You'll See |
|---|---|---|---|
| 1 | 🏠 **Overview** | `/` | Revenue, orders, customers, avg transaction KPI cards + revenue trend |
| 2 | 📊 **Sales Analytics** | `/sales` | City-wise sales, top products, channel mix, monthly trends |
| 3 | 📦 **Inventory Health** | `/inventory` | Stockout alerts, turnover ratio, reorder recommendations |
| 4 | 🚚 **Logistics** | `/logistics` | Avg delivery time, delay distribution, seasonal demand |
| 5 | 👥 **Customers** | `/customers` | New vs returning, CLV distribution, RFM segments |
| 6 | 🛒 **Market Basket** | `/market-basket` | Item associations, confidence scores, recommendation pairs |
| 7 | ✅ **Data Quality** | `/data-quality` | Pipeline health, row counts, check pass/fail status |

---

## 🚀 API Endpoints

The FastAPI backend serves pre-computed KPI data from the Gold layer as JSON:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + data file status |
| `GET` | `/api/overview` | Combined summary for the Overview page |
| `GET` | `/api/commercial` | Revenue, city sales, top products, channel mix |
| `GET` | `/api/operations` | Inventory turnover, stockout rate, delivery times |
| `GET` | `/api/customers` | CLV, RFM segmentation, new vs returning |
| `GET` | `/api/market-basket` | Market Basket Analysis (Apriori) results |
| `GET` | `/api/data-quality` | Data quality report |
| `GET` | `/api/sales` | Sales-specific data (derived from commercial) |
| `GET` | `/api/inventory` | Inventory-specific data (derived from operations) |
| `GET` | `/api/logistics` | Logistics-specific data (derived from operations) |

---

## 🔑 Key KPIs

### 📈 Commercial
- Daily / monthly revenue aggregation
- City-wise sales breakdown (10 Indian cities)
- Top 10 products by quantity sold
- Channel mix — POS vs Web revenue split
- Category-level revenue analysis

### 📦 Operations
- Inventory turnover ratio per product/store
- Average delivery time per route
- Stockout rate (% of products with zero stock)
- Seasonal demand trends (monthly quantity by category)
- Reorder point alerts

### 👥 Customer
- New vs returning customer counts
- Customer Lifetime Value (CLV)
- RFM segmentation (Recency · Frequency · Monetary)

### 🛒 AI / ML
- Market basket analysis using **Apriori algorithm**
- Standard, cross-channel, and category-level association rules
- Support, confidence & lift scores

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

Results are saved as `data/data_quality_report.json` and visualized in the Data Quality dashboard page.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Language** | Python 3.9+ · TypeScript |
| **Data Generation** | Faker, Pandas, NumPy |
| **Storage Format** | Apache Parquet (columnar, compressed) |
| **Query Engine** | DuckDB (in-process OLAP) |
| **Transformations** | Pandas, DuckDB SQL |
| **ML / Analytics** | mlxtend (Apriori), scikit-learn, Pandas |
| **API Backend** | FastAPI + Uvicorn |
| **Dashboard** | Next.js 14 + React 18 + TypeScript |
| **Charts** | Recharts |
| **Styling** | Tailwind CSS |
| **UI Components** | Lucide React (icons) |
| **Automation** | Shell scripts (Bash) |

---

## 📜 Scripts Reference

All scripts live in `scripts/` and auto-detect the project root + activate the virtual environment:

| Script | Purpose |
|---|---|
| `installation.sh` | Creates venv, installs Python deps + npm packages, sets up data dirs |
| `generation.sh` | Generates synthetic POS, Web Order, and Warehouse data |
| `ingestion.sh` | Ingests raw CSV/JSON into Bronze layer Parquet files |
| `transform.sh` | Runs Bronze → Silver → Gold transformations (incl. SCD2) |
| `kpi_analysis.sh` | Executes all 4 KPI analytics scripts, outputs JSON |
| `quality_checks.sh` | Runs 7 data quality checks, generates report |
| `api.sh` | Starts the FastAPI server on port 8000 |
| `dashboard.sh` | Starts the Next.js dev server on port 3000 |

---

## 📄 Documentation

Detailed docs live in the [`docs/`](docs/) directory:

| Document | Description |
|---|---|
| [architecture.md](docs/architecture.md) | Medallion Architecture deep-dive, design decisions, trade-offs |
| [architecture_diagram.png](docs/architecture_diagram.png) | Visual system architecture diagram |
| [data_quality.md](docs/data_quality.md) | Full DQ rule catalog, thresholds, and sample evidence |
| [storage_security_plan.md](docs/storage_security_plan.md) | Parquet partitioning strategy, RBAC, encryption, audit logging |

---

## 🎯 Demo Flow (for Judges)

1. **Show empty `data/` folders** — *"We start from zero"*
2. **Run the pipeline** (Steps 1–5 in Terminal 1) — narrate each medallion layer
3. **Start API** (Terminal 2) — show Swagger docs at `/docs`
4. **Start Dashboard** (Terminal 3) — walk through all 7 pages
5. **Highlight the journey**: Raw CSV → Parquet → Star Schema → KPIs → REST API → Dashboard

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
  Built with ❤️ by <strong>Team SixSevenCoders</strong>
</p>
