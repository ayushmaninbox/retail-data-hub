"""
Real-Time (Simulated) Ingestion Pipeline
Reads JSON source files (web orders) record-by-record, simulating
a streaming ingestion, validates schema, and writes Parquet to Bronze.
"""

import sys
import json
import time
import pandas as pd
from pathlib import Path

# Add project root to path
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


# ── Simulated Stream Reader ─────────────────────────────────────

def read_json_stream(file_path: Path, batch_size: int = 5):
    """
    Simulate streaming by reading a JSON array and yielding
    records in micro-batches of `batch_size`.
    """
    with open(file_path, "r") as f:
        records = json.load(f)

    logger.info(f"📡 Simulating stream: {len(records)} records, batch_size={batch_size}")

    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        logger.info(f"   ↳ Received micro-batch {i // batch_size + 1} ({len(batch)} records)")
        # Simulate network latency
        time.sleep(0.1)
        yield batch


# ── Ingest JSON ──────────────────────────────────────────────────

@retry_with_backoff(max_retries=3)
def ingest_json_stream(
    file_name: str = "web_orders.json",
    schema_name: str = "web_orders",
    output_subdir: str = "web_orders",
    batch_size: int = 5,
) -> dict:
    """
    Read a JSON file in micro-batches (simulating streaming),
    validate, and write as Parquet to bronze.
    """
    source_path = RAW_DIR / file_name
    output_dir = BRONZE_DIR / output_subdir

    logger.info(f"📂 Reading {source_path} as simulated stream ...")

    # Collect all micro-batches into one DataFrame
    all_records = []
    for batch in read_json_stream(source_path, batch_size=batch_size):
        all_records.extend(batch)

    df = pd.DataFrame(all_records)
    logger.info(f"   Total collected: {df.shape[0]} rows × {df.shape[1]} columns")

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

def run_realtime_ingestion() -> dict:
    """Run the simulated real-time ingestion for web orders."""

    logger.info("=" * 60)
    logger.info("🚀 Starting Real-Time (Simulated) Ingestion Pipeline")
    logger.info("=" * 60)

    try:
        summary = ingest_json_stream()
    except Exception as e:
        logger.error(f"✗ Real-time ingestion failed: {e}")
        summary = {"dataset": "web_orders", "error": str(e)}

    # Write ingestion log
    log_path = BRONZE_DIR / "realtime_ingestion_log.json"
    with open(log_path, "w") as f:
        json.dump(summary, f, indent=2)
    logger.info(f"\n📋 Ingestion log saved → {log_path}")

    logger.info("=" * 60)
    logger.info("✅ Real-time ingestion complete")
    logger.info("=" * 60)

    return summary


if __name__ == "__main__":
    run_realtime_ingestion()
