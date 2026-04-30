-- models/gold/fct_daily_revenue.sql
-- Input:  Silver-layer orders and products tables
-- Output: Daily revenue fact table for BI dashboards
{{ config(
    materialized='table',
    partition_by={'field': 'order_date', 'data_type': 'date'},
    cluster_by=['product_category', 'region']
) }}

WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),
products AS (
    SELECT * FROM {{ ref('stg_products') }}
)
SELECT
    o.order_date,
    p.product_category,
    o.region,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.quantity * p.unit_price) AS gross_revenue,
    SUM(o.discount_amount) AS total_discounts,
    SUM(o.quantity * p.unit_price) - SUM(o.discount_amount) AS net_revenue
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY 1, 2, 3
