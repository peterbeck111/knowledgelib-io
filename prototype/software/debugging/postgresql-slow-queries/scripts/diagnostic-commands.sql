-- === Find slow queries ===
-- Top queries by total time
SELECT round(total_exec_time::numeric,1) AS total_ms,
       round(mean_exec_time::numeric,1)  AS mean_ms,
       calls,
       left(query, 100) AS query
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;

-- Currently running queries > 5 seconds
SELECT pid, now()-query_start AS duration, state, left(query,100) AS query
FROM pg_stat_activity
WHERE state = 'active' AND now()-query_start > interval '5 seconds'
ORDER BY duration DESC;

-- === Analyze a query ===
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;   -- for tooling

-- === Index diagnostics ===
-- Missing index candidates
SELECT relname, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND n_live_tup > 10000
ORDER BY seq_scan DESC;

-- Unused indexes
SELECT tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%';

-- Index bloat check
SELECT relname, n_live_tup, n_dead_tup,
       round(n_dead_tup::numeric*100/NULLIF(n_live_tup+n_dead_tup,0),1) AS dead_pct
FROM pg_stat_user_tables WHERE n_dead_tup > 10000 ORDER BY n_dead_tup DESC;

-- === Statistics ===
SELECT relname, last_analyze, last_autoanalyze FROM pg_stat_user_tables
WHERE last_analyze < NOW()-INTERVAL '7 days' OR last_analyze IS NULL;

ANALYZE tablename;       -- refresh statistics
VACUUM ANALYZE tablename; -- reclaim space + refresh stats

-- === Memory ===
SHOW shared_buffers;     -- main buffer pool (recommend: 25% of RAM)
SHOW work_mem;           -- per-sort/hash memory
SET work_mem = '64MB';   -- increase for heavy sort/hash sessions

-- === Online tools ===
-- explain.depesz.com  — paste EXPLAIN output for visual analysis
-- explain.dalibo.com  — alternative EXPLAIN visualizer
-- pganalyze.com       — continuous query monitoring SaaS
