# 📁 src/quality/

## Purpose
Automated data quality framework that validates data at every pipeline stage and produces evidence reports — a key hackathon deliverable.

## Scripts That Will Go Here

| Script | What It Does |
|---|---|
| `quality_checks.py` | Defines all DQ rules and runs them against a DataFrame, returns pass/fail per rule |
| `quality_report.py` | Aggregates check results into a JSON report with timestamps and row counts |

## Quality Rules

| # | Check | Rule | Action on Fail |
|---|---|---|---|
| 1 | No negative prices | `unit_price >= 0` | Flag & quarantine row |
| 2 | No future dates | `date <= today()` | Reject row |
| 3 | No null customer IDs | `customer_id IS NOT NULL` | Fill with "UNKNOWN" |
| 4 | No duplicates | Composite key uniqueness | Drop duplicate rows |
| 5 | Referential integrity | FK exists in dimension table | Reject orphan rows |
| 6 | Quantity range | `1 <= quantity <= 10,000` | Flag as outlier |
| 7 | Completeness score | `% non-null per column` | Report metric |

## Output
Each pipeline run generates `data_quality_report.json`:
```json
{
  "run_timestamp": "2025-02-12T10:30:00",
  "layer": "silver",
  "total_rows": 50000,
  "checks": [
    {"name": "no_negative_prices", "passed": true, "rows_affected": 0},
    {"name": "no_future_dates", "passed": true, "rows_affected": 12},
    ...
  ]
}
```

This report is displayed in the dashboard's **Data Quality** tab.
