# 🚀 Retail Data Hub — Demo Run Order

> All scripts are in `scripts/` and can be run from anywhere.
> Each script auto-detects the project root and activates the venv.

---

## 🛠️ First Time Setup (one-time)

```bash
./scripts/installation.sh
```
> Creates venv, installs Python deps + DuckDB, runs npm install for dashboard

---

## 📊 TERMINAL 1 — Run Pipeline (sequential, one by one)

```bash
# Step 1: Generate Raw Data (CSV/JSON → data/raw/)
./scripts/generation.sh

# Step 2: Ingest → Bronze Layer (Parquet → data/bronze/)
./scripts/ingestion.sh

# Step 3 & 4: Transform Bronze → Silver → Gold Star Schema
./scripts/transform.sh

# Step 5: Run KPI Analytics (JSON → data/analytics/)
./scripts/kpi_analysis.sh

# Step 6: Data Quality Checks (→ data/data_quality_report.json)
./scripts/quality_checks.sh
```

---

## 🚀 TERMINAL 2 — Start API Server (keep running)

```bash
./scripts/api.sh
```
> 🟢 FastAPI on http://localhost:8000 | Docs → http://localhost:8000/docs

---

## 🖥️ TERMINAL 3 — Start Dashboard (keep running)

```bash
./scripts/dashboard.sh
```
> 🟢 Next.js on http://localhost:3000

---

## 🎯 Demo Flow for Judges

1. **Show empty `data/` folders** — "We start from zero"
2. **Run Steps 1–6 in Terminal 1** — narrate each medallion layer
3. **Start API (Terminal 2)** — show Swagger docs briefly
4. **Start Dashboard (Terminal 3)** — walk through all 7 pages
5. **Highlight**: Raw CSV → Parquet → Star Schema → KPIs → API → Dashboard