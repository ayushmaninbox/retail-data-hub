"""
Batch Ingestion Pipeline
Reads CSV source files (POS sales, warehouse inventory, shipments)
and writes validated Parquet files to the Bronze layer.
"""

import sys
import json
import pandas as pd
from pathlib import Path

# Add project root to path so we can import sibling modules
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.ingestion.schema_validator import (
    validate_schema,
    retry_with_backoff,
    log_ingestion_summary,
    logger,
)

# ── Paths ────────────────────────────────────────────────────────
RAW_DIR = PROJECT_ROOT / "data" / "raw"
BRONZE_DIR = PROJECT_ROOT / "data" / "bronze"


# ── Ingest a single CSV ─────────────────────────────────────────

@retry_with_backoff(max_retries=3)
def ingest_csv(
    file_name: str,
    schema_name: str,
    output_subdir: str,
) -> dict:
    """
    Read a CSV file, validate its schema, and write as Parquet to bronze.

    Args:
        file_name: Name of the CSV in data/raw/ (e.g. 'pos_sales.csv')
        schema_name: Key in SCHEMAS dict for validation
        output_subdir: Subdirectory under data/bronze/ (e.g. 'pos_sales')

    Returns:
        Ingestion summary dict.
    """
    source_path = RAW_DIR / file_name
    output_dir = BRONZE_DIR / output_subdir

    # Read
    logger.info(f"📂 Reading {source_path} ...")
    df = pd.read_csv(source_path)
    logger.info(f"   Raw shape: {df.shape[0]} rows × {df.shape[1]} columns")

    # Validate & coerce
    df = validate_schema(df, schema_name)

    # Write to Bronze as Parquet
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{schema_name}.parquet"
    df.to_parquet(output_path, index=False, engine="pyarrow")

    return log_ingestion_summary(
        dataset_name=schema_name,
        source_path=str(source_path),
        output_path=str(output_path),
        row_count=len(df),
        col_count=len(df.columns),
    )


# ── Main ─────────────────────────────────────────────────────────

def run_batch_ingestion() -> list:
    """Run batch ingestion for all CSV sources."""

    datasets = [
        {"file_name": "pos_sales.csv", "schema_name": "pos_sales", "output_subdir": "pos_sales"},
        {"file_name": "warehouse_inventory.csv", "schema_name": "warehouse_inventory", "output_subdir": "warehouse"},
        {"file_name": "shipments.csv", "schema_name": "shipments", "output_subdir": "warehouse"},
    ]

    summaries = []
    logger.info("=" * 60)
    logger.info("🚀 Starting Batch Ingestion Pipeline")
    logger.info("=" * 60)

    for ds in datasets:
        try:
            summary = ingest_csv(**ds)
            summaries.append(summary)
        except Exception as e:
            logger.error(f"✗ Failed to ingest {ds['file_name']}: {e}")
            summaries.append({
                "dataset": ds["schema_name"],
                "source": ds["file_name"],
                "error": str(e),
            })

    # Write ingestion log
    log_path = BRONZE_DIR / "batch_ingestion_log.json"
    with open(log_path, "w") as f:
        json.dump(summaries, f, indent=2)
    logger.info(f"\n📋 Ingestion log saved → {log_path}")

    logger.info("=" * 60)
    logger.info(f"✅ Batch ingestion complete — {len(summaries)} datasets processed")
    logger.info("=" * 60)

    return summaries


if __name__ == "__main__":
    run_batch_ingestion()
