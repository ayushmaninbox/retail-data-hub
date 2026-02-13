#!/bin/bash
# ============================================================
# 🔍 Step 6: Data Quality Checks
# ============================================================
set -e

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJ_DIR"
source .venv/bin/activate

echo "============================================================"
echo "🔍 STEP 6 — DATA QUALITY CHECKS"
echo "============================================================"
echo ""

python3 src/quality/quality_checks.py

echo ""
echo "============================================================"
echo "✅ Quality report → data/data_quality_report.json"
echo "============================================================"
