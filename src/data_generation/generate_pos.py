"""
generate_pos.py
===============
Generates realistic POS (Point-of-Sale) transaction data for 50+ retail stores
across 10 Indian cities.

Output : data/raw/pos_sales.csv
Rows   : ~50,000 line-item records grouped into ~12,000 invoices
Columns: invoice_no, invoice_date, store_id, store_city, customer_id,
         product_id, product_name, category, quantity, unit_price, total_amount
"""

import os
import random
import string
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

# ══════════════════════════════════════════════════════════════════════
# 1. SHARED UNIVERSE — cities, stores, products, customers
# ══════════════════════════════════════════════════════════════════════

CITIES = {
    "Mumbai":     "Maharashtra",
    "Delhi":      "Delhi",
    "Bangalore":  "Karnataka",
    "Chennai":    "Tamil Nadu",
    "Hyderabad":  "Telangana",
    "Pune":       "Maharashtra",
    "Kolkata":    "West Bengal",
    "Ahmedabad":  "Gujarat",
    "Jaipur":     "Rajasthan",
    "Lucknow":    "Uttar Pradesh",
}

# 5 stores per city → 50 stores
STORES = []
for city in CITIES:
    prefix = city[:3].upper()
    for i in range(1, 6):
        STORES.append({
            "store_id": f"STR-{prefix}-{i:02d}",
            "city": city,
            "state": CITIES[city],
        })

STORE_DF = pd.DataFrame(STORES)

# ── product catalog (~200 items) ────────────────────────────────────
CATEGORIES = {
    "Electronics":     (1500, 50000, 30),
    "Clothing":        (299,  5999,  30),
    "Groceries":       (10,   999,   30),
    "Home & Kitchen":  (149,  14999, 25),
    "Beauty":          (99,   4999,  25),
    "Sports":          (199,  9999,  20),
    "Books":           (99,   1999,  20),
    "Toys":            (149,  3999,  20),
}

PRODUCT_NAMES = {
    "Electronics":    ["Bluetooth Speaker", "Wireless Earbuds", "USB-C Hub", "Power Bank 20000mAh",
                       "Smartwatch Band", "LED Desk Lamp", "Webcam HD", "Portable SSD 512GB",
                       "Keyboard Mechanical", "Mouse Wireless", "HDMI Cable 2m", "Phone Stand",
                       "Screen Protector", "Laptop Sleeve 15in", "Charger 65W GaN",
                       "Surge Protector 6-Way", "Ethernet Cable 5m", "Pen Drive 64GB",
                       "Portable Monitor 15in", "Noise Cancelling Headphones",
                       "Smart Plug WiFi", "Ring Light 10in", "Car Phone Mount",
                       "Streaming Stick", "Digital Alarm Clock",
                       "Tablet Stand Adjustable", "Cable Organiser Box", "Mini Projector",
                       "Fitness Tracker", "Wireless Charging Pad"],
    "Clothing":       ["Cotton T-Shirt", "Slim Fit Jeans", "Formal Shirt", "Kurta Set",
                       "Track Pants", "Hoodie Zip-Up", "Polo T-Shirt", "Chino Trousers",
                       "Denim Jacket", "Linen Shirt", "Cargo Shorts", "Ethnic Dupatta",
                       "Winter Sweater", "Cotton Saree", "Running Shorts",
                       "Sweatshirt Crew Neck", "Palazzo Pants", "Printed Kurti",
                       "Formal Blazer", "Raincoat Foldable",
                       "Thermal Innerwear", "Silk Scarf", "Gym Tank Top",
                       "Oxford Shirt", "Maxi Dress",
                       "Bermuda Shorts", "Lehenga Choli", "Kids T-Shirt Pack",
                       "Night Suit", "Dhoti Cotton"],
    "Groceries":      ["Basmati Rice 5kg", "Toor Dal 1kg", "Sunflower Oil 1L", "Sugar 1kg",
                       "Wheat Flour 5kg", "Green Tea 100bags", "Honey Organic 500g", "Oats 1kg",
                       "Peanut Butter 400g", "Instant Noodles 12pk", "Pasta Penne 500g", "Olive Oil 500ml",
                       "Black Pepper 100g", "Turmeric Powder 200g", "Cumin Seeds 100g",
                       "Coconut Oil 1L", "Ghee 500ml", "Milk Powder 500g",
                       "Mixed Dry Fruits 500g", "Dark Chocolate 200g",
                       "Cornflakes 500g", "Muesli 1kg", "Biscuit Variety Pack",
                       "Pickle Mango 500g", "Papad 200g",
                       "Jaggery 1kg", "Rock Salt 1kg", "Saffron 1g",
                       "Cashew Nuts 250g", "Almonds 250g"],
    "Home & Kitchen": ["Non-Stick Pan 24cm", "Pressure Cooker 5L", "Glass Storage Set",
                       "Cotton Bedsheet King", "Pillow Memory Foam", "Mop Spin Bucket",
                       "Curtains Blackout 2pc", "Dinner Set 24pc", "Knife Set 6pc",
                       "Water Bottle Steel 1L", "Lunch Box 3-Tier", "Blender 750W",
                       "Towel Set Bath 4pc", "Chopping Board Bamboo", "Spice Rack 16pc",
                       "Door Mat Coir", "Wall Clock Minimalist", "Photo Frame Set 5pc",
                       "Laundry Basket Foldable", "Iron Steam 1200W",
                       "Vacuum Flask 1L", "Cushion Cover Set 5pc", "Table Lamp Ceramic",
                       "Dustbin Pedal 12L", "Mixing Bowl Set 3pc"],
    "Beauty":         ["Face Wash Gel 100ml", "Moisturiser SPF 30", "Sunscreen SPF 50 50ml",
                       "Lip Balm Tinted", "Hair Oil Coconut 200ml", "Shampoo Anti-Dandruff 300ml",
                       "Conditioner Keratin 200ml", "Face Mask Sheet 5pk", "Kajal Waterproof",
                       "Compact Powder", "Foundation Liquid 30ml", "Nail Polish Set 6pc",
                       "Perfume EDT 100ml", "Deodorant Roll-On", "Body Lotion 400ml",
                       "Hand Cream 75ml", "Facial Serum Vitamin C", "Makeup Remover 150ml",
                       "Beard Oil 50ml", "Hair Gel Strong Hold",
                       "Eyeshadow Palette 12pc", "Mascara Volumising",
                       "Lipstick Matte", "Face Scrub 100g", "Bath Bombs Set 4pc"],
    "Sports":         ["Yoga Mat 6mm", "Resistance Bands Set", "Skipping Rope Speed",
                       "Water Bottle Gym 750ml", "Cricket Bat English Willow", "Badminton Racquet Pair",
                       "Football Size 5", "Table Tennis Paddle", "Cycling Gloves",
                       "Running Armband", "Sports Shoes Running", "Gym Bag Duffle",
                       "Sweatband Wrist 2pc", "Foam Roller 45cm", "Dumbbells 5kg Pair",
                       "Protein Shaker 700ml", "Swimming Goggles", "Weight Gloves Pair",
                       "Exercise Ball 65cm", "Pull-Up Bar Doorway"],
    "Books":          ["Atomic Habits", "Sapiens", "Ikigai", "The Alchemist",
                       "Rich Dad Poor Dad", "Deep Work", "Python Crash Course",
                       "Wings of Fire APJ Kalam", "Thinking Fast and Slow",
                       "The Psychology of Money", "Zero to One", "The Lean Startup",
                       "12 Rules for Life", "Educated Tara Westover", "Dune Frank Herbert",
                       "Harry Potter Box Set", "The Subtle Art", "Grit Angela Duckworth",
                       "Digital Minimalism", "Meditations Marcus Aurelius"],
    "Toys":           ["LEGO Classic 500pc", "Rubik's Cube 3x3", "Play-Doh 10pk",
                       "Hot Wheels 5 Car Pack", "Board Game Monopoly", "Nerf Blaster",
                       "Jigsaw Puzzle 1000pc", "Chemistry Kit Kids", "Telescope Starter",
                       "Toy Kitchen Set", "Remote Control Car", "Doll House Furniture",
                       "Building Blocks 200pc", "Card Game UNO", "Slime Kit DIY",
                       "Drone Mini Kids", "Art Supplies Box 80pc", "Globe Educational",
                       "Magic Kit 50 Tricks", "Train Set Electric"],
}

PRODUCTS = []
pid = 1
for cat, (lo, hi, count) in CATEGORIES.items():
    names = PRODUCT_NAMES[cat]
    for j in range(min(count, len(names))):
        PRODUCTS.append({
            "product_id": f"P{pid:04d}",
            "product_name": names[j],
            "category": cat,
            "base_price": round(random.uniform(lo, hi), 2),
        })
        pid += 1

PRODUCT_DF = pd.DataFrame(PRODUCTS)

# ── customers (~4,000) ──────────────────────────────────────────────
NUM_CUSTOMERS = 4000

CUSTOMERS = []
city_list = list(CITIES.keys())
for i in range(1, NUM_CUSTOMERS + 1):
    assigned_city = random.choice(city_list)
    CUSTOMERS.append({
        "customer_id": f"CUST-{i:04d}",
        "name": fake.name(),
        "city": assigned_city,
        "state": CITIES[assigned_city],
    })

CUSTOMER_DF = pd.DataFrame(CUSTOMERS)

# ~10 % customers change city halfway (for SCD Type 2)
SCD_CUTOFF = datetime(2024, 7, 1)
SCD_CUSTOMERS = random.sample(range(NUM_CUSTOMERS), k=int(NUM_CUSTOMERS * 0.10))
SCD_MAP = {}
for idx in SCD_CUSTOMERS:
    old_city = CUSTOMERS[idx]["city"]
    new_city = random.choice([c for c in city_list if c != old_city])
    SCD_MAP[CUSTOMERS[idx]["customer_id"]] = {
        "old_city": old_city,
        "new_city": new_city,
        "old_state": CITIES[old_city],
        "new_state": CITIES[new_city],
    }

# ══════════════════════════════════════════════════════════════════════
# 2. DATE RANGE + HELPERS
# ══════════════════════════════════════════════════════════════════════

START_DATE = datetime(2023, 1, 1)
END_DATE = datetime(2025, 1, 31)
TOTAL_DAYS = (END_DATE - START_DATE).days


def random_date():
    """Return a random datetime with weekend + seasonal weighting."""
    while True:
        d = START_DATE + timedelta(days=random.randint(0, TOTAL_DAYS))
        # boost weekends (Sat=5, Sun=6)
        if d.weekday() >= 5 and random.random() < 0.35:
            return d
        # seasonal spikes — Oct-Dec (festive season), Jan (New Year sales)
        if d.month in (10, 11, 12, 1) and random.random() < 0.30:
            return d
        # regular day accepted ~50 %
        if random.random() < 0.50:
            return d


def customer_city_at(cid: str, date: datetime):
    """Return city/state for a customer, accounting for SCD mid-flight changes."""
    base = CUSTOMER_DF.loc[CUSTOMER_DF["customer_id"] == cid].iloc[0]
    if cid in SCD_MAP and date >= SCD_CUTOFF:
        return SCD_MAP[cid]["new_city"], SCD_MAP[cid]["new_state"]
    return base["city"], base["state"]


# ══════════════════════════════════════════════════════════════════════
# 3. GENERATE POS TRANSACTIONS
# ══════════════════════════════════════════════════════════════════════

NUM_INVOICES = 12_000
ROWS = []

print("🧾 Generating POS sales…")

for inv_num in range(1, NUM_INVOICES + 1):
    inv_id = f"INV-{inv_num:06d}"
    inv_date = random_date()

    # pick a random customer + matching store in their city
    cust = random.choice(CUSTOMERS)
    cid = cust["customer_id"]
    cust_city, cust_state = customer_city_at(cid, inv_date)

    # stores in that city
    city_stores = STORE_DF[STORE_DF["city"] == cust_city]["store_id"].tolist()
    store_id = random.choice(city_stores) if city_stores else random.choice(STORE_DF["store_id"].tolist())

    # 1–6 line items per invoice
    n_items = random.randint(1, 6)
    chosen_products = random.sample(PRODUCTS, k=min(n_items, len(PRODUCTS)))

    for prod in chosen_products:
        qty = random.randint(1, 10)
        price = round(prod["base_price"] * random.uniform(0.85, 1.15), 2)

        # ── intentional dirty data (~0.5 %) ─────────────────────────
        if random.random() < 0.005:
            price = round(-abs(price), 2)  # negative price
        if random.random() < 0.003:
            cid = None                      # null customer_id

        total = round(qty * price, 2)

        ROWS.append({
            "invoice_no":    inv_id,
            "invoice_date":   inv_date.strftime("%Y-%m-%d %H:%M:%S"),
            "store_id":       store_id,
            "store_city":     cust_city,
            "customer_id":    cid,
            "product_id":     prod["product_id"],
            "product_name":   prod["product_name"],
            "category":       prod["category"],
            "quantity":       qty,
            "unit_price":     price,
            "total_amount":   total,
        })

    if inv_num % 3000 == 0:
        print(f"   … {inv_num}/{NUM_INVOICES} invoices")

# ── write CSV ────────────────────────────────────────────────────────
df = pd.DataFrame(ROWS)
out_path = os.path.join(RAW_DIR, "pos_sales.csv")
df.to_csv(out_path, index=False)

print(f"✅ POS sales saved → {out_path}")
print(f"   Rows : {len(df):,}")
print(f"   Invoices : {df['invoice_no'].nunique():,}")
print(f"   Customers: {df['customer_id'].nunique():,}")
print(f"   Products : {df['product_id'].nunique():,}")
print(f"   Cities   : {df['store_city'].nunique()}")
print(f"   Date range: {df['invoice_date'].min()} → {df['invoice_date'].max()}")
