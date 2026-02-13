#!/bin/bash
# ============================================================
# 🚀 Start FastAPI Server
# ============================================================
set -e

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJ_DIR"
source .venv/bin/activate

echo "============================================================"
echo "🚀 STARTING API SERVER"
echo "   URL  → http://localhost:8000"
echo "   Docs → http://localhost:8000/docs"
echo "============================================================"
echo ""

python3 src/api/api.py
