"""
schema_validator.py
===================
Reusable schema validation + retry logic for the ingestion pipeline.
Used by both ingest_batch.py and ingest_realtime.py.

Features:
  - Column presence / absence checks
  - Data type casting with safe fallbacks
  - Null-fill for missing columns
  - Exponential backoff retry for file reads
  - Ingestion logging (timestamp, row count, errors)
"""

import os
import time
import json
import logging
from datetime import datetime
from typing import Dict, Optional, List, Tuple

import pandas as pd

# ── logging setup ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOG_DIR = os.path.join(ROOT_DIR, "data", "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, "ingestion.log"), encoding="utf-8"),
    ],
)
logger = logging.getLogger("ingestion")


# ══════════════════════════════════════════════════════════════════════
# SCHEMA DEFINITIONS — expected columns + types for every raw source
# ══════════════════════════════════════════════════════════════════════

SCHEMAS: Dict[str, Dict[str, str]] = {
    "pos_sales": {
        "invoice_no":    "str",
        "invoice_date":  "datetime",
        "store_id":      "str",
        "store_city":    "str",
        "customer_id":   "str",
        "product_id":    "str",
        "product_name":  "str",
        "category":      "str",
        "quantity":       "int",
        "unit_price":    "float",
        "total_amount":  "float",
    },
    "web_orders": {
        "order_id":          "str",
        "order_date":        "datetime",
        "customer_id":       "str",
        "customer_name":     "str",
        "customer_city":     "str",
        "product_id":        "str",
        "product_name":      "str",
        "category":          "str",
        "quantity":           "int",
        "unit_price":        "float",
        "total_amount":      "float",
        "payment_method":    "str",
        "delivery_address":  "str",
    },
    "warehouse_inventory": {
        "snapshot_date":     "datetime",
        "store_id":          "str",
        "store_city":        "str",
        "product_id":        "str",
        "product_name":      "str",
        "category":          "str",
        "quantity_on_hand":  "int",
        "reorder_level":     "int",
        "unit_cost":         "float",
    },
    "shipments": {
        "shipment_id":       "str",
        "order_id":          "str",
        "origin_store":      "str",
        "destination_city":  "str",
        "ship_date":         "datetime",
        "delivery_date":     "datetime",
        "status":            "str",
        "carrier":           "str",
    },
}


# ══════════════════════════════════════════════════════════════════════
# RETRY LOGIC — exponential backoff
# ══════════════════════════════════════════════════════════════════════

def retry_read(read_fn, max_retries: int = 3, backoff_base: float = 1.0):
    """
    Retry a file-reading function with exponential backoff.
    Returns the DataFrame on success, raises on final failure.
    """
    for attempt in range(1, max_retries + 1):
        try:
            return read_fn()
        except Exception as e:
            wait = backoff_base * (2 ** (attempt - 1))
            logger.warning(f"  Read attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                logger.info(f"  Retrying in {wait:.1f}s …")
                time.sleep(wait)
            else:
                logger.error(f"  All {max_retries} attempts failed. Raising error.")
                raise


# ══════════════════════════════════════════════════════════════════════
# SCHEMA VALIDATION
# ══════════════════════════════════════════════════════════════════════

def validate_schema(
    df: pd.DataFrame,
    schema_name: str,
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Validate a DataFrame against a known schema.

    Returns:
      (validated_df, warnings_list)

    Actions:
      - Missing columns → added with None / NaN + warning
      - Extra columns   → kept but logged
      - Type casting     → best-effort; failures logged
    """
    expected = SCHEMAS.get(schema_name)
    if expected is None:
        raise ValueError(f"Unknown schema '{schema_name}'. Known: {list(SCHEMAS.keys())}")

    warnings: List[str] = []
    df = df.copy()

    # ── check for missing columns ────────────────────────────────────
    for col, dtype in expected.items():
        if col not in df.columns:
            warnings.append(f"Missing column '{col}' — filled with NULL")
            df[col] = None

    # ── check for extra columns ──────────────────────────────────────
    extra = set(df.columns) - set(expected.keys())
    if extra:
        warnings.append(f"Extra columns found (kept): {sorted(extra)}")

    # ── type casting ─────────────────────────────────────────────────
    for col, dtype in expected.items():
        try:
            if dtype == "datetime":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif dtype == "int":
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif dtype == "float":
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif dtype == "str":
                df[col] = df[col].astype(str).replace("nan", None)
        except Exception as e:
            warnings.append(f"Type cast failed for '{col}' → {dtype}: {e}")

    if warnings:
        for w in warnings:
            logger.warning(f"  ⚠ {w}")
    else:
        logger.info(f"  ✓ Schema '{schema_name}' validated — no issues")

    return df, warnings


# ══════════════════════════════════════════════════════════════════════
# INGESTION LOGGING — save run metadata
# ══════════════════════════════════════════════════════════════════════

def log_ingestion_run(
    source_file: str,
    schema_name: str,
    output_path: str,
    row_count: int,
    warnings: List[str],
    status: str = "SUCCESS",
    error: Optional[str] = None,
):
    """Append a JSON line to the ingestion log."""
    log_entry = {
        "timestamp":   datetime.now().isoformat(),
        "source":      source_file,
        "schema":      schema_name,
        "output":      output_path,
        "rows":        row_count,
        "status":      status,
        "warnings":    warnings,
        "error":       error,
    }

    log_path = os.path.join(LOG_DIR, "ingestion_runs.jsonl")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry) + "\n")

    logger.info(
        f"  📝 Logged: {schema_name} | {row_count:,} rows | {status}"
    )
