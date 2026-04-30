-- PostgreSQL: Show execution plan with timing and buffer info
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ... ;

-- PostgreSQL: Find queries consuming the most time (requires pg_stat_statements)
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- PostgreSQL: Check for unused indexes
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- PostgreSQL: Check table bloat and dead tuples
SELECT relname, n_dead_tup, n_live_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- MySQL: Show execution plan
EXPLAIN ANALYZE SELECT ... ;

-- MySQL: Check slow query log status
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';

-- MySQL: Show table index usage
SHOW INDEX FROM orders;

-- SQL Server: Show I/O and time statistics
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT ... ;

-- SQL Server: Show estimated execution plan
SET SHOWPLAN_XML ON;
GO
SELECT ... ;
GO
SET SHOWPLAN_XML OFF;
