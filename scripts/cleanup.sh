#!/bin/zsh

# scripts/cleanup.sh
# ==================
# Resets the platform state for demos.
# Removes processed files (Silver, Gold, Analytics) but PRESERVES 
# Raw and Bronze data so you don't have to re-run generation.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data"

echo "🧹 Resetting demo state (preserving Raw & Bronze)..."

# 1. Remove Silver layer (cleaned data)
if [ -d "$DATA_DIR/silver" ]; then
    find "$DATA_DIR/silver" -name "*.parquet" -type f -delete
    echo "  ✓ Silver layer wiped"
fi

# 2. Remove Gold layer (star schema)
if [ -d "$DATA_DIR/gold" ]; then
    find "$DATA_DIR/gold" -name "*.parquet" -type f -delete
    echo "  ✓ Gold layer wiped"
fi

# 3. Remove Analytics outputs
if [ -d "$DATA_DIR/analytics" ]; then
    find "$DATA_DIR/analytics" -name "*.json" -type f -delete
    find "$DATA_DIR/analytics" -name "*.csv" -type f -delete
    echo "  ✓ Analytics JSONs wiped"
fi

# 4. Remove Data Quality reports
rm -f "$DATA_DIR/data_quality_report.json"
rm -f "$DATA_DIR/data_quality.json"
echo "  ✓ Quality reports wiped"

# 5. Remove Python Cache (__pycache__)
find "$ROOT_DIR/src" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
echo "  ✓ Python __pycache__ cleared"

echo "============================================================"
echo "✅ Cleanup complete!"
echo "   - Preserved: data/raw (Source CSVs)"
echo "   - Preserved: data/bronze (Ingested Parquets)"
echo "   - Ready to run: ./scripts/transform.sh && ./scripts/kpi_analysis.sh && ./scripts/forecast.sh"
echo "============================================================"
