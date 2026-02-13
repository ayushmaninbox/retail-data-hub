#!/bin/bash
# ============================================================
# 📊 Step 1: Generate Raw Data
# ============================================================
set -e

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJ_DIR"
source .venv/bin/activate

echo "============================================================"
echo "📊 STEP 1 — GENERATING RAW DATA"
echo "============================================================"
echo ""

python3 src/data_generation/generate_pos.py
echo ""
python3 src/data_generation/generate_web_orders.py
echo ""
python3 src/data_generation/generate_warehouse.py

echo ""
echo "============================================================"
echo "✅ Raw data generated → data/raw/"
echo "============================================================"
