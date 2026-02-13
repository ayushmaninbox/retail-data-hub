"""
Schema Validator Module
=======================
Reusable schema validation, type coercion, and retry logic for data ingestion.
Used by both ingest_batch.py and ingest_realtime.py.

Features:
  - Column presence / absence checks
  - Data type casting with safe fallbacks
  - Null-fill for missing columns
  - Exponential backoff retry (decorator)
  - Ingestion logging (timestamp, row count, errors) to file + console
"""

import os
import time
import json
import logging
import pandas as pd
from datetime import datetime
from pathlib import Path
from functools import wraps
from typing import Dict, List, Optional, Any

# ── Logging Setup ────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOG_DIR = os.path.join(ROOT_DIR, "data", "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, "ingestion.log"), encoding="utf-8"),
    ],
)
logger = logging.getLogger("ingestion")


# ══════════════════════════════════════════════════════════════════
# SCHEMA DEFINITIONS
# ══════════════════════════════════════════════════════════════════

SCHEMAS: Dict[str, Dict[str, str]] = {
    "pos_sales": {
        "invoice_no":   "str",
        "invoice_date": "datetime",
        "store_id":     "str",
        "store_city":   "str",
        "customer_id":  "str",
        "product_id":   "str",
        "product_name": "str",
        "category":     "str",
        "quantity":     "int",
        "unit_price":   "float",
        "total_amount": "float",
    },
    "web_orders": {
        "order_id":         "str",
        "order_date":       "datetime",
        "customer_id":      "str",
        "customer_name":    "str",
        "customer_city":    "str",
        "product_id":       "str",
        "product_name":     "str",
        "category":         "str",
        "quantity":         "int",
        "unit_price":       "float",
        "total_amount":     "float",
        "payment_method":   "str",
        "delivery_address": "str",
    },
    "warehouse_inventory": {
        "snapshot_date":    "datetime",
        "store_id":         "str",
        "store_city":       "str",
        "product_id":       "str",
        "product_name":     "str",
        "category":         "str",
        "quantity_on_hand": "int",
        "reorder_level":    "int",
        "unit_cost":        "float",
    },
    "shipments": {
        "shipment_id":      "str",
        "order_id":         "str",
        "origin_store":     "str",
        "destination_city": "str",
        "ship_date":        "datetime",
        "delivery_date":    "datetime",
        "status":           "str",
        "carrier":          "str",
    },
}


# ══════════════════════════════════════════════════════════════════
# RETRY LOGIC — exponential backoff decorator
# ══════════════════════════════════════════════════════════════════

def retry_with_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator that retries a function with exponential backoff."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries:
                        logger.error(f"All {max_retries} attempts failed: {e}")
                        raise
                    delay = base_delay * (2 ** (attempt - 1))
                    logger.warning(
                        f"Attempt {attempt}/{max_retries} failed: {e}. "
                        f"Retrying in {delay:.1f}s..."
                    )
                    time.sleep(delay)

        return wrapper

    return decorator


# ══════════════════════════════════════════════════════════════════
# SCHEMA VALIDATION
# ══════════════════════════════════════════════════════════════════

def validate_schema(
    df: pd.DataFrame,
    schema_name: str,
    strict: bool = False,
) -> pd.DataFrame:
    """
    Validate a DataFrame against a predefined schema.

    - Checks all expected columns exist
    - Reports any extra columns (warning, not error)
    - Coerces types as defined in the schema
    - If strict=True, raises on missing columns; else fills defaults.

    Returns the validated and coerced DataFrame.
    """
    if schema_name not in SCHEMAS:
        raise ValueError(f"Unknown schema: '{schema_name}'. Available: {list(SCHEMAS.keys())}")

    expected = SCHEMAS[schema_name]
    actual_cols = set(df.columns)
    expected_cols = set(expected.keys())

    # ── Missing columns
    missing = expected_cols - actual_cols
    if missing:
        if strict:
            raise ValueError(f"Missing required columns: {missing}")
        else:
            logger.warning(f"Missing columns (will fill defaults): {missing}")
            for col in missing:
                dtype = expected[col]
                if dtype == "str":
                    df[col] = "UNKNOWN"
                elif dtype in ("int", "float"):
                    df[col] = 0
                elif dtype == "datetime":
                    df[col] = pd.NaT

    # ── Extra columns
    extra = actual_cols - expected_cols
    if extra:
        logger.info(f"Extra columns (kept): {extra}")

    # ── Type coercion
    df = coerce_types(df, expected)

    logger.info(
        f"Schema validation passed for '{schema_name}' -- "
        f"{len(df)} rows, {len(df.columns)} columns"
    )
    return df


def coerce_types(df: pd.DataFrame, type_map: Dict[str, str]) -> pd.DataFrame:
    """Coerce DataFrame columns to specified types."""
    df = df.copy()
    for col, dtype in type_map.items():
        if col not in df.columns:
            continue
        try:
            if dtype == "datetime":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif dtype == "int":
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
            elif dtype == "float":
                df[col] = pd.to_numeric(df[col], errors="coerce")
            elif dtype == "str":
                df[col] = df[col].astype(str).replace("nan", None)
        except Exception as e:
            logger.warning(f"Could not coerce '{col}' to {dtype}: {e}")
    return df


# ══════════════════════════════════════════════════════════════════
# INGESTION LOGGING
# ══════════════════════════════════════════════════════════════════

def log_ingestion_summary(
    dataset_name: str,
    source_path: str,
    output_path: str,
    row_count: int,
    col_count: int,
    status: str = "SUCCESS",
    error: Optional[str] = None,
) -> Dict[str, Any]:
    """Log ingestion summary to console, return dict, and append to JSONL log."""
    summary = {
        "timestamp": datetime.now().isoformat(),
        "dataset": dataset_name,
        "source": source_path,
        "output": output_path,
        "rows": row_count,
        "columns": col_count,
        "status": status,
        "error": error,
        "ingested_at": datetime.now().isoformat(),
    }

    # Append to JSONL log file
    log_path = os.path.join(LOG_DIR, "ingestion_runs.jsonl")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(summary) + "\n")

    logger.info(
        f"Ingested '{dataset_name}': {row_count} rows -> {output_path}"
    )
    return summary
