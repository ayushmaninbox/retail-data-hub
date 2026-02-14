#!/bin/bash
# ============================================================
# ⚡ Live Transaction Simulator
# ============================================================
set -e

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJ_DIR"
source .venv/bin/activate

echo "============================================================"
echo "⚡ STARTING LIVE TRANSACTION SIMULATOR"
echo "============================================================"
echo ""
echo "Make sure the API is running (./scripts/api.sh)"
echo "Transactions will stream to ws://localhost:8000/ws/simulator"
echo ""

python3 src/data_generation/live_simulator.py
