# 📁 data/silver/

## Purpose
**Silver Layer** of the Medallion Architecture. Contains **cleaned, validated, and deduplicated** data — safe for analysts to query directly.

## What "Silver" Means
- All data quality checks have been applied
- Duplicates removed, nulls handled, types corrected
- POS + Web orders **merged into a unified sales dataset**
- Invalid rows (negative prices, future dates) have been quarantined

## Files That Will Go Here

| File | Contents |
|---|---|
| `cleaned_sales.parquet` | Unified sales from POS + Web (cleaned & deduplicated) |
| `cleaned_inventory.parquet` | Validated inventory snapshots |
| `cleaned_shipments.parquet` | Validated shipment records |

## Transformations Applied (Bronze → Silver)
1. **Deduplication** — remove exact duplicate rows
2. **Null handling** — fill missing customer IDs with "UNKNOWN", drop rows with null keys
3. **Type casting** — dates to datetime, prices to decimal
4. **Range validation** — reject `unit_price < 0`, `quantity < 1`
5. **Date validation** — reject future dates
6. **Data merging** — combine POS + Web into one sales table with a `channel` column

## Notes
- Written by transformation scripts in `src/transformation/bronze_to_silver.py`
- Data quality reports are generated alongside — see `src/quality/`
