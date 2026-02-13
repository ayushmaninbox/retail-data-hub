# 📁 src/analytics/

## Purpose
KPI computation scripts that run on Gold layer star schema data using DuckDB.
Each script outputs a JSON file to `data/analytics/` for dashboard consumption.

## Scripts

| Script | KPIs | Output |
|---|---|---|
| `commercial_kpis.py` | Revenue, city sales, top products, channel mix, festive analysis | `commercial_kpis.json` |
| `operations_kpis.py` | Inventory turnover, stockouts, delivery times, seasonal demand | `operations_kpis.json` |
| `customer_kpis.py` | CLV, RFM segmentation, new vs returning, repeat rate | `customer_kpis.json` |
| `market_basket.py` | Apriori association rules, cross-channel analysis, category baskets | `market_basket.json` |

## How to Run

```bash
python src/analytics/commercial_kpis.py
python src/analytics/operations_kpis.py
python src/analytics/customer_kpis.py
python src/analytics/market_basket.py
```

## SQL Queries

Pure SQL versions of all KPIs are in `sql/kpi_queries.sql`, runnable via DuckDB.
