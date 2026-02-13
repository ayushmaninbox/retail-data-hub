# 📁 data/bronze/

## Purpose
**Bronze Layer** of the Medallion Architecture. Contains raw data converted to Parquet format — structurally identical to the source, but in a columnar format optimized for analytics.

## What "Bronze" Means
- Data is stored **exactly as received** — no cleaning, no dedup, no transformations
- Think of it as a "landing zone" or "raw vault"
- Acts as an **immutable backup** — if anything goes wrong downstream, we can always re-process from bronze

## Folders That Will Go Here

```
bronze/
├── pos_sales/
│   └── pos_sales_YYYY-MM-DD.parquet    # Daily POS batch
├── web_orders/
│   └── web_orders_YYYY-MM-DD.parquet   # Web order batch
├── warehouse/
│   └── inventory_YYYY-MM-DD.parquet    # Inventory snapshot
└── shipments/
    └── shipments_YYYY-MM-DD.parquet    # Shipment records
```

## Notes
- All files are in **Parquet** format (columnar, compressed, fast reads)
- Files are date-stamped for traceability
- Written by ingestion scripts in `src/ingestion/`
