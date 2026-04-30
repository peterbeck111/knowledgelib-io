-- Input:  orders + products tables with millions of rows
-- Output: precomputed category-level daily aggregations

-- 1. Create the materialized view
CREATE MATERIALIZED VIEW mv_daily_category_stats AS
SELECT
    order_date::date AS day,
    p.category,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    COUNT(*) AS order_count,
    SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
GROUP BY 1, 2
WITH DATA;

-- 2. Create unique index (required for CONCURRENTLY)
CREATE UNIQUE INDEX ON mv_daily_category_stats (day, category);

-- 3. Refresh without blocking reads
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_category_stats;

-- 4. Query the materialized view (uses indexes, sub-ms response)
SELECT category, SUM(revenue) AS total_revenue
FROM mv_daily_category_stats
WHERE day >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category
ORDER BY total_revenue DESC;
