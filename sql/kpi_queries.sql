-- ═══════════════════════════════════════════════════════════════════════
-- kpi_queries.sql
-- ═══════════════════════════════════════════════════════════════════════
-- Pure SQL versions of all KPIs, runnable directly on DuckDB.
--
-- Usage:
--   duckdb < sql/kpi_queries.sql
-- Or from Python:
--   con = duckdb.connect()
--   con.execute(open('sql/kpi_queries.sql').read())
-- ═══════════════════════════════════════════════════════════════════════


-- ── Load Gold + Silver tables ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fact_sales       AS SELECT * FROM read_parquet('data/gold/fact_sales.parquet');
CREATE TABLE IF NOT EXISTS dim_date         AS SELECT * FROM read_parquet('data/gold/dim_date.parquet');
CREATE TABLE IF NOT EXISTS dim_product      AS SELECT * FROM read_parquet('data/gold/dim_product.parquet');
CREATE TABLE IF NOT EXISTS dim_store        AS SELECT * FROM read_parquet('data/gold/dim_store.parquet');
CREATE TABLE IF NOT EXISTS dim_customer     AS SELECT * FROM read_parquet('data/gold/dim_customer.parquet');
CREATE TABLE IF NOT EXISTS inventory        AS SELECT * FROM read_parquet('data/silver/warehouse_inventory.parquet');
CREATE TABLE IF NOT EXISTS shipments        AS SELECT * FROM read_parquet('data/silver/shipments.parquet');


-- ═══════════════════════════════════════════════════════════════════════
-- COMMERCIAL KPIs
-- ═══════════════════════════════════════════════════════════════════════

-- KPI C1: Revenue Summary
SELECT '=== REVENUE SUMMARY ===' AS section;
SELECT
    SUM(total_amount)                     AS total_revenue,
    COUNT(*)                              AS total_transactions,
    SUM(quantity)                         AS total_units_sold,
    ROUND(AVG(total_amount), 2)           AS avg_transaction_value,
    COUNT(DISTINCT transaction_id)        AS unique_invoices
FROM fact_sales;


-- KPI C2: Monthly Revenue Trend
SELECT '=== MONTHLY REVENUE ===' AS section;
SELECT
    d.year_month,
    SUM(f.total_amount)           AS revenue,
    COUNT(*)                      AS transactions,
    SUM(f.quantity)               AS units_sold
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
GROUP BY d.year_month
ORDER BY d.year_month;


-- KPI C3: City-wise Sales
SELECT '=== CITY-WISE SALES ===' AS section;
SELECT
    s.city,
    s.state,
    s.region,
    SUM(f.total_amount)               AS revenue,
    SUM(f.quantity)                    AS units_sold,
    COUNT(DISTINCT f.customer_sk)     AS unique_customers
FROM fact_sales f
JOIN dim_store s ON f.store_sk = s.store_sk
GROUP BY s.city, s.state, s.region
ORDER BY revenue DESC;


-- KPI C4: Top 10 Products by Revenue
SELECT '=== TOP 10 PRODUCTS (REVENUE) ===' AS section;
SELECT
    p.product_name,
    p.category,
    SUM(f.total_amount)    AS revenue,
    SUM(f.quantity)        AS quantity_sold
FROM fact_sales f
JOIN dim_product p ON f.product_sk = p.product_sk
GROUP BY p.product_name, p.category
ORDER BY revenue DESC
LIMIT 10;


-- KPI C5: Channel Mix (POS vs Web)
SELECT '=== CHANNEL MIX ===' AS section;
SELECT
    channel,
    SUM(total_amount)          AS revenue,
    COUNT(*)                   AS transactions,
    ROUND(SUM(total_amount) * 100.0 /
          (SELECT SUM(total_amount) FROM fact_sales), 1) AS revenue_share_pct
FROM fact_sales
GROUP BY channel;


-- KPI C6: Category Revenue
SELECT '=== CATEGORY REVENUE ===' AS section;
SELECT
    p.category,
    SUM(f.total_amount)     AS revenue,
    SUM(f.quantity)         AS units_sold,
    ROUND(AVG(f.unit_price), 2) AS avg_price
FROM fact_sales f
JOIN dim_product p ON f.product_sk = p.product_sk
GROUP BY p.category
ORDER BY revenue DESC;


-- KPI C7: Festive vs Non-Festive
SELECT '=== FESTIVE vs NORMAL ===' AS section;
SELECT
    CASE WHEN d.is_festive_season THEN 'Festive (Oct-Jan)' ELSE 'Normal' END AS period,
    SUM(f.total_amount)                AS revenue,
    COUNT(*)                           AS transactions,
    ROUND(AVG(f.total_amount), 2)      AS avg_txn_value
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
GROUP BY d.is_festive_season;


-- ═══════════════════════════════════════════════════════════════════════
-- OPERATIONS KPIs
-- ═══════════════════════════════════════════════════════════════════════

-- KPI O1: Inventory Turnover by Category
SELECT '=== INVENTORY TURNOVER (CATEGORY) ===' AS section;
WITH sold AS (
    SELECT p.category, SUM(f.quantity) AS total_sold
    FROM fact_sales f
    JOIN dim_product p ON f.product_sk = p.product_sk
    GROUP BY p.category
),
stock AS (
    SELECT category, AVG(quantity_on_hand) AS avg_stock
    FROM inventory
    GROUP BY category
)
SELECT
    s.category,
    s.total_sold,
    ROUND(st.avg_stock, 0)                               AS avg_inventory,
    ROUND(s.total_sold * 1.0 / NULLIF(st.avg_stock, 0), 2) AS turnover_ratio
FROM sold s
JOIN stock st ON s.category = st.category
ORDER BY turnover_ratio DESC;


-- KPI O2: Stockout Rate
SELECT '=== STOCKOUT RATE ===' AS section;
SELECT
    COUNT(*) AS total_records,
    SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) AS stockout_records,
    ROUND(SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS stockout_pct
FROM inventory;


-- KPI O3: Delivery Performance by Carrier
SELECT '=== CARRIER PERFORMANCE ===' AS section;
SELECT
    carrier,
    COUNT(*) AS shipments,
    ROUND(AVG(CASE WHEN delivery_days IS NOT NULL THEN delivery_days END), 1) AS avg_days,
    SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) AS delayed,
    ROUND(SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS delay_pct
FROM shipments
GROUP BY carrier
ORDER BY avg_days ASC;


-- KPI O4: Delivery Bottleneck Routes
SELECT '=== BOTTLENECK ROUTES (avg >= 5 days) ===' AS section;
SELECT
    destination_city,
    COUNT(*) AS shipments,
    ROUND(AVG(CASE WHEN delivery_days IS NOT NULL THEN delivery_days END), 1) AS avg_days,
    SUM(CASE WHEN delivery_days >= 7 THEN 1 ELSE 0 END) AS slow_shipments
FROM shipments
GROUP BY destination_city
HAVING AVG(delivery_days) >= 5
ORDER BY avg_days DESC;


-- KPI O5: Seasonal Demand (monthly by category)
SELECT '=== SEASONAL DEMAND ===' AS section;
SELECT
    d.year_month,
    p.category,
    SUM(f.quantity) AS units_sold
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product p ON f.product_sk = p.product_sk
GROUP BY d.year_month, p.category
ORDER BY d.year_month, p.category;


-- ═══════════════════════════════════════════════════════════════════════
-- CUSTOMER KPIs
-- ═══════════════════════════════════════════════════════════════════════

-- KPI U1: New vs Returning Customers (monthly)
SELECT '=== NEW vs RETURNING CUSTOMERS ===' AS section;
WITH first_purchase AS (
    SELECT customer_sk, MIN(d.year_month) AS first_month
    FROM fact_sales f
    JOIN dim_date d ON f.date_key = d.date_key
    GROUP BY customer_sk
),
monthly_customers AS (
    SELECT d.year_month, f.customer_sk, fp.first_month
    FROM fact_sales f
    JOIN dim_date d ON f.date_key = d.date_key
    JOIN first_purchase fp ON f.customer_sk = fp.customer_sk
    GROUP BY d.year_month, f.customer_sk, fp.first_month
)
SELECT
    year_month,
    COUNT(DISTINCT customer_sk)                                                    AS total,
    COUNT(DISTINCT CASE WHEN year_month = first_month THEN customer_sk END)        AS new_customers,
    COUNT(DISTINCT CASE WHEN year_month != first_month THEN customer_sk END)       AS returning
FROM monthly_customers
GROUP BY year_month
ORDER BY year_month;


-- KPI U2: Customer Lifetime Value (Top 20)
SELECT '=== TOP 20 CLV ===' AS section;
SELECT
    c.customer_id,
    c.customer_name,
    c.city,
    SUM(f.total_amount)              AS lifetime_value,
    COUNT(*)                         AS transactions,
    MIN(f.transaction_date)          AS first_purchase,
    MAX(f.transaction_date)          AS last_purchase
FROM fact_sales f
JOIN dim_customer c ON f.customer_sk = c.customer_sk
WHERE c.is_current = TRUE
GROUP BY c.customer_id, c.customer_name, c.city
ORDER BY lifetime_value DESC
LIMIT 20;


-- KPI U3: RFM Raw Scores
SELECT '=== RFM SCORES ===' AS section;
SELECT
    c.customer_id,
    c.customer_name,
    c.city,
    DATEDIFF('day', MAX(f.transaction_date), DATE '2025-01-31') AS recency_days,
    COUNT(DISTINCT f.transaction_date)                           AS frequency,
    SUM(f.total_amount)                                          AS monetary
FROM fact_sales f
JOIN dim_customer c ON f.customer_sk = c.customer_sk
WHERE c.is_current = TRUE
GROUP BY c.customer_id, c.customer_name, c.city
ORDER BY monetary DESC
LIMIT 20;


-- KPI U4: Repeat Rate
SELECT '=== REPEAT RATE ===' AS section;
WITH purchase_counts AS (
    SELECT customer_sk, COUNT(DISTINCT transaction_date) AS purchase_days
    FROM fact_sales
    GROUP BY customer_sk
)
SELECT
    COUNT(*) AS total_customers,
    SUM(CASE WHEN purchase_days = 1 THEN 1 ELSE 0 END) AS one_time,
    SUM(CASE WHEN purchase_days >= 2 THEN 1 ELSE 0 END) AS repeat_buyers,
    ROUND(SUM(CASE WHEN purchase_days >= 2 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS repeat_rate_pct
FROM purchase_counts;


-- KPI U5: SCD Type 2 — Customers who changed city
SELECT '=== CUSTOMER CITY CHANGES (SCD TYPE 2) ===' AS section;
SELECT
    c1.customer_id,
    c1.customer_name,
    c1.city AS old_city,
    c2.city AS new_city,
    c1.valid_from AS moved_from,
    c1.valid_to AS moved_on
FROM dim_customer c1
JOIN dim_customer c2 ON c1.customer_id = c2.customer_id AND c2.version = 2
WHERE c1.version = 1 AND c1.is_current = FALSE
ORDER BY c1.customer_id
LIMIT 10;
