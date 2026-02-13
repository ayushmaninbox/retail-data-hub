# Storage, Partitioning & Security Plan

## 1. Storage Strategy

### Format: Apache Parquet (Columnar)

All data beyond the raw ingestion layer is stored in **Apache Parquet** format, chosen for:

| Feature | Benefit |
|---------|---------|
| **Columnar storage** | Analytical queries only read needed columns — 10–100× faster than CSV |
| **Built-in compression** | Snappy compression reduces disk footprint by ~75% vs raw CSV |
| **Schema enforcement** | Column types are embedded in the file — prevents silent data corruption |
| **Ecosystem support** | Native support in Pandas, DuckDB, Spark, and all major cloud warehouses |

### Medallion Architecture (Bronze → Silver → Gold)

```
data/
├── raw/           ← Original CSVs/JSONs (source of truth, immutable)
├── bronze/        ← Parquet, 1:1 copy of raw with schema validation
├── silver/        ← Cleaned, deduplicated, unified across channels
├── gold/          ← Star schema: fact + dimension tables (query-optimized)
└── analytics/     ← Pre-computed KPI JSONs for API serving
```

Each layer is **idempotent** — re-running a transformation overwrites the output without side effects, enabling safe re-processing.

---

## 2. Partitioning Strategy

### Bronze Layer — Partitioned by Source System

```
data/bronze/
├── pos_sales/pos_sales.parquet         ← POS billing system
├── web_orders/web_orders.parquet       ← E-commerce platform
└── warehouse/
    ├── warehouse_inventory.parquet     ← Inventory snapshots
    └── shipments.parquet               ← Logistics/delivery
```

**Rationale**: Source-level partitioning enables independent ingestion pipelines. If the web orders feed fails, POS data remains unaffected.

### Gold Layer — Star Schema with Date-Based Fact Table

The `fact_sales` table includes a `date_key` foreign key to `dim_date`, enabling efficient date-range filtering:

```sql
-- DuckDB query: only scans rows matching the date predicate
SELECT SUM(total_amount)
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
WHERE d.year = 2024 AND d.month = 12;
```

**Future-ready**: If data volume exceeds single-file thresholds, Parquet files can be partitioned by `year_month/` using Hive-style partitioning (`fact_sales/year_month=2024-01/part-00.parquet`) with zero code changes to DuckDB queries.

### Regional Partitioning (Dimension-Based)

The `dim_store` dimension includes `city`, `state`, and `region` fields, enabling region-scoped queries without scanning national data:

```sql
SELECT p.category, SUM(f.total_amount) as revenue
FROM fact_sales f
JOIN dim_store s ON f.store_key = s.store_key
WHERE s.region = 'West'
GROUP BY p.category;
```

---

## 3. Security & Access Control Plan

### 3.1 Role-Based Access Control (RBAC)

| Role | Access Level | Data Scope |
|------|-------------|------------|
| **Data Engineer** | Full read/write to all layers | Raw → Gold |
| **Business Analyst** | Read-only on Gold + Analytics | `fact_sales`, `dim_*`, KPI JSONs |
| **Store Manager** | Read-only, filtered by region | Own store's data only |
| **Executive** | Read-only on Dashboard API | Aggregated KPIs only |

### 3.2 Data Classification

| Classification | Examples | Protection |
|----------------|----------|------------|
| **PII (Personally Identifiable)** | `customer_id`, `customer_name`, `email` | Hashed/masked in Silver layer |
| **Sensitive Business** | Revenue, CLV, pricing | Restricted to Analyst+ roles |
| **General** | Product categories, dates, regions | Available to all authenticated users |

### 3.3 Implementation Approach

**Current (Hackathon Scope)**:
- API serves pre-aggregated KPIs — no raw PII exposed to the dashboard
- `customer_id` values are synthetic identifiers, not real personal data
- FastAPI runs on `localhost` (no external exposure)

**Production Recommendations**:
- **Authentication**: Add JWT-based auth to the FastAPI layer (`python-jose` + OAuth2)
- **Column-Level Encryption**: Encrypt PII columns at rest using `pyarrow` encryption
- **Row-Level Security**: Implement store-manager filters via parameterized API endpoints
- **Audit Logging**: Log all data access queries with timestamps and user identity
- **Network**: Deploy API behind HTTPS reverse proxy (Nginx/Caddy) with CORS restrictions

### 3.4 Data Quality as a Security Layer

The automated quality framework (7 checks) acts as a **data integrity firewall**:

- **No Negative Prices** — prevents financial data corruption
- **No Null Customer IDs** — ensures referential integrity
- **No Duplicates** — prevents inflated revenue reporting
- **Referential Integrity** — ensures all FKs resolve to valid dimensions
- **Column Completeness** — detects pipeline failures early

Violations are logged with counts and quarantined rows are stored separately in `silver/rejected_rows.parquet` for audit.

---

## 4. Technology Justification

| Component | Choice | Why |
|-----------|--------|-----|
| Storage format | Parquet | Columnar, compressed, schema-enforced |
| Query engine | DuckDB | In-process OLAP, zero infrastructure, SQL interface |
| API layer | FastAPI | Async Python, auto-generated Swagger docs |
| Dashboard | Next.js | SSR/SSG, React ecosystem, production-ready |
| Data generation | Faker + custom logic | Realistic Indian retail data with known edge cases |
