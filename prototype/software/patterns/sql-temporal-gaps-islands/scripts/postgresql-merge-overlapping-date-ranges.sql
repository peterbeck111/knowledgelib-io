-- Input:  Table 'subscriptions' with columns (user_id, start_date, end_date)
-- Output: Merged non-overlapping date ranges per user
WITH ordered AS (
  SELECT user_id, start_date, end_date,
    MAX(end_date) OVER (
      PARTITION BY user_id ORDER BY start_date
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS max_prev_end
  FROM subscriptions
),
flagged AS (
  SELECT *,
    CASE
      WHEN start_date <= max_prev_end THEN 0
      ELSE 1
    END AS new_group
  FROM ordered
),
grouped AS (
  SELECT *,
    SUM(new_group) OVER (
      PARTITION BY user_id ORDER BY start_date
      ROWS UNBOUNDED PRECEDING
    ) AS grp
  FROM flagged
)
SELECT user_id,
       MIN(start_date) AS merged_start,
       MAX(end_date) AS merged_end
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, merged_start;
