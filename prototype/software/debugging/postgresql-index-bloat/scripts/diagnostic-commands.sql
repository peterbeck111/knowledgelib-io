-- === Identify bloat candidates ===
-- Indexes larger than their tables (strong bloat signal)
SELECT schemaname, relname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS idx_sz,
       pg_size_pretty(pg_relation_size(relid))      AS tbl_sz
FROM pg_stat_user_indexes
WHERE pg_relation_size(indexrelid) > pg_relation_size(relid)
ORDER BY pg_relation_size(indexrelid) DESC;

-- Precise bloat via pgstattuple (requires extension)
SELECT * FROM pgstatindex('schema.index_name');

-- Fast approximate bloat (PG 9.5+)
SELECT * FROM pgstattuple_approx('schema.index_name');

-- === Invalid index cleanup ===
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;

-- === Monitor ongoing REINDEX progress (PG 12+) ===
SELECT pid, phase, blocks_total, blocks_done,
       round(100.0 * blocks_done / NULLIF(blocks_total,0), 1) AS pct
FROM pg_stat_progress_create_index;

-- === Unused indexes (candidates to drop) ===
SELECT schemaname, relname, indexrelname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size,
       idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND pg_relation_size(indexrelid) > 10 * 1024 * 1024
ORDER BY pg_relation_size(indexrelid) DESC;

-- === HOT update ratio per table ===
SELECT relname, n_tup_upd, n_tup_hot_upd,
       round(n_tup_hot_upd::numeric / NULLIF(n_tup_upd,0) * 100, 1) AS hot_pct
FROM pg_stat_user_tables
WHERE n_tup_upd > 1000
ORDER BY n_tup_upd DESC;

-- === Check autovacuum health ===
SELECT relname, last_autovacuum, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / NULLIF(n_live_tup,0) * 100, 1) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC;
