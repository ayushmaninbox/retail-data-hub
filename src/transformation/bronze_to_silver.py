"""
bronze_to_silver.py
====================
Transforms Bronze-layer Parquet files into Silver-layer cleaned data.

Transformations applied:
  1. Drop exact duplicate rows
  2. Cast dates to datetime, prices to float
  3. Reject rows with unit_price < 0 or quantity < 1
  4. Reject rows with future dates
  5. Fill null customer_id with "UNKNOWN"
  6. Merge POS + Web data into unified sales with a `channel` column

Inputs : data/bronze/pos_sales/pos_sales.parquet
         data/bronze/web_orders/web_orders.parquet
         data/bronze/warehouse/warehouse_inventory.parquet
         data/bronze/warehouse/shipments.parquet

Outputs: data/silver/unified_sales.parquet
         data/silver/warehouse_inventory.parquet
         data/silver/shipments.parquet
         data/silver/rejected_rows.parquet  (quarantine)

Usage:
    python src/transformation/bronze_to_silver.py
"""

import os
import pandas as pd
from datetime import datetime

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BRONZE_DIR = os.path.join(ROOT_DIR, "data", "bronze")
SILVER_DIR = os.path.join(ROOT_DIR, "data", "silver")
os.makedirs(SILVER_DIR, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════

def load_parquet(subdir: str, filename: str) -> pd.DataFrame:
    """Load a Parquet file from Bronze layer."""
    path = os.path.join(BRONZE_DIR, subdir, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Bronze file not found: {path}")
    df = pd.read_parquet(path)
    print(f"  ✓ Loaded {subdir}/{filename}: {len(df):,} rows × {len(df.columns)} cols")
    return df


def save_parquet(df: pd.DataFrame, filename: str) -> str:
    """Save a DataFrame to Silver layer as Parquet."""
    path = os.path.join(SILVER_DIR, filename)
    df.to_parquet(path, index=False, engine="pyarrow")
    print(f"  💾 Saved → {path} ({len(df):,} rows)")
    return path


# ══════════════════════════════════════════════════════════════════════
# 1. CLEAN POS SALES
# ══════════════════════════════════════════════════════════════════════

def clean_pos_sales(df: pd.DataFrame) -> tuple:
    """Clean POS sales: dedupe, reject bad rows, fill nulls."""
    original_len = len(df)
    rejected = []

    # 1a. Drop exact duplicates
    df = df.drop_duplicates()
    dupes_removed = original_len - len(df)

    # 1b. Ensure proper types
    df["invoice_date"] = pd.to_datetime(df["invoice_date"], errors="coerce")
    df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0).astype(int)
    df["total_amount"] = pd.to_numeric(df["total_amount"], errors="coerce")

    # 1c. Reject negative prices
    neg_price = df[df["unit_price"] < 0]
    rejected.append(neg_price.assign(rejection_reason="negative_unit_price", source="pos_sales"))
    df = df[df["unit_price"] >= 0]

    # 1d. Reject quantity < 1
    bad_qty = df[df["quantity"] < 1]
    rejected.append(bad_qty.assign(rejection_reason="quantity_below_1", source="pos_sales"))
    df = df[df["quantity"] >= 1]

    # 1e. Reject future dates
    today = pd.Timestamp.now()
    future = df[df["invoice_date"] > today]
    rejected.append(future.assign(rejection_reason="future_date", source="pos_sales"))
    df = df[df["invoice_date"] <= today]

    # 1f. Reject NaT dates
    nat_dates = df[df["invoice_date"].isna()]
    rejected.append(nat_dates.assign(rejection_reason="invalid_date", source="pos_sales"))
    df = df[df["invoice_date"].notna()]

    # 1g. Fill null customer_id with "UNKNOWN"
    null_cust = df["customer_id"].isna() | df["customer_id"].astype(str).isin(["None", "nan", ""])
    df.loc[null_cust, "customer_id"] = "UNKNOWN"

    # 1h. Recalculate total_amount for consistency
    df["total_amount"] = (df["quantity"] * df["unit_price"]).round(2)

    # Add channel column
    df["channel"] = "POS"

    # Standardise column names for merge
    df = df.rename(columns={
        "invoice_no": "transaction_id",
        "invoice_date": "transaction_date",
        "store_city": "city",
    })

    rejected_df = pd.concat([r for r in rejected if len(r) > 0], ignore_index=True) if any(len(r) > 0 for r in rejected) else pd.DataFrame()

    print(f"    POS: {original_len:,} raw → {len(df):,} clean "
          f"(dupes={dupes_removed}, rejected={len(rejected_df)})")

    return df, rejected_df


# ══════════════════════════════════════════════════════════════════════
# 2. CLEAN WEB ORDERS
# ══════════════════════════════════════════════════════════════════════

def clean_web_orders(df: pd.DataFrame) -> tuple:
    """Clean web orders: dedupe, reject bad rows, fill nulls."""
    original_len = len(df)
    rejected = []

    # 2a. Drop exact duplicates
    df = df.drop_duplicates()
    dupes_removed = original_len - len(df)

    # 2b. Ensure proper types
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
    df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0).astype(int)
    df["total_amount"] = pd.to_numeric(df["total_amount"], errors="coerce")

    # 2c. Reject negative prices
    neg_price = df[df["unit_price"] < 0]
    rejected.append(neg_price.assign(rejection_reason="negative_unit_price", source="web_orders"))
    df = df[df["unit_price"] >= 0]

    # 2d. Reject quantity < 1
    bad_qty = df[df["quantity"] < 1]
    rejected.append(bad_qty.assign(rejection_reason="quantity_below_1", source="web_orders"))
    df = df[df["quantity"] >= 1]

    # 2e. Reject future dates
    today = pd.Timestamp.now()
    future = df[df["order_date"] > today]
    rejected.append(future.assign(rejection_reason="future_date", source="web_orders"))
    df = df[df["order_date"] <= today]

    # 2f. Reject NaT dates
    nat_dates = df[df["order_date"].isna()]
    rejected.append(nat_dates.assign(rejection_reason="invalid_date", source="web_orders"))
    df = df[df["order_date"].notna()]

    # 2g. Fill null customer_id with "UNKNOWN"
    null_cust = df["customer_id"].isna() | df["customer_id"].astype(str).isin(["None", "nan", ""])
    df.loc[null_cust, "customer_id"] = "UNKNOWN"

    # 2h. Recalculate total_amount
    df["total_amount"] = (df["quantity"] * df["unit_price"]).round(2)

    # Add channel column
    df["channel"] = "Web"

    # Standardise column names for merge
    df = df.rename(columns={
        "order_id": "transaction_id",
        "order_date": "transaction_date",
        "customer_city": "city",
    })

    rejected_df = pd.concat([r for r in rejected if len(r) > 0], ignore_index=True) if any(len(r) > 0 for r in rejected) else pd.DataFrame()

    print(f"    Web: {original_len:,} raw → {len(df):,} clean "
          f"(dupes={dupes_removed}, rejected={len(rejected_df)})")

    return df, rejected_df


# ══════════════════════════════════════════════════════════════════════
# 3. CLEAN WAREHOUSE INVENTORY
# ══════════════════════════════════════════════════════════════════════

def clean_inventory(df: pd.DataFrame) -> pd.DataFrame:
    """Clean warehouse inventory snapshots."""
    original_len = len(df)
    df = df.drop_duplicates()
    df["snapshot_date"] = pd.to_datetime(df["snapshot_date"], errors="coerce")
    df["quantity_on_hand"] = pd.to_numeric(df["quantity_on_hand"], errors="coerce").fillna(0).astype(int)
    df["reorder_level"] = pd.to_numeric(df["reorder_level"], errors="coerce").fillna(0).astype(int)
    df["unit_cost"] = pd.to_numeric(df["unit_cost"], errors="coerce")
    df = df[df["snapshot_date"].notna()]

    print(f"    Inventory: {original_len:,} raw → {len(df):,} clean")
    return df


# ══════════════════════════════════════════════════════════════════════
# 4. CLEAN SHIPMENTS
# ══════════════════════════════════════════════════════════════════════

def clean_shipments(df: pd.DataFrame) -> pd.DataFrame:
    """Clean shipment records."""
    original_len = len(df)
    df = df.drop_duplicates()
    df["ship_date"] = pd.to_datetime(df["ship_date"], errors="coerce")
    df["delivery_date"] = pd.to_datetime(df["delivery_date"], errors="coerce")

    # Calculate delivery_days where both dates exist
    mask = df["delivery_date"].notna() & df["ship_date"].notna()
    df.loc[mask, "delivery_days"] = (df.loc[mask, "delivery_date"] - df.loc[mask, "ship_date"]).dt.days
    df["delivery_days"] = pd.to_numeric(df["delivery_days"], errors="coerce")

    print(f"    Shipments: {original_len:,} raw → {len(df):,} clean")
    return df


# ══════════════════════════════════════════════════════════════════════
# 5. MERGE POS + WEB → UNIFIED SALES
# ══════════════════════════════════════════════════════════════════════

def merge_sales(pos_df: pd.DataFrame, web_df: pd.DataFrame) -> pd.DataFrame:
    """Merge cleaned POS + Web sales into unified sales table."""
    # Select common columns for the merge
    common_cols = [
        "transaction_id", "transaction_date", "store_id", "city",
        "customer_id", "product_id", "product_name", "category",
        "quantity", "unit_price", "total_amount", "channel",
    ]

    # POS has store_id, Web may not — fill Web store_id with "WEB-ONLINE"
    if "store_id" not in web_df.columns:
        web_df["store_id"] = "WEB-ONLINE"

    pos_cols = [c for c in common_cols if c in pos_df.columns]
    web_cols = [c for c in common_cols if c in web_df.columns]

    unified = pd.concat([pos_df[pos_cols], web_df[web_cols]], ignore_index=True)

    # Sort by date
    unified = unified.sort_values("transaction_date").reset_index(drop=True)

    # Add surrogate row key
    unified.insert(0, "sale_id", range(1, len(unified) + 1))

    print(f"    Unified: {len(unified):,} total sales ({pos_df.shape[0]:,} POS + {web_df.shape[0]:,} Web)")
    return unified


# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def run_bronze_to_silver():
    """Execute the full Bronze → Silver transformation pipeline."""
    print("=" * 60)
    print("🔄 BRONZE → SILVER TRANSFORMATION")
    print("=" * 60)

    # ── Load Bronze data ─────────────────────────────────────────
    print("\n📂 Loading Bronze layer …")
    pos_df = load_parquet("pos_sales", "pos_sales.parquet")
    web_df = load_parquet("web_orders", "web_orders.parquet")
    inv_df = load_parquet("warehouse", "warehouse_inventory.parquet")
    ship_df = load_parquet("warehouse", "shipments.parquet")

    # ── Clean ────────────────────────────────────────────────────
    print("\n🧹 Cleaning data …")
    pos_clean, pos_rejected = clean_pos_sales(pos_df)
    web_clean, web_rejected = clean_web_orders(web_df)
    inv_clean = clean_inventory(inv_df)
    ship_clean = clean_shipments(ship_df)

    # ── Merge POS + Web ──────────────────────────────────────────
    print("\n🔗 Merging POS + Web into unified sales …")
    unified = merge_sales(pos_clean, web_clean)

    # ── Save Silver ──────────────────────────────────────────────
    print("\n💾 Saving Silver layer …")
    save_parquet(unified, "unified_sales.parquet")
    save_parquet(inv_clean, "warehouse_inventory.parquet")
    save_parquet(ship_clean, "shipments.parquet")

    # ── Save rejected rows (quarantine) ──────────────────────────
    all_rejected = pd.concat(
        [r for r in [pos_rejected, web_rejected] if len(r) > 0],
        ignore_index=True,
    ) if any(len(r) > 0 for r in [pos_rejected, web_rejected]) else pd.DataFrame()

    if len(all_rejected) > 0:
        save_parquet(all_rejected, "rejected_rows.parquet")

    # ── Summary ──────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"✅ Bronze → Silver complete!")
    print(f"   Unified sales  : {len(unified):,} rows")
    print(f"   Inventory       : {len(inv_clean):,} rows")
    print(f"   Shipments       : {len(ship_clean):,} rows")
    print(f"   Rejected (quarantine): {len(all_rejected):,} rows")
    print(f"{'=' * 60}")

    return {
        "unified_sales": unified,
        "inventory": inv_clean,
        "shipments": ship_clean,
        "rejected": all_rejected,
    }


if __name__ == "__main__":
    run_bronze_to_silver()
