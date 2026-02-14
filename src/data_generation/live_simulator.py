"""
live_simulator.py
=================
Generates synthetic POS transactions in real-time (one every 2–3 seconds)
and sends them to the FastAPI WebSocket endpoint for live dashboard updates.

Usage:
    python3 src/data_generation/live_simulator.py

Reuses the product/store/customer universe from generate_pos.py.
Periodically injects anomalies and fraud signals for demo effect.
"""

import asyncio
import json
import random
import signal
import sys
import os
from datetime import datetime, timedelta

# ── Reuse the shared universe from generate_pos ────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

try:
    import websockets
except ImportError:
    print("❌ websockets package not installed. Run: pip install websockets")
    sys.exit(1)

# ── Simplified product/store/customer universe ─────────────────────
CITIES = [
    ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bangalore", "Karnataka"),
    ("Chennai", "Tamil Nadu"), ("Kolkata", "West Bengal"), ("Hyderabad", "Telangana"),
    ("Pune", "Maharashtra"), ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"),
]

CATEGORIES = {
    "Electronics":     (499, 49999),
    "Clothing":        (199, 4999),
    "Groceries":       (10, 999),
    "Home & Kitchen":  (149, 14999),
    "Beauty":          (99, 4999),
    "Sports":          (199, 9999),
    "Books":           (99, 1999),
    "Toys":            (149, 3999),
}

PRODUCTS = {
    "Electronics": ["Bluetooth Speaker", "Wireless Earbuds", "USB-C Hub", "Power Bank 20000mAh",
                    "Smartwatch Band", "LED Desk Lamp", "Webcam HD", "Portable SSD 512GB"],
    "Clothing": ["Cotton T-Shirt", "Slim Fit Jeans", "Formal Shirt", "Kurta Set",
                 "Track Pants", "Hoodie Zip-Up", "Polo T-Shirt", "Chino Trousers"],
    "Groceries": ["Basmati Rice 5kg", "Toor Dal 1kg", "Sunflower Oil 1L", "Sugar 1kg",
                  "Wheat Flour 5kg", "Green Tea 100bags", "Honey Organic 500g", "Oats 1kg"],
    "Home & Kitchen": ["Non-Stick Pan 24cm", "Pressure Cooker 5L", "Glass Storage Set",
                       "Cotton Bedsheet King", "Pillow Memory Foam", "Mop Spin Bucket"],
    "Beauty": ["Face Wash Gel 100ml", "Moisturiser SPF 30", "Sunscreen SPF 50",
               "Lip Balm Tinted", "Hair Oil Coconut 200ml", "Shampoo Anti-Dandruff 300ml"],
    "Sports": ["Yoga Mat 6mm", "Resistance Bands Set", "Cricket Ball Cork", "Badminton Racket"],
    "Books": ["Atomic Habits", "Sapiens", "Ikigai", "The Alchemist", "Rich Dad Poor Dad"],
    "Toys": ["LEGO Classic Set", "RC Car 4x4", "Board Game Chess", "Building Blocks 200pc"],
}

STORES = [f"STR-{city[:3].upper()}-{i:02d}" for city, _ in CITIES for i in range(1, 6)]
CUSTOMERS = [f"CUST-{i:05d}" for i in range(1, 4001)]
CHANNELS = ["POS", "Web"]

# WS_URL can be set via environment variable for cloud demo syncing
WS_URL = os.getenv("WS_URL", "ws://localhost:8000/ws/simulator")

# ── Transaction Generator ──────────────────────────────────────────

def generate_transaction(inject_anomaly=False, inject_fraud=False):
    """Generate a single realistic POS transaction."""
    category = random.choice(list(CATEGORIES.keys()))
    lo, hi = CATEGORIES[category]
    product = random.choice(PRODUCTS[category])
    city, state = random.choice(CITIES)
    store = random.choice([s for s in STORES if city[:3].upper() in s])
    customer = random.choice(CUSTOMERS)
    channel = random.choice(CHANNELS)

    quantity = random.randint(1, 5)
    unit_price = round(random.uniform(lo, hi), 2)

    # Inject anomaly: spike quantity
    if inject_anomaly:
        quantity = random.randint(50, 200)

    # Inject fraud: suspiciously low price
    if inject_fraud:
        unit_price = round(unit_price * 0.1, 2)  # 90% off

    total = round(quantity * unit_price, 2)

    event_type = "normal"
    if inject_anomaly:
        event_type = "anomaly"
    elif inject_fraud:
        event_type = "fraud"

    return {
        "event_type": event_type,
        "transaction_id": f"LIVE-{datetime.now().strftime('%H%M%S')}-{random.randint(1000, 9999)}",
        "timestamp": datetime.now().isoformat(),
        "customer_id": customer,
        "store_id": store,
        "city": city,
        "state": state,
        "channel": channel,
        "product_name": product,
        "category": category,
        "quantity": quantity,
        "unit_price": unit_price,
        "total_amount": total,
    }


# ── Main Loop ──────────────────────────────────────────────────────

async def run_simulator():
    print("=" * 60)
    print("⚡ LIVE TRANSACTION SIMULATOR")
    print("=" * 60)
    print(f"\n🔌 Connecting to {WS_URL} …")

    retry_count = 0
    max_retries = 10

    while retry_count < max_retries:
        try:
            async with websockets.connect(WS_URL) as ws:
                print("✅ Connected! Generating live transactions …")
                print("   Press Ctrl+C to stop.\n")
                retry_count = 0
                tx_count = 0

                while True:
                    tx_count += 1

                    # Every ~15th transaction, inject an anomaly
                    inject_anomaly = (tx_count % 15 == 0)
                    # Every ~25th transaction, inject a fraud signal
                    inject_fraud = (tx_count % 25 == 0) and not inject_anomaly

                    txn = generate_transaction(inject_anomaly, inject_fraud)

                    await ws.send(json.dumps(txn))

                    emoji = {"normal": "🟢", "anomaly": "🟡", "fraud": "🔴"}.get(txn["event_type"], "⚪")
                    print(f"  {emoji} #{tx_count} | {txn['event_type'].upper():8s} | {txn['product_name']:28s} | ₹{txn['total_amount']:>10,.2f} | {txn['city']}")

                    await asyncio.sleep(random.uniform(2.0, 3.5))

        except (ConnectionRefusedError, OSError) as e:
            retry_count += 1
            print(f"\n⏳ API not ready (attempt {retry_count}/{max_retries}). Retrying in 3s …")
            await asyncio.sleep(3)
        except websockets.exceptions.ConnectionClosed:
            retry_count += 1
            print(f"\n🔄 Connection lost (attempt {retry_count}/{max_retries}). Reconnecting in 2s …")
            await asyncio.sleep(2)
        except KeyboardInterrupt:
            print("\n\n🛑 Simulator stopped.")
            break

    if retry_count >= max_retries:
        print(f"\n❌ Could not connect after {max_retries} attempts. Is the API running?")


if __name__ == "__main__":
    try:
        asyncio.run(run_simulator())
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")
