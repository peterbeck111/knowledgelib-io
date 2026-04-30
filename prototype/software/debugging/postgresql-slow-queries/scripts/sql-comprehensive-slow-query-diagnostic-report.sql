-- Input:  pg_stat_statements and pg_stat_user_tables/indexes must be available
-- Output: Actionable report: slowest queries, missing index candidates, unused indexes, stale stats

-- 1. Top 10 slowest queries by total time
SELECT '=== TOP 10 SLOW QUERIES ===' AS section, NULL AS detail UNION ALL
SELECT
  'Query #' || row_number() OVER (ORDER BY total_exec_time DESC) AS section,
  format('total_ms=%s mean_ms=%s calls=%s | %s',
    round(total_exec_time::numeric,1),
    round(mean_exec_time::numeric,1),
    calls,
    left(regexp_replace(query, '\s+', ' ', 'g'), 100)
  ) AS detail
FROM pg_stat_statements
WHERE calls > 5
ORDER BY total_exec_time DESC
LIMIT 10;

-- 2. Tables with possible missing indexes (> 10k rows, low index scan ratio)
SELECT
  relname AS table_name,
  seq_scan,
  idx_scan,
  CASE WHEN seq_scan + idx_scan > 0
       THEN round(idx_scan::numeric * 100 / (seq_scan + idx_scan), 1)
       ELSE NULL END AS idx_scan_pct,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
  AND seq_scan > idx_scan
ORDER BY seq_scan DESC
LIMIT 10;

-- 3. Unused indexes (never scanned since last stats reset)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans_since_reset,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%pkey%'  -- keep primary keys
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- 4. Tables with stale statistics (not analyzed in > 7 days)
SELECT
  relname,
  last_analyze::date,
  last_autoanalyze::date,
  n_live_tup AS rows,
  n_dead_tup AS dead_rows,
  round(n_dead_tup::numeric * 100 / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
FROM pg_stat_user_tables
WHERE (last_analyze < NOW() - INTERVAL '7 days' OR last_analyze IS NULL)
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC
LIMIT 10;
