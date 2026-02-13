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
    demand_multiplier, CATEGORY_SEASONAL, all_dates,
    customer_city_at,
)

# ── Payment methods ─────────────────────────────────────────────────
PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card", "COD", "Net Banking"]
PAYMENT_WEIGHTS = [0.40, 0.25, 0.20, 0.10, 0.05]


# ══════════════════════════════════════════════════════════════════════
# 2. GENERATE WEB ORDERS — date-driven demand model
# ══════════════════════════════════════════════════════════════════════

BASE_ORDERS_PER_DAY = 20   # ~20 orders/day × 762 days ≈ 15,000 orders
records = []

print("🌐 Generating web orders (flat JSON)…")

order_counter = 0

for current_date in all_dates:
    # Web has slightly different patterns — more weekday orders (office browsing)
    day_mult = demand_multiplier(current_date)
    # Web gets a weekday boost (online shopping during work hours)
    if current_date.weekday() < 5:
        day_mult *= 1.10
    # Web gets flash sale boosts on specific days
    if current_date.day in (11, 12) and current_date.month in (1, 7, 11):
        day_mult *= 1.5   # "Big Billion" / "Republic Day" style flash sales

    n_orders = max(1, int(BASE_ORDERS_PER_DAY * day_mult + random.gauss(0, 3)))

    for _ in range(n_orders):
        order_counter += 1
        order_id = f"WEB-{order_counter:06d}"

        # pick a random customer
        cust = random.choice(CUSTOMERS)
        cid = cust["customer_id"]
        cust_city, cust_state = customer_city_at(cid, current_date)

        # pick a product weighted by category demand
        cat_weights = []
        for p in PRODUCTS:
            w = demand_multiplier(current_date, p["category"]) / day_mult
            cat_weights.append(w)
        total_w = sum(cat_weights)
        cat_weights = [w / total_w for w in cat_weights]
        prod_idx = random.choices(range(len(PRODUCTS)), weights=cat_weights, k=1)[0]
        prod = PRODUCTS[prod_idx]

        qty = random.randint(1, 5)
        price_mult = random.uniform(0.85, 1.15)
        # web often has deeper discounts during festive / sale periods
        if current_date.month in (10, 11):
            price_mult *= random.uniform(0.82, 0.95)  # Diwali discounts
        elif current_date.month == 1:
            price_mult *= random.uniform(0.90, 0.98)  # New Year sale

        price = round(prod["base_price"] * price_mult, 2)

        # ── intentional dirty data (~1.5 %) ─────────────────────────
        if random.random() < 0.006:
            price = round(-abs(price), 2)          # negative price
        if random.random() < 0.004:
            qty = random.randint(20, 200)           # abnormal quantity

        total = round(qty * price, 2)

        payment = random.choices(PAYMENT_METHODS, weights=PAYMENT_WEIGHTS, k=1)[0]
        delivery_addr = fake.address().replace("\n", ", ")

        # null customer_id occasionally (~0.5 %)
        record_cid = cid
        if random.random() < 0.005:
            record_cid = None

        record = {
            "order_id":          order_id,
            "order_date":        current_date.strftime("%Y-%m-%d %H:%M:%S"),
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

    if (current_date - START_DATE).days % 200 == 0:
        print(f"   … {(current_date - START_DATE).days}/{TOTAL_DAYS} days "
              f"({order_counter:,} orders so far)")

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
