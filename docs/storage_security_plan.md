# 🛡️ Storage & Security Plan

## 1. Storage Strategy

### 1.1 File Format: Apache Parquet

All data beyond the raw layer is stored in **Apache Parquet** format.

| Property | Benefit |
|---|---|
| **Columnar storage** | Analytical queries read only needed columns — up to 10× faster than row-oriented CSV |
| **Built-in compression** | Snappy compression by default — 5-10× smaller than raw CSV |
| **Schema embedded** | Data types are stored in file metadata — no parsing ambiguity |
| **Ecosystem support** | Native in Pandas, DuckDB, Spark, Polars, AWS Athena, BigQuery |

### 1.2 Partitioning Strategy

Data in the Silver and Gold layers is physically partitioned to enable **partition pruning** —
queries that filter on partition keys skip irrelevant files entirely.

```
data/gold/
├── fact_sales/
│   ├── year=2023/
│   │   ├── month=01/
│   │   │   └── part-0001.parquet
│   │   ├── month=02/
│   │   │   └── part-0001.parquet
│   │   └── ...
│   └── year=2024/
│       └── ...
├── fact_inventory/
│   ├── year=2023/
│   │   └── month=01/
│   │       └── part-0001.parquet
│   └── ...
├── dim_customer/
│   └── dim_customer.parquet        ← small dimensions: single file
├── dim_product/
│   └── dim_product.parquet
├── dim_store/
│   └── dim_store.parquet
└── dim_date/
    └── dim_date.parquet
```

**Partition Keys:**

| Table | Partition Keys | Rationale |
|---|---|---|
| `fact_sales` | `year`, `month` | Most queries filter by time period |
| `fact_inventory` | `year`, `month` | Monthly snapshots naturally partition by date |
| `fact_shipments` | `year`, `month` | Delivery analysis is time-bound |
| `dim_*` (all) | None | Small tables (< 10K rows) — single Parquet file each |

**Query Performance Impact:**

```sql
-- WITHOUT partitioning: scans ALL 50,000+ rows
SELECT SUM(total_amount) FROM fact_sales WHERE year = 2024;

-- WITH partitioning: reads only year=2024/ directory (~25,000 rows)
-- Result: ~50% fewer rows scanned, proportionally faster query
```

### 1.3 Compression

| Layer | Codec | Compression Ratio | Reason |
|---|---|---|---|
| Bronze | Snappy (default) | ~3× | Fast write, good for append-only ingestion |
| Silver | Snappy | ~4× | Balanced for iterative cleaning workflows |
| Gold | Zstd | ~6× | Higher compression for read-heavy analytical tables |

---

## 2. Access Control Framework

### 2.1 Role-Based Access Control (RBAC)

Even though this project runs locally, we define access roles that map directly to production deployment:

| Role | Bronze | Silver | Gold | DQ Reports | Dashboard |
|---|---|---|---|---|---|
| **Data Engineer** | Read/Write | Read/Write | Read/Write | Read/Write | Full |
| **Data Analyst** | — | Read | Read | Read | Full |
| **Business User** | — | — | — | — | View only |
| **ML Engineer** | — | Read | Read | Read | Full |
| **Auditor** | Read | Read | Read | Read | View only |

### 2.2 Enforcement Mechanisms

**Current (Local / Hackathon):**
- File-system permissions (`chmod 640` on data directories)
- `.gitignore` prevents accidental commits of data files
- All generated data stays local to the machine

**Production-Ready (Cloud deployment path):**

| Mechanism | Implementation |
|---|---|
| **IAM Policies** | AWS IAM / GCP IAM roles mapped to the RBAC table above |
| **Bucket Policies** | S3 bucket policies restrict Bronze/Silver access to engineers only |
| **Column-Level Security** | DuckDB views or Iceberg column masks to hide PII (customer_name, delivery_address) |
| **Row-Level Security** | Regional analysts see only their city's data via filtered views |
| **Encryption at Rest** | S3 SSE-S3 or customer-managed KMS keys |
| **Encryption in Transit** | TLS 1.3 for all API and data transfer connections |

### 2.3 PII Handling

The following columns contain Personally Identifiable Information:

| Column | Dataset | Classification | Treatment |
|---|---|---|---|
| `customer_name` | web_orders | PII | Hash or mask in Silver/Gold |
| `customer_id` | pos_sales, web_orders | Quasi-identifier | Surrogate key in Gold |
| `delivery_address` | web_orders | PII | Drop or hash in Silver |

**Strategy:** In the Gold layer, raw PII is replaced with surrogate keys (`customer_key`).
The `dim_customer` table stores the mapping, and access to it is restricted to Data Engineers and Auditors only.

---

## 3. Data Lineage & Audit Trail

### 3.1 Ingestion Logging

Every pipeline run produces structured audit records:

| Log | Format | Location | Contents |
|---|---|---|---|
| `ingestion.log` | Text | `data/logs/` | Timestamped debug/info/warning messages |
| `ingestion_runs.jsonl` | JSONL | `data/logs/` | Machine-readable run summaries (dataset, rows, status, errors) |
| `batch_ingestion_log.json` | JSON | `data/bronze/` | Per-batch metadata for reproducibility |

**Sample ingestion log entry:**
```json
{
  "timestamp": "2026-02-12T17:30:00",
  "dataset": "pos_sales",
  "source": "data/raw/pos_sales.csv",
  "output": "data/bronze/pos_sales/pos_sales.parquet",
  "rows": 50000,
  "columns": 11,
  "status": "SUCCESS",
  "error": null
}
```

### 3.2 Data Quality Audit

The `data_quality_report.json` file records:
- Timestamp of each quality run
- Pass/fail status for all 7 checks
- Exact violation counts and sample rows
- Overall health status (HEALTHY / ISSUES_DETECTED)

This provides a full **audit trail** for regulatory compliance and debugging.

---

## 4. Backup & Recovery Strategy

| Component | Strategy | Frequency |
|---|---|---|
| Source code | Git (GitHub) | Every commit |
| Raw data (`data/raw/`) | Regenerable via `src/data_generation/` scripts | On demand |
| Bronze/Silver/Gold | Regenerable by re-running the pipeline | On demand |
| Data quality reports | Append-only JSONL log | Historical preservation |

**Key insight:** Because all data is derived from deterministic generators (seeded with `SEED=42`),
the entire pipeline is **fully reproducible** — any layer can be rebuilt from scratch in under 60 seconds.

---

## 5. Scalability Path

| Current Scale | Production Scale | What Changes |
|---|---|---|
| ~123K rows total | ~100M+ rows | Switch partitioned Parquet to Delta Lake or Iceberg |
| DuckDB (single process) | Spark / Trino cluster | Swap query engine, Parquet files stay identical |
| Local filesystem | S3 / GCS / ADLS | Change path prefixes, add IAM |
| Streamlit local | Streamlit Cloud / Tableau | Deploy dashboard, point at remote Parquet |
