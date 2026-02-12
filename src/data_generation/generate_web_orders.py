"""
generate_web_orders.py
======================
Generates realistic e-commerce order data as flat JSON records
simulating an online retail platform.

Output : data/raw/web_orders.json
Records: ~15,000 order line-items (flat, one product per record)
Columns: order_id, order_date, customer_id, customer_name, customer_city,
         product_id, product_name, category, quantity, unit_price,
         total_amount, payment_method, delivery_address
"""

import os
import sys
import json
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
    CITIES, PRODUCTS, CUSTOMERS, CUSTOMER_DF,
    SCD_MAP, SCD_CUTOFF, START_DATE, END_DATE, TOTAL_DAYS,
)

# ══════════════════════════════════════════════════════════════════════
# 1. HELPERS
# ══════════════════════════════════════════════════════════════════════

PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card", "COD", "Net Banking"]
PAYMENT_WEIGHTS = [0.40, 0.25, 0.20, 0.10, 0.05]


def random_date_web():
    """Weighted random date — heavier on weekends + festive months."""
    while True:
        d = START_DATE + timedelta(days=random.randint(0, TOTAL_DAYS))
        if d.weekday() >= 5 and random.random() < 0.35:
            return d
        if d.month in (10, 11, 12, 1) and random.random() < 0.30:
            return d
        if random.random() < 0.50:
            return d


def customer_city_at(cid: str, date: datetime):
    """Return city/state for a customer, accounting for SCD."""
    base = CUSTOMER_DF.loc[CUSTOMER_DF["customer_id"] == cid].iloc[0]
    if cid in SCD_MAP and date >= SCD_CUTOFF:
        return SCD_MAP[cid]["new_city"], SCD_MAP[cid]["new_state"]
    return base["city"], base["state"]


# ══════════════════════════════════════════════════════════════════════
# 2. GENERATE WEB ORDERS — flat format, one record per line item
# ══════════════════════════════════════════════════════════════════════

NUM_ORDERS = 15_000
records = []

print("🌐 Generating web orders (flat JSON)…")

for i in range(1, NUM_ORDERS + 1):
    order_id = f"WEB-{i:06d}"
    order_date = random_date_web()

    # pick a random customer
    cust = random.choice(CUSTOMERS)
    cid = cust["customer_id"]
    cust_city, cust_state = customer_city_at(cid, order_date)

    # pick a random product
    prod = random.choice(PRODUCTS)
    qty = random.randint(1, 5)
    price = round(prod["base_price"] * random.uniform(0.85, 1.15), 2)

    # intentional dirty data (~0.4 %)
    if random.random() < 0.004:
        price = round(-abs(price), 2)

    total = round(qty * price, 2)

    payment = random.choices(PAYMENT_METHODS, weights=PAYMENT_WEIGHTS, k=1)[0]
    delivery_addr = fake.address().replace("\n", ", ")

    # null customer_id occasionally (~0.3 %)
    record_cid = cid
    if random.random() < 0.003:
        record_cid = None

    record = {
        "order_id":          order_id,
        "order_date":        order_date.strftime("%Y-%m-%d %H:%M:%S"),
        "customer_id":       record_cid,
        "customer_name":     cust["name"],
        "customer_city":     cust_city,
        "product_id":        prod["product_id"],
        "product_name":      prod["product_name"],
        "category":          prod["category"],
        "quantity":          qty,
        "unit_price":        price,
        "total_amount":      total,
        "payment_method":    payment,
        "delivery_address":  delivery_addr,
    }

    records.append(record)

    if i % 5000 == 0:
        print(f"   … {i}/{NUM_ORDERS} orders")

# ── write JSON ───────────────────────────────────────────────────────
out_path = os.path.join(RAW_DIR, "web_orders.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

# ── summary stats ────────────────────────────────────────────────────
unique_customers = len({r["customer_id"] for r in records if r["customer_id"]})
payment_counts = pd.Series([r["payment_method"] for r in records]).value_counts()

print(f"\n✅ Web orders saved → {out_path}")
print(f"   Records    : {len(records):,}")
print(f"   Customers  : {unique_customers:,}")
print(f"   Date range : {records[0]['order_date'][:10]} → {records[-1]['order_date'][:10]}")
print(f"   Payment mix:")
for pm, cnt in payment_counts.items():
    print(f"      {pm:15s} {cnt:,}  ({cnt/len(records)*100:.1f}%)")
