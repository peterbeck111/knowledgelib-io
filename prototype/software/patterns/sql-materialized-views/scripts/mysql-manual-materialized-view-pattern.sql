-- Input:  orders table (MySQL has no native materialized views)
-- Output: manually maintained summary table simulating a materialized view

-- 1. Create the summary table
CREATE TABLE mv_daily_sales (
    sale_date DATE NOT NULL,
    product_id INT NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0,
    total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_refreshed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sale_date, product_id),
    INDEX idx_product (product_id),
    INDEX idx_date (sale_date)
) ENGINE=InnoDB;

-- 2. Full refresh procedure
DELIMITER //
CREATE PROCEDURE refresh_mv_daily_sales()
BEGIN
    TRUNCATE TABLE mv_daily_sales;
    INSERT INTO mv_daily_sales (sale_date, product_id, total_quantity, total_revenue)
    SELECT
        DATE(order_date) AS sale_date,
        product_id,
        SUM(quantity) AS total_quantity,
        SUM(quantity * unit_price) AS total_revenue
    FROM orders
    GROUP BY DATE(order_date), product_id;
END //
DELIMITER ;

-- 3. Automate with MySQL Event Scheduler
SET GLOBAL event_scheduler = ON;

CREATE EVENT refresh_daily_sales
ON SCHEDULE EVERY 1 HOUR
DO CALL refresh_mv_daily_sales();

-- 4. Manual refresh
CALL refresh_mv_daily_sales();
