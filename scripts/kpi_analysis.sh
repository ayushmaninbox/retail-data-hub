#!/bin/bash
# ============================================================
# 📈 Step 5: Run KPI Analytics
# ============================================================
set -e

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJ_DIR"
source .venv/bin/activate

echo "============================================================"
echo "📈 STEP 5 — RUNNING KPI ANALYTICS"
echo "============================================================"
echo ""

python3 src/analytics/commercial_kpis.py
echo ""
python3 src/analytics/operations_kpis.py
echo ""
python3 src/analytics/customer_kpis.py
echo ""
python3 src/analytics/market_basket.py

echo ""
echo "============================================================"
echo "✅ KPI analytics complete → data/analytics/"
echo "============================================================"
