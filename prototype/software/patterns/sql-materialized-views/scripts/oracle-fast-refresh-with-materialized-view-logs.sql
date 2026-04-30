-- Input:  sales table with frequent inserts
-- Output: incrementally refreshed aggregation (only processes new rows)

-- 1. Create materialized view log on base table (required for FAST refresh)
CREATE MATERIALIZED VIEW LOG ON sales
WITH ROWID, SEQUENCE (product_id, customer_id, sale_date, amount)
INCLUDING NEW VALUES;

-- 2. Create materialized view with FAST refresh ON DEMAND
CREATE MATERIALIZED VIEW mv_product_sales
BUILD IMMEDIATE
REFRESH FAST ON DEMAND
ENABLE QUERY REWRITE
AS
SELECT
    product_id,
    COUNT(*) AS sale_count,
    SUM(amount) AS total_revenue,
    COUNT(*) AS cnt  -- required for FAST refresh with aggregates
FROM sales
GROUP BY product_id;

-- 3. After new data loads, refresh incrementally
EXEC DBMS_MVIEW.REFRESH('mv_product_sales', 'F');

-- 4. Check staleness
SELECT mview_name, staleness, last_refresh_type, last_refresh_date
FROM user_mviews
WHERE mview_name = 'MV_PRODUCT_SALES';
