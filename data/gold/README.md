# 📁 data/gold/

## Purpose
**Gold Layer** of the Medallion Architecture. Contains the **Star Schema** — business-modeled dimensional tables ready for dashboards, KPI queries, and AI/ML.

## What "Gold" Means
- Data is organized into **Fact** (events/measures) and **Dimension** (descriptive context) tables
- This is the layer that dashboards and analysts query directly
- Follows the Kimball star schema methodology

## Folders & Files That Will Go Here

```
gold/
├── fact_sales/
│   ├── year=2024/
│   │   ├── month=01/data.parquet
│   │   ├── month=02/data.parquet
│   │   └── ...
│   └── year=2025/...
├── fact_inventory/
│   └── (partitioned by year/month)
├── fact_shipment/
│   └── (partitioned by year/month)
├── dim_date.parquet
├── dim_product.parquet
├── dim_customer.parquet          ← SCD Type 2 (tracks city changes)
└── dim_store.parquet
```

## Star Schema Overview

### Fact Tables (measurable events)
- **fact_sales** — every sale transaction (sale_id, date_key, product_key, customer_key, store_key, channel, quantity, unit_price, total_amount)
- **fact_inventory** — daily stock snapshots (snapshot_date_key, product_key, store_key, stock_on_hand, reorder_point)
- **fact_shipment** — delivery records (shipment_id, order_id, ship_date_key, delivery_date_key, origin_store_key, destination_city, status)

### Dimension Tables (descriptive context)
- **dim_date** — calendar attributes (date_key, full_date, day, month, year, quarter, day_of_week, is_weekend, is_holiday)
- **dim_product** — product catalog (product_key, product_id, description, category, unit_price)
- **dim_customer** — customer info with **SCD Type 2** (customer_key, customer_id, name, city, state, start_date, end_date, is_current)
- **dim_store** — store locations (store_key, store_id, store_name, city, state, store_type)

## Partitioning Strategy
Fact tables are partitioned by `year/month` so that queries like "sales in Feb 2025" only scan one folder, not the entire dataset.

## Notes
- Written by `src/transformation/silver_to_gold.py` and `src/transformation/scd_handler.py`
- Queried by analytics scripts in `src/analytics/` and the Streamlit dashboard
