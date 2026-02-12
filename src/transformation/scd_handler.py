"""
scd_handler.py
==============
Implements SCD Type 2 (Slowly Changing Dimension) logic for dim_customer.

When a customer's city changes mid-way through the data range:
  - The old row gets end_date set, is_current = False
  - A new row is inserted with new city, start_date = change_date,
    end_date = None, is_current = True
  - Each version gets a unique surrogate key (customer_sk)

This module is imported by silver_to_gold.py and can also run standalone.

Usage:
    python src/transformation/scd_handler.py
"""

import os
import sys
import pandas as pd
from datetime import datetime

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SILVER_DIR = os.path.join(ROOT_DIR, "data", "silver")
GOLD_DIR = os.path.join(ROOT_DIR, "data", "gold")
os.makedirs(GOLD_DIR, exist_ok=True)

# ── Import SCD metadata from data generation ────────────────────────
sys.path.insert(0, os.path.join(ROOT_DIR, "src", "data_generation"))
from generate_pos import (
    CUSTOMERS, CUSTOMER_DF, SCD_MAP, SCD_CUTOFF, CITIES,
    START_DATE, END_DATE,
)


# ══════════════════════════════════════════════════════════════════════
# SCD TYPE 2 BUILDER
# ══════════════════════════════════════════════════════════════════════

def build_dim_customer_scd2() -> pd.DataFrame:
    """
    Build dim_customer with SCD Type 2 handling.

    For customers whose city changed (tracked in SCD_MAP):
    - Version 1: original city, valid_from = START_DATE, valid_to = SCD_CUTOFF - 1 day
    - Version 2: new city, valid_from = SCD_CUTOFF, valid_to = None (current)

    For all other customers:
    - Single row, valid_from = START_DATE, valid_to = None, is_current = True
    """
    print("🔄 Building dim_customer with SCD Type 2 …")

    rows = []
    sk = 1  # surrogate key counter

    for cust in CUSTOMERS:
        cid = cust["customer_id"]

        if cid in SCD_MAP:
            scd = SCD_MAP[cid]

            # Version 1 — original city (historical)
            rows.append({
                "customer_sk": sk,
                "customer_id": cid,
                "customer_name": cust["name"],
                "city": scd["old_city"],
                "state": scd["old_state"],
                "valid_from": START_DATE.strftime("%Y-%m-%d"),
                "valid_to": (SCD_CUTOFF - pd.Timedelta(days=1)).strftime("%Y-%m-%d"),
                "is_current": False,
                "version": 1,
            })
            sk += 1

            # Version 2 — new city (current)
            rows.append({
                "customer_sk": sk,
                "customer_id": cid,
                "customer_name": cust["name"],
                "city": scd["new_city"],
                "state": scd["new_state"],
                "valid_from": SCD_CUTOFF.strftime("%Y-%m-%d"),
                "valid_to": None,
                "is_current": True,
                "version": 2,
            })
            sk += 1

        else:
            # No change — single version
            rows.append({
                "customer_sk": sk,
                "customer_id": cid,
                "customer_name": cust["name"],
                "city": cust["city"],
                "state": CITIES.get(cust["city"], "Unknown"),
                "valid_from": START_DATE.strftime("%Y-%m-%d"),
                "valid_to": None,
                "is_current": True,
                "version": 1,
            })
            sk += 1

    df = pd.DataFrame(rows)
    df["valid_from"] = pd.to_datetime(df["valid_from"])
    df["valid_to"] = pd.to_datetime(df["valid_to"])

    # Stats
    scd_customers = len(SCD_MAP)
    total_rows = len(df)
    print(f"  ✅ dim_customer built: {total_rows} rows "
          f"({scd_customers} customers with city change → 2 versions each)")

    return df


def save_dim_customer(df: pd.DataFrame) -> str:
    """Save dim_customer to Gold layer."""
    path = os.path.join(GOLD_DIR, "dim_customer.parquet")
    df.to_parquet(path, index=False, engine="pyarrow")
    print(f"  💾 Saved → {path}")
    return path


# ══════════════════════════════════════════════════════════════════════
# LOOKUP HELPER — used by silver_to_gold.py
# ══════════════════════════════════════════════════════════════════════

def get_customer_sk(dim_customer: pd.DataFrame, customer_id: str, txn_date) -> int:
    """
    Look up the correct customer_sk for a given customer_id and transaction date.
    Returns the surrogate key of the version that was active on txn_date.
    """
    if customer_id == "UNKNOWN" or pd.isna(customer_id):
        return -1  # unknown customer sentinel

    matches = dim_customer[dim_customer["customer_id"] == customer_id]
    if matches.empty:
        return -1

    txn_ts = pd.Timestamp(txn_date)
    for _, row in matches.iterrows():
        vf = row["valid_from"]
        vt = row["valid_to"]
        if pd.isna(vt):
            vt = pd.Timestamp("2099-12-31")
        if vf <= txn_ts <= vt:
            return int(row["customer_sk"])

    # Fallback: return the current version
    current = matches[matches["is_current"] == True]
    if not current.empty:
        return int(current.iloc[0]["customer_sk"])

    return int(matches.iloc[0]["customer_sk"])


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("📋 SCD TYPE 2 — dim_customer Builder")
    print("=" * 60)

    dim_cust = build_dim_customer_scd2()
    save_dim_customer(dim_cust)

    # Show sample
    print("\n📊 Sample rows (customers with city change):")
    scd_ids = list(SCD_MAP.keys())[:3]
    sample = dim_cust[dim_cust["customer_id"].isin(scd_ids)]
    print(sample.to_string(index=False))

    print(f"\n{'=' * 60}")
    print("✅ SCD Type 2 complete!")
    print(f"{'=' * 60}")
