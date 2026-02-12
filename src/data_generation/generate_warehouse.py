"""
generate_warehouse.py
=====================
Generates warehouse inventory snapshots and shipment/delivery records.

Outputs:
  - data/raw/warehouse_inventory.csv  (~50,000 rows — monthly snapshots)
  - data/raw/shipments.csv            (~8,000 shipment records)
"""

import os
import sys
import random
from datetime import datetime, timedelta

import pandas as pd
from faker import Faker

# ── deterministic seed ──────────────────────────────────────────────
SEED = 42
random.seed(SEED)
fake = Faker("en_IN")
Faker.seed(SEED)

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW_DIR = os.path.join(ROOT_DIR, "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)

# ── import shared universe from generate_pos ────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
from generate_pos import (
    CITIES, STORES, STORE_DF, PRODUCTS, PRODUCT_DF,
    START_DATE, END_DATE,
)

# ══════════════════════════════════════════════════════════════════════
# 1. WAREHOUSE INVENTORY — monthly snapshots
# ══════════════════════════════════════════════════════════════════════

CARRIERS = [
    "Delhivery", "BlueDart", "DTDC", "Ecom Express",
    "Shadowfax", "XpressBees", "India Post",
]

print("📦 Generating warehouse inventory snapshots…")

# generate 1st-of-month dates from Jan 2023 → Jan 2025 (25 snapshots)
snapshot_dates = []
d = datetime(2023, 1, 1)
while d <= datetime(2025, 1, 1):
    snapshot_dates.append(d)
    if d.month == 12:
        d = datetime(d.year + 1, 1, 1)
    else:
        d = datetime(d.year, d.month + 1, 1)

INVENTORY_ROWS = []

for snap_date in snapshot_dates:
    for store in STORES:
        # each store stocks ~40 random products per snapshot
        stocked = random.sample(PRODUCTS, k=40)
        for prod in stocked:
            stock = random.randint(0, 500)

            # ~5 % stockout (stock = 0)
            if random.random() < 0.05:
                stock = 0

            reorder = random.randint(10, 50)
            cost = round(prod["base_price"] * random.uniform(0.60, 0.80), 2)

            INVENTORY_ROWS.append({
                "snapshot_date":    snap_date.strftime("%Y-%m-%d"),
                "store_id":         store["store_id"],
                "store_city":       store["city"],
                "product_id":       prod["product_id"],
                "product_name":     prod["product_name"],
                "category":         prod["category"],
                "quantity_on_hand": stock,
                "reorder_level":    reorder,
                "unit_cost":        cost,
            })

    if snap_date.month % 6 == 0:
        print(f"   … snapshot {snap_date.strftime('%Y-%m')}")

inv_df = pd.DataFrame(INVENTORY_ROWS)
inv_path = os.path.join(RAW_DIR, "warehouse_inventory.csv")
inv_df.to_csv(inv_path, index=False)

print(f"✅ Inventory saved → {inv_path}")
print(f"   Rows      : {len(inv_df):,}")
print(f"   Snapshots : {inv_df['snapshot_date'].nunique()}")
print(f"   Stores    : {inv_df['store_id'].nunique()}")
print(f"   Products  : {inv_df['product_id'].nunique()}")
stockout_pct = (inv_df["quantity_on_hand"] == 0).mean() * 100
print(f"   Stockout % : {stockout_pct:.1f}%")

# ══════════════════════════════════════════════════════════════════════
# 2. SHIPMENTS — delivery records
# ══════════════════════════════════════════════════════════════════════

print("\n🚚 Generating shipments…")

NUM_SHIPMENTS = 8_000
STATUSES = ["Delivered", "In Transit", "Delayed", "Returned"]
STATUS_WEIGHTS = [0.90, 0.05, 0.03, 0.02]

city_list = list(CITIES.keys())
SHIP_ROWS = []

for i in range(1, NUM_SHIPMENTS + 1):
    ship_id = f"SHP-{i:06d}"
    order_id = f"WEB-{random.randint(1, 15000):06d}"  # link to web orders

    # pick origin store + destination city
    origin_store = random.choice(STORES)
    dest_city = random.choice(city_list)

    # ship date: random within date range
    days_offset = random.randint(0, (END_DATE - START_DATE).days)
    ship_date = START_DATE + timedelta(days=days_offset)

    # delivery gap: 1–5 days normal, 6–14 days for bottleneck routes (~15%)
    if random.random() < 0.15:
        gap = random.randint(7, 14)  # intentional bottleneck
    else:
        gap = random.randint(1, 5)

    delivery_date = ship_date + timedelta(days=gap)

    status = random.choices(STATUSES, weights=STATUS_WEIGHTS, k=1)[0]

    # if "In Transit", delivery_date should be None
    if status == "In Transit":
        delivery_date_str = None
    else:
        delivery_date_str = delivery_date.strftime("%Y-%m-%d")

    carrier = random.choice(CARRIERS)

    SHIP_ROWS.append({
        "shipment_id":      ship_id,
        "order_id":         order_id,
        "origin_store":     origin_store["store_id"],
        "destination_city": dest_city,
        "ship_date":        ship_date.strftime("%Y-%m-%d"),
        "delivery_date":    delivery_date_str,
        "status":           status,
        "carrier":          carrier,
    })

    if i % 2000 == 0:
        print(f"   … {i}/{NUM_SHIPMENTS} shipments")

ship_df = pd.DataFrame(SHIP_ROWS)
ship_path = os.path.join(RAW_DIR, "shipments.csv")
ship_df.to_csv(ship_path, index=False)

# stats
delivered = ship_df[ship_df["status"] == "Delivered"]
status_counts = ship_df["status"].value_counts()

print(f"\n✅ Shipments saved → {ship_path}")
print(f"   Rows       : {len(ship_df):,}")
print(f"   Carriers   : {ship_df['carrier'].nunique()}")
print(f"   Status mix :")
for st, cnt in status_counts.items():
    print(f"      {st:12s} {cnt:,}  ({cnt/len(ship_df)*100:.1f}%)")

# delivery time stats (delivered only)
if not delivered.empty:
    delivered = delivered.copy()
    delivered["ship_dt"] = pd.to_datetime(delivered["ship_date"])
    delivered["del_dt"] = pd.to_datetime(delivered["delivery_date"])
    delivered["days"] = (delivered["del_dt"] - delivered["ship_dt"]).dt.days
    avg_days = delivered["days"].mean()
    bottleneck = (delivered["days"] >= 7).mean() * 100
    print(f"   Avg delivery: {avg_days:.1f} days")
    print(f"   Bottleneck %: {bottleneck:.1f}% (≥7 days)")

print("\n🎉 Phase 1 warehouse generation complete!")
