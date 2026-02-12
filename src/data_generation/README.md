# 📁 src/data_generation/

## Purpose
Scripts to create realistic retail data that simulates 3 separate business systems. Uses the **UCI Online Retail** dataset as a base and **Faker** library for synthetic data.

## Scripts That Will Go Here

| Script | What It Does | Output |
|---|---|---|
| `generate_pos.py` | Takes UCI dataset, re-maps to Indian cities/stores, formats as POS billing data | `data/raw/pos_sales.csv` |
| `generate_web_orders.py` | Generates online e-commerce orders with Faker (customers, products, payments) | `data/raw/web_orders.json` |
| `generate_warehouse.py` | Generates inventory snapshots + shipment/delivery records | `data/raw/warehouse_inventory.csv`, `data/raw/shipments.csv` |

## Data Generation Logic
- **Indian cities**: Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad, Jaipur, Lucknow
- **50+ stores**: Each city gets 5-7 stores with unique IDs
- **Products**: Drawn from UCI dataset categories, ~3,000 unique items
- **Customers**: ~4,000 unique customers with Faker-generated names + addresses
- **Date range**: 2023-01-01 to 2025-01-31
- **SCD data**: ~10% of customers have a city change halfway through the date range (for SCD Type 2 demo)

## Dependencies
- `pandas`, `faker`, `openpyxl` (for reading UCI Excel file)
