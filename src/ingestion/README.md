# 📁 src/ingestion/

## Purpose
Data ingestion pipelines that read raw source files and land them as Parquet in the **Bronze Layer**. Supports both **batch** (CSV/DB) and **near real-time** (JSON) ingestion.

## Scripts That Will Go Here

| Script | What It Does | Input | Output |
|---|---|---|---|
| `ingest_batch.py` | Reads POS CSV + warehouse CSV, converts to Parquet | `data/raw/*.csv` | `data/bronze/pos_sales/`, `data/bronze/warehouse/` |
| `ingest_realtime.py` | Reads web orders JSON (simulates streaming), converts to Parquet | `data/raw/web_orders.json` | `data/bronze/web_orders/` |
| `schema_validator.py` | Reusable module for schema validation + retry logic | — | Used by both pipelines |

## Key Features
- **Schema validation**: Check expected columns, data types, and nullability before writing
- **Schema evolution**: Handle extra/missing columns gracefully (log warning, fill defaults)
- **Retry with backoff**: If file read fails, retry up to 3 times with exponential backoff
- **Logging**: Every ingestion run logs timestamp, row count, file name, and any errors

## Pipeline Flow
```
raw CSV/JSON → validate schema → convert to Parquet → write to bronze/
                    ↓ (if fails)
              retry (max 3x) → log error → quarantine file
```
