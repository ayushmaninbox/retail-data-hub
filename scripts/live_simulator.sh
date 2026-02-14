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
TARGET_URL="${WS_URL:-ws://localhost:8000/ws/simulator}"
echo "Transactions will stream to: $TARGET_URL"
echo ""
echo "💡 To stream to cloud, run:"
echo "   WS_URL=wss://retail-data-hub-main-2a82b44.kuberns.cloud/ws/simulator ./scripts/live_simulator.sh"

python3 src/data_generation/live_simulator.py
