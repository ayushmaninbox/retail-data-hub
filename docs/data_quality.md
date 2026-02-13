# ✅ Data Quality Documentation

## 1. Overview

The Retail Data Hub includes an **automated Data Quality (DQ) framework** that runs 7 rule-based
checks on Bronze layer data. The framework detects, classifies, and documents quality issues
before data flows downstream to Silver and Gold layers.

**Script:** `src/quality/quality_checks.py`
**Output:** `data/data_quality_report.json`

```bash
# Run all checks
python src/quality/quality_checks.py
```

---

## 2. The 7 Data Quality Rules

### Check 1: No Negative Prices

| Property | Value |
|---|---|
| **Rule** | `unit_price >= 0` |
| **Applies to** | `pos_sales`, `web_orders` |
| **Action on failure** | Quarantine row (exclude from downstream) |
| **Why it exists** | Negative prices indicate data entry errors or reversed transactions that need manual review |

**How it's caught:** The data generators intentionally inject ~1.5% negative prices to test this check.

---

### Check 2: No Future Dates

| Property | Value |
|---|---|
| **Rule** | `date <= today()` |
| **Applies to** | `pos_sales` (invoice_date), `web_orders` (order_date), `shipments` (ship_date) |
| **Action on failure** | Reject row |
| **Why it exists** | Future dates indicate timestamp errors, timezone issues, or corrupted records |

---

### Check 3: No Null Customer IDs

| Property | Value |
|---|---|
| **Rule** | `customer_id IS NOT NULL` |
| **Applies to** | `pos_sales`, `web_orders` |
| **Action on failure** | Fill with `"UNKNOWN"` |
| **Why it exists** | Null customer IDs break RFM segmentation and CLV calculations |

**How it's caught:** The data generators inject ~1.5% null customer IDs to test this check.

---

### Check 4: No Duplicate Rows

| Property | Value |
|---|---|
| **Rule** | Composite key uniqueness |
| **Keys** | `pos_sales`: (invoice_no, product_id) · `web_orders`: (order_id) · `shipments`: (shipment_id) |
| **Action on failure** | Drop duplicate (keep first) |
| **Why it exists** | Duplicate records inflate revenue metrics and inventory counts |

---

### Check 5: Referential Integrity

| Property | Value |
|---|---|
| **Rule** | Foreign key exists in parent dataset |
| **Check** | `shipments.order_id` must exist in `web_orders.order_id` |
| **Action on failure** | Reject orphan record |
| **Why it exists** | Orphan shipments can't be attributed to orders, breaking logistics KPIs |

---

### Check 6: Quantity Range

| Property | Value |
|---|---|
| **Rule** | `0 <= quantity <= 10,000` |
| **Applies to** | `pos_sales` (quantity), `web_orders` (quantity), `warehouse_inventory` (quantity_on_hand) |
| **Action on failure** | Flag as outlier |
| **Why it exists** | Extreme quantities indicate bulk entry errors or unit-of-measure confusion |

---

### Check 7: Column Completeness

| Property | Value |
|---|---|
| **Rule** | `% non-null per column >= 95%` |
| **Applies to** | All datasets, all columns |
| **Action on failure** | Report metric (no row-level action) |
| **Why it exists** | Low completeness signals upstream data source issues that need attention |

---

## 3. Report Format

Each run produces a JSON report at `data/data_quality_report.json` with this structure:

```json
{
  "report_timestamp": "2026-02-12T22:30:00",
  "summary": {
    "total_checks": 7,
    "passed": 5,
    "failed": 2,
    "total_violations": 312,
    "overall_status": "ISSUES_DETECTED"
  },
  "datasets_checked": {
    "pos_sales": { "rows": 50000, "columns": 11 },
    "web_orders": { "rows": 15000, "columns": 13 },
    "warehouse_inventory": { "rows": 50000, "columns": 9 },
    "shipments": { "rows": 8000, "columns": 8 }
  },
  "check_results": [
    {
      "check_id": 1,
      "check_name": "No Negative Prices",
      "rule": "unit_price >= 0",
      "datasets": ["pos_sales", "web_orders"],
      "total_rows_checked": 65000,
      "violations_found": 260,
      "status": "FAIL",
      "action_on_failure": "Quarantine row",
      "violation_details": [
        {
          "source": "pos_sales",
          "row_id": "INV-004521",
          "unit_price": -299.0,
          "action": "QUARANTINE"
        }
      ]
    }
  ]
}
```

---

## 4. Pipeline Integration

The DQ checks integrate at two points in the pipeline:

```
                               ┌──────────────┐
  Bronze Parquet ──────────────┤  DQ Checks   ├──── Report (JSON)
       │                       └──────┬───────┘
       │                              │
       │                     Pass / Fail decision
       │                              │
       ▼                              ▼
  Transformation            Dashboard Tab #7
  (Bronze → Silver)         (visual DQ summary)
```

**Current behavior:** Checks run independently and produce a report. Failures are logged
but do not block the pipeline (advisory mode).

**Production behavior:** In a production deployment, failed checks would gate the
Bronze → Silver transformation, preventing bad data from polluting downstream tables.

---

## 5. Intentional Data Quality Issues

The data generators **deliberately inject** quality issues to demonstrate the framework:

| Issue | Injection Rate | Generator | Caught By |
|---|---|---|---|
| Negative prices | ~1.5% of transactions | `generate_pos.py`, `generate_web_orders.py` | Check 1 |
| Null customer IDs | ~1.5% of transactions | `generate_pos.py`, `generate_web_orders.py` | Check 3 |
| SCD city changes | ~10% of customers | `generate_pos.py` | SCD Type 2 logic |
| Stockout inventory | ~5% of snapshots | `generate_warehouse.py` | Check 6, analytics |
| Delivery delays | ~15% of shipments | `generate_warehouse.py` | Logistics KPIs |
| "In Transit" null dates | ~5% of shipments | `generate_warehouse.py` | Check 7 |

This demonstrates that the quality framework is not just theoretical —
it actively detects and documents real issues in the data.

---

## 6. Schema Validation (Ingestion-Level)

In addition to the 7 post-ingestion DQ checks, the `schema_validator.py` module
provides **pre-write validation** during ingestion:

| Feature | How It Works |
|---|---|
| **Column presence** | Validates all expected columns exist in the incoming DataFrame |
| **Missing column handling** | Fills defaults: `"UNKNOWN"` for strings, `0` for numbers, `NaT` for dates |
| **Extra column handling** | Keeps extra columns, logs a warning |
| **Type coercion** | Casts columns to expected types with safe fallbacks (`errors="coerce"`) |
| **Strict mode** | Optional flag to raise errors instead of filling defaults |
| **Retry decorator** | `@retry_with_backoff` — 3 attempts with exponential delay (1s, 2s, 4s) |

This two-tier approach (schema validation at ingestion + DQ checks post-ingestion)
ensures data integrity at multiple pipeline stages.
