-- Input:  Table 'daily_activity' with columns (user_id, activity_date)
-- Output: Consecutive date ranges (islands) per user
WITH flagged AS (
  SELECT user_id, activity_date,
    CASE
      WHEN activity_date - LAG(activity_date) OVER (
        PARTITION BY user_id ORDER BY activity_date
      ) = 1
      THEN 0 ELSE 1
    END AS new_island
  FROM daily_activity
),
grouped AS (
  SELECT user_id, activity_date,
    SUM(new_island) OVER (
      PARTITION BY user_id ORDER BY activity_date
      ROWS UNBOUNDED PRECEDING
    ) AS island_id
  FROM flagged
)
SELECT user_id,
       MIN(activity_date) AS island_start,
       MAX(activity_date) AS island_end,
       COUNT(*) AS consecutive_days
FROM grouped
GROUP BY user_id, island_id
ORDER BY user_id, island_start;
