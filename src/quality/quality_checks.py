"""
quality_checks.py
=================
Automated Data Quality framework with 7 rules that run on Bronze layer
Parquet files. Detects nulls, negative prices, future dates, duplicates,
quantity outliers, referential integrity issues, and column completeness.

Outputs:
  - data/data_quality_report.json  (detailed results per check)
  - Console summary with pass/fail status

Usage:
    python src/quality/quality_checks.py
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any

import pandas as pd

# ── project paths ───────────────────────────────────────────────────
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BRONZE_DIR = os.path.join(ROOT_DIR, "data", "bronze")
DATA_DIR = os.path.join(ROOT_DIR, "data")


# ══════════════════════════════════════════════════════════════════════
# LOAD BRONZE DATA
# ══════════════════════════════════════════════════════════════════════

def load_bronze():
    """Load all Bronze Parquet files into DataFrames."""
    datasets = {}

    paths = {
        "pos_sales":           os.path.join(BRONZE_DIR, "pos_sales", "pos_sales.parquet"),
        "web_orders":          os.path.join(BRONZE_DIR, "web_orders", "web_orders.parquet"),
        "warehouse_inventory": os.path.join(BRONZE_DIR, "warehouse", "warehouse_inventory.parquet"),
        "shipments":           os.path.join(BRONZE_DIR, "shipments", "shipments.parquet"),
    }

    for name, path in paths.items():
        if os.path.exists(path):
            datasets[name] = pd.read_parquet(path)
            print(f"  ✓ Loaded {name}: {len(datasets[name]):,} rows")
        else:
            print(f"  ✗ Missing: {path}")

    return datasets


# ══════════════════════════════════════════════════════════════════════
# 7 DATA QUALITY CHECKS
# ══════════════════════════════════════════════════════════════════════

def check_1_no_negative_prices(datasets: dict) -> Dict[str, Any]:
    """
    CHECK 1: No negative prices
    Rule: unit_price >= 0 in pos_sales and web_orders
    Action: Quarantine rows with negative prices
    """
    violations = []
    total_checked = 0

    for name in ["pos_sales", "web_orders"]:
        if name not in datasets:
            continue
        df = datasets[name]
        col = "unit_price"
        if col in df.columns:
            total_checked += len(df)
            neg = df[df[col] < 0]
            if len(neg) > 0:
                for _, row in neg.iterrows():
                    violations.append({
                        "source": name,
                        "row_id": str(row.get("invoice_no", row.get("order_id", "unknown"))),
                        "unit_price": float(row[col]),
                        "action": "QUARANTINE",
                    })

    passed = len(violations) == 0
    return {
        "check_id": 1,
        "check_name": "No Negative Prices",
        "rule": "unit_price >= 0",
        "datasets": ["pos_sales", "web_orders"],
        "total_rows_checked": total_checked,
        "violations_found": len(violations),
        "status": "PASS" if passed else "FAIL",
        "action_on_failure": "Quarantine row",
        "violation_details": violations,
    }


def check_2_no_future_dates(datasets: dict) -> Dict[str, Any]:
    """
    CHECK 2: No future dates
    Rule: date <= today()
    Action: Reject row
    """
    today = pd.Timestamp.now()
    violations = []
    total_checked = 0

    date_cols = {
        "pos_sales": "invoice_date",
        "web_orders": "order_date",
        "shipments": "ship_date",
    }

    for name, col in date_cols.items():
        if name not in datasets:
            continue
        df = datasets[name]
        if col in df.columns:
            dates = pd.to_datetime(df[col], errors="coerce")
            total_checked += len(df)
            future = df[dates > today]
            if len(future) > 0:
                for _, row in future.iterrows():
                    violations.append({
                        "source": name,
                        "row_id": str(row.iloc[0]),
                        "date_value": str(row[col]),
                        "action": "REJECT",
                    })

    passed = len(violations) == 0
    return {
        "check_id": 2,
        "check_name": "No Future Dates",
        "rule": "date <= today()",
        "datasets": list(date_cols.keys()),
        "total_rows_checked": total_checked,
        "violations_found": len(violations),
        "status": "PASS" if passed else "FAIL",
        "action_on_failure": "Reject row",
        "violation_details": violations,
    }


def check_3_no_null_customer_ids(datasets: dict) -> Dict[str, Any]:
    """
    CHECK 3: No null customer IDs
    Rule: customer_id IS NOT NULL
    Action: Fill with "UNKNOWN"
    """
    violations = []
    total_checked = 0

    for name in ["pos_sales", "web_orders"]:
        if name not in datasets:
            continue
        df = datasets[name]
        if "customer_id" in df.columns:
            total_checked += len(df)
            nulls = df[df["customer_id"].isna() | (df["customer_id"].astype(str).isin(["None", "nan", ""]))]
            if len(nulls) > 0:
                for idx, row in nulls.iterrows():
                    violations.append({
                        "source": name,
                        "row_index": int(idx),
                        "row_id": str(row.get("invoice_no", row.get("order_id", "unknown"))),
                        "action": "FILL 'UNKNOWN'",
                    })

    passed = len(violations) == 0
    return {
        "check_id": 3,
        "check_name": "No Null Customer IDs",
        "rule": "customer_id IS NOT NULL",
        "datasets": ["pos_sales", "web_orders"],
        "total_rows_checked": total_checked,
        "violations_found": len(violations),
        "status": "PASS" if passed else "FAIL",
        "action_on_failure": "Fill 'UNKNOWN'",
        "violation_details": violations,
    }


def check_4_no_duplicates(datasets: dict) -> Dict[str, Any]:
    """
    CHECK 4: No duplicate rows
    Rule: Composite key uniqueness
    Action: Drop duplicate
    """
    violations = []
    total_checked = 0

    keys = {
        "pos_sales":  ["invoice_no", "product_id"],
        "web_orders": ["order_id"],
        "shipments":  ["shipment_id"],
    }

    for name, key_cols in keys.items():
        if name not in datasets:
            continue
        df = datasets[name]
        valid_keys = [k for k in key_cols if k in df.columns]
        if valid_keys:
            total_checked += len(df)
            dupes = df[df.duplicated(subset=valid_keys, keep=False)]
            n_dupes = len(dupes) - len(dupes.drop_duplicates(subset=valid_keys))
            if n_dupes > 0:
                violations.append({
                    "source": name,
                    "key_columns": valid_keys,
                    "duplicate_rows": n_dupes,
                    "action": "DROP DUPLICATE",
                })

    passed = len(violations) == 0
    return {
        "check_id": 4,
        "check_name": "No Duplicates",
        "rule": "Composite key uniqueness",
        "datasets": list(keys.keys()),
        "total_rows_checked": total_checked,
        "violations_found": sum(v["duplicate_rows"] for v in violations) if violations else 0,
        "status": "PASS" if passed else "FAIL",
        "action_on_failure": "Drop duplicate",
        "violation_details": violations,
    }


def check_5_referential_integrity(datasets: dict) -> Dict[str, Any]:
    """
    CHECK 5: Referential integrity
    Rule: FK exists in parent dataset
    Action: Reject orphan
    """
    violations = []
    total_checked = 0

    # shipments.order_id should exist in web_orders.order_id
    if "shipments" in datasets and "web_orders" in datasets:
        ship = datasets["shipments"]
        web = datasets["web_orders"]
        if "order_id" in ship.columns and "order_id" in web.columns:
            total_checked += len(ship)
            valid_orders = set(web["order_id"].dropna().unique())
            orphans = ship[~ship["order_id"].isin(valid_orders)]
            if len(orphans) > 0:
                for _, row in orphans.head(5).iterrows():
                    violations.append({
                        "source": "shipments",
                        "orphan_order_id": str(row["order_id"]),
                        "action": "REJECT ORPHAN",
                    })

    passed = len(violations) == 0
    return {
        "check_id": 5,
        "check_name": "Referential Integrity",
        "rule": "FK exists in parent dataset",
        "datasets": ["shipments → web_orders"],
        "total_rows_checked": total_checked,
        "violations_found": len(violations),
        "status": "PASS" if passed else "FAIL",
        "action_on_failure": "Reject orphan",
        "violation_details": violations,
    }


def check_6_quantity_range(datasets: dict) -> Dict[str, Any]:
    """
    CHECK 6: Quantity in valid range
    Rule: 1 <= qty <= 10000
    Action: Flag outlier
    """
    violations = []
    total_checked = 0

    qty_cols = {
        "pos_sales": "quantity",
        "web_orders": "quantity",
        "warehouse_inventory": "quantity_on_hand",
    }

    for name, col in qty_cols.items():
        if name not in datasets:
            continue
        df = datasets[name]
        if col in df.columns:
            total_checked += len(df)
            outliers = df[(df[col] < 0) | (df[col] > 10000)]
            if len(outliers) > 0:
                for _, row in outliers.iterrows():
                    violations.append({
                        "source": name,
                        "row_id": str(row.iloc[0]),
                        "quantity_value": int(row[col]),
                        "action": "FLAG OUTLIER",
                    })

    passed = len(violations) == 0
    return {
        "check_id": 6,
        "check_name": "Quantity Range",
        "rule": "1 <= qty <= 10,000 (no negatives)",
        "datasets": list(qty_cols.keys()),
        "total_rows_checked": total_checked,
        "violations_found": len(violations),
        "status": "PASS" if passed else "FAIL",
        "action_on_failure": "Flag outlier",
        "violation_details": violations,
    }


def check_7_column_completeness(datasets: dict) -> Dict[str, Any]:
    """
    CHECK 7: Column completeness
    Rule: % non-null per column — flag if < 95%
    Action: Report metric
    """
    results = []
    flags = []

    for name, df in datasets.items():
        for col in df.columns:
            total = len(df)
            non_null = df[col].notna().sum()
            # Also count "None" and "nan" strings as null
            if df[col].dtype == object:
                str_nulls = df[col].isin(["None", "nan", ""]).sum()
                non_null -= str_nulls
            pct = round((non_null / total) * 100, 1) if total > 0 else 0

            entry = {
                "source": name,
                "column": col,
                "total_rows": total,
                "non_null_rows": int(non_null),
                "completeness_pct": pct,
            }
            results.append(entry)

            if pct < 95.0:
                flags.append(entry)

    passed = len(flags) == 0
    return {
        "check_id": 7,
        "check_name": "Column Completeness",
        "rule": "% non-null per column >= 95%",
        "datasets": list(datasets.keys()),
        "total_columns_checked": len(results),
        "columns_below_threshold": len(flags),
        "status": "PASS" if passed else "FAIL",
        "action_on_failure": "Report metric",
        "flagged_columns": flags,
        "all_columns": results,
    }


# ══════════════════════════════════════════════════════════════════════
# MAIN — run all 7 checks and generate report
# ══════════════════════════════════════════════════════════════════════

ALL_CHECKS = [
    check_1_no_negative_prices,
    check_2_no_future_dates,
    check_3_no_null_customer_ids,
    check_4_no_duplicates,
    check_5_referential_integrity,
    check_6_quantity_range,
    check_7_column_completeness,
]


def run_all_checks():
    """Run all 7 DQ checks and save report."""
    print("=" * 60)
    print("🔍 DATA QUALITY FRAMEWORK — 7 Automated Checks")
    print("=" * 60)

    # Load data
    print("\n📂 Loading Bronze layer data …")
    datasets = load_bronze()

    if not datasets:
        print("✗ No Bronze data found. Run ingestion first.")
        return

    # Run checks
    print(f"\n🏃 Running {len(ALL_CHECKS)} checks …\n")
    results = []

    for check_fn in ALL_CHECKS:
        result = check_fn(datasets)
        results.append(result)

        status_icon = "✅" if result["status"] == "PASS" else "❌"
        print(
            f"  {status_icon} Check {result['check_id']}: {result['check_name']}"
            f"  → {result['status']}"
            f"  ({result.get('violations_found', result.get('columns_below_threshold', 0))} issues)"
        )

    # Summary
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = len(results) - passed
    total_violations = sum(
        r.get("violations_found", r.get("columns_below_threshold", 0))
        for r in results
    )

    report = {
        "report_timestamp": datetime.now().isoformat(),
        "summary": {
            "total_checks": len(results),
            "passed": passed,
            "failed": failed,
            "total_violations": total_violations,
            "overall_status": "HEALTHY" if failed == 0 else "ISSUES_DETECTED",
        },
        "datasets_checked": {
            name: {"rows": len(df), "columns": len(df.columns)}
            for name, df in datasets.items()
        },
        "check_results": results,
    }

    # Save report
    report_path = os.path.join(DATA_DIR, "data_quality_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n{'=' * 60}")
    print(f"📊 SUMMARY: {passed}/{len(results)} checks passed, {failed} failed")
    print(f"   Total violations: {total_violations}")
    print(f"   Status: {'🟢 HEALTHY' if failed == 0 else '🔴 ISSUES DETECTED'}")
    print(f"   Report: {report_path}")
    print(f"{'=' * 60}")

    return report


if __name__ == "__main__":
    run_all_checks()
