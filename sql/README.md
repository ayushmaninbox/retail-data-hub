# 📁 sql/

## Purpose
Pure SQL versions of all KPI queries. These run against gold Parquet files via **DuckDB** and serve as a standalone deliverable showing SQL proficiency.

## Files That Will Go Here

| File | Contents |
|---|---|
| `kpi_queries.sql` | All commercial, operations, and customer KPIs as SQL queries |

## Query Categories

### Commercial
- Daily/monthly revenue aggregation
- City-wise sales breakdown
- Top 10 products by quantity sold
- Channel mix (POS vs Web) revenue split

### Operations
- Inventory turnover ratio per product/store
- Average delivery time per route
- Stockout rate (% of products with zero stock)
- Seasonal demand trends (monthly quantity by category)

### Customer
- New vs returning customer counts
- Customer Lifetime Value (total spend per customer)
- RFM scoring (recency, frequency, monetary)

## How to Run
```python
import duckdb
conn = duckdb.connect()
# Queries read directly from gold Parquet:
conn.execute("SELECT * FROM 'data/gold/fact_sales/**/*.parquet'")
```
