# 🚀 Retail Data Hub — Hackathon Demo Playbook

Follow this guide to show the judges a perfect End-to-End data pipeline journey from "Zero to AI".

---

## 🧹 STEP 0: The "Clean Slate" (Reset Button)
Run this once right before you start your demo to impress the judges by showing how the system builds from scratch.

```bash
./scripts/cleanup.sh
```
> **What it does**: Wipes processed Silver/Gold/Analytics data but keeps the Raw CSVs so you don't waste time re-generating data.

---

## 📊 TERMINAL 1: The Pipeline (Run Serially 1–8)
Run these one by one as you narrate the Medallion Architecture.

```bash
# 1. GENERATE (The Source)
./scripts/generation.sh

# 2. INGEST (Bronze Layer: Creating Parquets)
./scripts/ingestion.sh

# 3. TRANSFORM (Silver/Gold: Schema Evolution & Star Schema)
./scripts/transform.sh

# 4. DATA QUALITY (The Data Firewall)
./scripts/quality_checks.sh

# 5. KPI ANALYSIS (Commercial & Operations Intelligence)
./scripts/kpi_analysis.sh

# 6. DEMAND FORECAST (🧠 The LSTM AI Brain)
./scripts/forecast.sh

# 7. LIVE SIMULATOR (🟢 Real-time Stream)
./scripts/live_simulator.sh
```

---

## 🚀 TERMINAL 2: The API & Service Layer
Start this once the pipeline data is ready.

```bash
./scripts/api.sh
```
> 🟢 FastAPI on http://localhost:8000 | Docs → http://localhost:8000/docs

---

## 🖥️ TERMINAL 3: The Dashboard
Keep this running to show the final visualization.

```bash
./scripts/dashboard.sh
```
> 🟢 Next.js on http://localhost:3000

---

## 🎯 Pitch Highlights for Judges

1.  **Medallion Architecture**: Explain how we move from Raw CSV → Bronze (Storage) → Silver (Cleanup) → Gold (Analytics).
2.  **Autonomous Security**: Show **Anomaly Detection** & **Fraud Prevention**. "The system automatically flags suspicious behavior using both statistical rules and ML (Isolation Forest)."
3.  **Real-Time Pulse**: Demonstrate the **Live Transactions** feed. "We use WebSockets to stream POS data directly to the dashboard, providing an instant pulse of the business."
4.  **LSTM Forecasting**: Highlight the **Forecast** page. "We don't just show history; we use a 2-layer LSTM to predict the next 30 days of demand."
5.  **Tech Stack**: DuckDB (Speed), PyTorch (AI Brain), FastAPI (Service), Next.js (Visuals).