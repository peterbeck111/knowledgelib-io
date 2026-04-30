-- Input:  Run this query on the PostgreSQL primary
-- Output: Connection health summary with recommendations

WITH connection_summary AS (
  SELECT
    state,
    count(*) AS cnt,
    avg(EXTRACT(EPOCH FROM (now() - query_start)))::int AS avg_age_sec,
    max(EXTRACT(EPOCH FROM (now() - query_start)))::int AS max_age_sec
  FROM pg_stat_activity
  WHERE pid <> pg_backend_pid()
  GROUP BY state
),
limits AS (
  SELECT
    current_setting('max_connections')::int AS max_conn,
    current_setting('superuser_reserved_connections')::int AS reserved
),
totals AS (
  SELECT count(*) AS total_conn FROM pg_stat_activity
)
SELECT
  l.max_conn,
  l.reserved,
  l.max_conn - l.reserved AS usable,
  t.total_conn AS used,
  round((t.total_conn::numeric / (l.max_conn - l.reserved)) * 100, 1) AS pct_used,
  CASE
    WHEN (t.total_conn::numeric / (l.max_conn - l.reserved)) > 0.90 THEN 'CRITICAL'
    WHEN (t.total_conn::numeric / (l.max_conn - l.reserved)) > 0.75 THEN 'WARNING'
    ELSE 'OK'
  END AS health,
  (SELECT cnt FROM connection_summary WHERE state = 'active') AS active,
  (SELECT cnt FROM connection_summary WHERE state = 'idle') AS idle,
  (SELECT cnt FROM connection_summary WHERE state = 'idle in transaction') AS idle_in_txn,
  (SELECT max_age_sec FROM connection_summary WHERE state = 'idle in transaction') AS max_idle_txn_sec
FROM limits l, totals t;
