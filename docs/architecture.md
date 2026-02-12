# 🏗️ Architecture — Retail Data Hub

## 1. System Overview

The Retail Data Hub follows the **Medallion Architecture** (Bronze → Silver → Gold) pattern,
providing a scalable and maintainable data pipeline that transforms raw, siloed retail data
into analytics-ready star schema tables.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                       │
│                                                                                  │
│       50+ POS Stores          E-Commerce Portal         Warehouse WMS           │
│       (CSV, daily batch)      (JSON, near real-time)    (CSV, daily batch)      │
└────────┬──────────────────────────────┬────────────────────────┬─────────────────┘
         │                              │                        │
         ▼                              ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  📥 INGESTION LAYER (src/ingestion/)                                            │
│                                                                                  │
│  ingest_batch.py          ingest_realtime.py          schema_validator.py        │
│  ├─ CSV reader            ├─ JSON reader              ├─ Schema registry        │
│  ├─ Schema validation     ├─ Schema validation        ├─ Type coercion          │
│  ├─ Retry w/ backoff      ├─ Retry w/ backoff         ├─ Missing col fill       │
│  └─ Write Parquet         └─ Write Parquet            └─ Ingestion logging      │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🥉 BRONZE LAYER (data/bronze/)                                                 │
│                                                                                  │
│  Append-only, schema-validated Parquet files                                    │
│  ├── pos_sales/pos_sales.parquet         (~50,000 rows, 11 columns)             │
│  ├── web_orders/web_orders.parquet       (~15,000 rows, 13 columns)             │
│  ├── warehouse/warehouse_inventory.parquet (~50,000 rows, 9 columns)            │
│  └── warehouse/shipments.parquet         (~8,000 rows, 8 columns)               │
└──────────────────────────┬──────────────────────┬────────────────────────────────┘
                           │                      │
                  ┌────────┘                      │
                  ▼                               ▼
┌─────────────────────────────────┐  ┌────────────────────────────────────────────┐
│  ✅ DATA QUALITY CHECKS         │  │  🔄 TRANSFORMATION LAYER                   │
│  (src/quality/)                 │  │  (src/transformation/)                     │
│                                 │  │                                            │
│  7 automated rules:             │  │  bronze_to_silver.py                       │
│  1. No negative prices          │  │  ├─ Dedup on composite keys               │
│  2. No future dates             │  │  ├─ Null imputation                        │
│  3. No null customer IDs        │  │  ├─ Business logic validation              │
│  4. No duplicate rows           │  │  ├─ Channel unification (POS + Web)        │
│  5. Referential integrity       │  │  └─ Write to Silver Parquet                │
│  6. Quantity range checks       │  │                                            │
│  7. Column completeness         │  │  silver_to_gold.py                         │
│  ─────────────────────────     │  │  ├─ SCD Type 2 (customer dim)              │
│  Output:                        │  │  ├─ Surrogate key generation               │
│  data_quality_report.json       │  │  ├─ Star schema assembly                   │
└─────────────────────────────────┘  │  └─ Date-partitioned Parquet output        │
                                     └─────────────────┬──────────────────────────┘
                                                       │
                                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🥈 SILVER LAYER (data/silver/)                                                 │
│                                                                                  │
│  Cleaned, deduplicated, type-corrected data                                     │
│  ├── unified_sales.parquet       (POS + Web merged, clean)                      │
│  ├── inventory_clean.parquet     (duplicates removed, validated)                │
│  └── shipments_clean.parquet     (orphans rejected, dates fixed)                │
└──────────────────────────────────────────┬───────────────────────────────────────┘
                                           │  star schema + SCD Type 2
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🥇 GOLD LAYER (data/gold/)  —  Star Schema                                    │
│                                                                                  │
│  DIMENSION TABLES                    FACT TABLES                                │
│  ├── dim_date.parquet                ├── fact_sales.parquet                      │
│  ├── dim_customer.parquet (SCD2)     ├── fact_inventory.parquet                  │
│  ├── dim_product.parquet             └── fact_shipments.parquet                  │
│  └── dim_store.parquet                                                          │
│                                                                                  │
│  Partitioned by: date (monthly), region (city)                                  │
└──────────────────────────────┬───────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌───────────────────┐ ┌────────────────┐ ┌──────────────────────┐
│ 📊 DASHBOARD      │ │ 📝 SQL QUERIES │ │ 📈 ANALYTICS ENGINE  │
│ (Streamlit +      │ │ (sql/)         │ │ (src/analytics/)     │
│  Plotly)          │ │                │ │                      │
│ 7 interactive     │ │ Pure SQL KPIs  │ │ KPI computation      │
│ tabs covering     │ │ running on     │ │ Market Basket (ML)   │
│ all KPI           │ │ DuckDB OLAP   │ │ RFM segmentation     │
│ categories        │ │ engine         │ │ CLV analysis         │
└───────────────────┘ └────────────────┘ └──────────────────────┘
```

---

## 2. Data Flow Diagram (Mermaid)

```mermaid
flowchart TD
    subgraph Sources["📡 Data Sources"]
        POS["🏪 50+ POS Stores<br/>CSV • Daily Batch"]
        WEB["🌐 E-Commerce<br/>JSON • Near Real-Time"]
        WH["📦 Warehouse WMS<br/>CSV • Daily Batch"]
    end

    subgraph Ingestion["📥 Ingestion Layer"]
        IB["ingest_batch.py<br/>CSV → Parquet"]
        IR["ingest_realtime.py<br/>JSON → Parquet"]
        SV["schema_validator.py<br/>Schema Registry + Retry"]
    end

    subgraph Bronze["🥉 Bronze Layer"]
        B_POS["pos_sales.parquet<br/>~50K rows"]
        B_WEB["web_orders.parquet<br/>~15K rows"]
        B_INV["warehouse_inventory.parquet<br/>~50K rows"]
        B_SHP["shipments.parquet<br/>~8K rows"]
    end

    subgraph Quality["✅ Data Quality"]
        DQ["7 Automated Checks<br/>quality_checks.py"]
        DQR["data_quality_report.json"]
    end

    subgraph Transform["🔄 Transformation"]
        B2S["bronze_to_silver.py<br/>Clean • Dedup • Merge"]
        S2G["silver_to_gold.py<br/>Star Schema • SCD2"]
    end

    subgraph Silver["🥈 Silver Layer"]
        S_SALES["unified_sales.parquet"]
        S_INV["inventory_clean.parquet"]
        S_SHP["shipments_clean.parquet"]
    end

    subgraph Gold["🥇 Gold Layer — Star Schema"]
        DIM_D["dim_date"]
        DIM_C["dim_customer<br/>(SCD Type 2)"]
        DIM_P["dim_product"]
        DIM_S["dim_store"]
        F_SALES["fact_sales"]
        F_INV["fact_inventory"]
        F_SHP["fact_shipments"]
    end

    subgraph Analytics["📊 Analytics & Presentation"]
        DASH["Streamlit Dashboard<br/>7 Interactive Tabs"]
        SQL["SQL Queries<br/>DuckDB OLAP"]
        KPI["KPI Engine<br/>Python Analytics"]
        ML["Market Basket<br/>Apriori Algorithm"]
    end

    POS --> IB
    WH --> IB
    WEB --> IR
    IB --> SV
    IR --> SV
    SV --> B_POS
    SV --> B_WEB
    SV --> B_INV
    SV --> B_SHP

    B_POS --> DQ
    B_WEB --> DQ
    B_INV --> DQ
    B_SHP --> DQ
    DQ --> DQR

    B_POS --> B2S
    B_WEB --> B2S
    B_INV --> B2S
    B_SHP --> B2S
    B2S --> S_SALES
    B2S --> S_INV
    B2S --> S_SHP

    S_SALES --> S2G
    S_INV --> S2G
    S_SHP --> S2G
    S2G --> DIM_D
    S2G --> DIM_C
    S2G --> DIM_P
    S2G --> DIM_S
    S2G --> F_SALES
    S2G --> F_INV
    S2G --> F_SHP

    F_SALES --> DASH
    F_SALES --> SQL
    F_SALES --> KPI
    F_SALES --> ML
    F_INV --> DASH
    F_SHP --> DASH
```

---

## 3. Star Schema ERD

```mermaid
erDiagram
    dim_date {
        int date_key PK
        date full_date
        int year
        int quarter
        int month
        string month_name
        int day
        string day_name
        boolean is_weekend
        string season
    }

    dim_customer {
        int customer_key PK
        string customer_id
        string customer_name
        string city
        string state
        date effective_from
        date effective_to
        boolean is_current
        int scd_version
    }

    dim_product {
        int product_key PK
        string product_id
        string product_name
        string category
        float base_price
    }

    dim_store {
        int store_key PK
        string store_id
        string store_name
        string city
        string state
        string store_format
    }

    fact_sales {
        int sale_key PK
        int date_key FK
        int customer_key FK
        int product_key FK
        int store_key FK
        string channel
        string transaction_id
        int quantity
        float unit_price
        float total_amount
        string payment_method
    }

    fact_inventory {
        int inventory_key PK
        int date_key FK
        int product_key FK
        int store_key FK
        int quantity_on_hand
        int reorder_level
        float unit_cost
        boolean is_stockout
    }

    fact_shipments {
        int shipment_key PK
        int ship_date_key FK
        int delivery_date_key FK
        int store_key FK
        string order_id
        string destination_city
        int transit_days
        string status
        string carrier
    }

    dim_date ||--o{ fact_sales : "date_key"
    dim_customer ||--o{ fact_sales : "customer_key"
    dim_product ||--o{ fact_sales : "product_key"
    dim_store ||--o{ fact_sales : "store_key"
    dim_date ||--o{ fact_inventory : "date_key"
    dim_product ||--o{ fact_inventory : "product_key"
    dim_store ||--o{ fact_inventory : "store_key"
    dim_date ||--o{ fact_shipments : "ship_date_key"
    dim_store ||--o{ fact_shipments : "store_key"
```

---

## 4. Design Decisions & Trade-offs

### Why Medallion Architecture?

| Decision | Rationale |
|---|---|
| **Bronze = raw Parquet** | Preserves source fidelity; schema validation at write time catches format drift early |
| **Silver = cleaned** | Single layer for dedup, null handling, type coercion — avoids over-engineering |
| **Gold = star schema** | Optimized for analytical queries; DuckDB and BI tools work best with star models |

### Why DuckDB over Spark / BigQuery?

| Factor | DuckDB | Spark / Cloud |
|---|---|---|
| Setup | `pip install duckdb` | Cluster provisioning, cloud accounts |
| Cost | $0 | $$$$ |
| Performance (at our scale) | ~50ms per query on 50K rows | Overkill |
| Portability | Runs anywhere Python does | Cloud-dependent |
| Hackathon fit | ✅ Perfect | ❌ Over-engineered |

### Why Parquet?

- **Columnar** — only reads needed columns in analytical queries
- **Compressed** — 5-10× smaller than CSV, lower disk I/O
- **Schema enforcement** — types are preserved on disk, no CSV parsing ambiguity
- **Ecosystem** — native support in Pandas, DuckDB, Spark, Polars

### Schema Evolution Strategy

The `schema_validator.py` module handles format changes:
- **Missing columns** → filled with safe defaults (`"UNKNOWN"`, `0`, `NaT`)
- **Extra columns** → kept, logged as warning (backward-compatible)
- **Type drift** → coerced with fallbacks (e.g., `pd.to_numeric(errors="coerce")`)
- **strict mode** → can raise on missing columns for critical pipelines

### Retry & Resilience

All ingestion functions use the `@retry_with_backoff` decorator:
- 3 attempts max
- Exponential backoff (1s → 2s → 4s)
- Catches transient I/O failures (network mounts, locked files)

---

## 5. Data Volume Summary

| Dataset | Rows | Columns | Format | Source |
|---|---|---|---|---|
| POS Sales | ~50,000 | 11 | CSV → Parquet | 50+ stores, 2 years, 160+ products |
| Web Orders | ~15,000 | 13 | JSON → Parquet | E-commerce, UPI/CC/COD payments |
| Warehouse Inventory | ~50,000 | 9 | CSV → Parquet | Monthly snapshots, 50+ stores |
| Shipments | ~8,000 | 8 | CSV → Parquet | 7 carriers, delivery tracking |

**Total:** ~123,000 records across 4 datasets, covering Jan 2023 – Jan 2025.
