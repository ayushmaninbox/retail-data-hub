# 🚀 Retail Data Hub — Demo Run Order

> Run all commands from the project root:
> `cd ~/Documents/Hackathon/retail-data-hub`
>
> Activate the virtual environment first:
> `source .venv/bin/activate`

---

## TERMINAL 1 — Pipeline (run sequentially, one by one)

### Step 1: Generate Raw Data
```bash
python3 src/data_generation/generate_pos.py
python3 src/data_generation/generate_web_orders.py
python3 src/data_generation/generate_warehouse.py
```
> ✅ Creates `data/raw/` → `pos_sales.csv`, `web_orders.json`, `warehouse_inventory.csv`, `shipments.csv`

### Step 2: Ingest → Bronze Layer
```bash
python3 src/ingestion/ingest_batch.py
python3 src/ingestion/ingest_realtime.py
```
> ✅ Creates `data/bronze/` → Parquet files + ingestion logs

### Step 3: Transform → Silver Layer (Clean + Unify)
```bash
python3 src/transformation/bronze_to_silver.py
```
> ✅ Creates `data/silver/` → `unified_sales.parquet`, `warehouse_inventory.parquet`, `shipments.parquet`

### Step 4: Model → Gold Layer (Star Schema)
```bash
python3 src/transformation/silver_to_gold.py
```
> ✅ Creates `data/gold/` → `fact_sales`, `dim_customer`, `dim_product`, `dim_store`, `dim_date`

### Step 5: Run KPI Analytics
```bash
python3 src/analytics/commercial_kpis.py
python3 src/analytics/operations_kpis.py
python3 src/analytics/customer_kpis.py
python3 src/analytics/market_basket.py
```
> ✅ Creates `data/analytics/` → 4 KPI JSON files

### Step 6: Data Quality Checks
```bash
python3 src/quality/quality_checks.py
```
> ✅ Creates `data/data_quality_report.json`

---

## TERMINAL 2 — API Server (keep running)

```bash
source .venv/bin/activate
python3 src/api/api.py
```
> 🟢 Starts FastAPI on http://localhost:8000
> 📚 Swagger docs at http://localhost:8000/docs

---

## TERMINAL 3 — Dashboard (keep running)

```bash
cd dashboard
npm run dev
```
> 🟢 Starts Next.js on http://localhost:3000

---

## 🎯 Demo Flow for Judges

1. **Show empty `data/` folders** — "We start from zero"
2. **Run Steps 1–6 sequentially** — narrate each medallion layer
3. **Start API (Terminal 2)** — show Swagger docs briefly
4. **Start Dashboard (Terminal 3)** — walk through all 7 pages
5. **Highlight**: Real-time data flow from CSV → Parquet → Star Schema → KPIs → API → Dashboard