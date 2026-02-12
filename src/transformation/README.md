# 📁 src/transformation/

## Purpose
Transformation scripts that move data through the Medallion layers: **Bronze → Silver** (cleaning) and **Silver → Gold** (star schema modeling).

## Scripts That Will Go Here

| Script | What It Does | Input | Output |
|---|---|---|---|
| `bronze_to_silver.py` | Cleans, deduplicates, validates, and merges data | `data/bronze/` | `data/silver/` |
| `silver_to_gold.py` | Builds star schema fact + dimension tables | `data/silver/` | `data/gold/` |
| `scd_handler.py` | Implements SCD Type 2 logic for `dim_customer` | Customer data | `data/gold/dim_customer.parquet` |

## Bronze → Silver Transformations
1. Drop exact duplicate rows
2. Cast dates to `datetime`, prices to `float`
3. Reject rows with `unit_price < 0` or `quantity < 1`
4. Reject rows with future dates
5. Fill null `customer_id` with "UNKNOWN"
6. Merge POS + Web data into unified sales with a `channel` column ("POS" / "Web")

## Silver → Gold Transformations
1. Generate `dim_date` spanning full date range
2. Extract unique products → `dim_product`
3. Extract unique stores → `dim_store`
4. Build `dim_customer` with SCD Type 2 (city change tracking)
5. Assign surrogate keys to all dimensions
6. Build fact tables with FK references to dimensions
7. Partition fact tables by `year/month`

## SCD Type 2 Logic
When a customer's city changes:
- Set `end_date` on old row, `is_current = False`
- Insert new row with new city, `start_date = change_date`, `end_date = NULL`, `is_current = True`
