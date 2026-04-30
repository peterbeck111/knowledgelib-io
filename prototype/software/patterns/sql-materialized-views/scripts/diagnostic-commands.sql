-- PostgreSQL: List all materialized views and their state
SELECT schemaname, matviewname, hasindexes, ispopulated
FROM pg_matviews ORDER BY matviewname;

-- PostgreSQL: Check materialized view size on disk
SELECT pg_size_pretty(pg_total_relation_size('mv_monthly_sales')) AS total_size;

-- PostgreSQL: Check indexes on a materialized view
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mv_monthly_sales';

-- PostgreSQL: Check if CONCURRENTLY is possible (has unique index?)
SELECT i.relname AS index_name, ix.indisunique
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
WHERE t.relname = 'mv_monthly_sales' AND ix.indisunique = true;

-- Oracle: Check materialized view staleness and last refresh
SELECT mview_name, staleness, last_refresh_type, last_refresh_date, compile_state
FROM user_mviews ORDER BY mview_name;

-- Oracle: Check materialized view log sizes
SELECT log_owner, master, log_table, rowids, primary_key, filter_columns
FROM all_mview_logs ORDER BY master;

-- SQL Server: List indexed views
SELECT v.name AS view_name, i.name AS index_name, i.type_desc
FROM sys.views v
JOIN sys.indexes i ON v.object_id = i.object_id
WHERE i.type_desc = 'CLUSTERED' ORDER BY v.name;

-- PostgreSQL: Check pg_cron refresh schedule
SELECT jobid, schedule, command, active, jobname
FROM cron.job WHERE command LIKE '%REFRESH%';
