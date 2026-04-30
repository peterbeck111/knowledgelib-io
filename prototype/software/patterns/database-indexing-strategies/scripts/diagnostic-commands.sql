-- PostgreSQL: check index usage statistics
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- PostgreSQL: check table index sizes
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes WHERE tablename = 'your_table';

-- PostgreSQL: check physical correlation for BRIN suitability
SELECT attname, correlation
FROM pg_stats WHERE tablename = 'your_table';

-- PostgreSQL: find duplicate indexes
SELECT indrelid::regclass AS table_name,
       array_agg(indexrelid::regclass) AS duplicate_indexes
FROM pg_index
GROUP BY indrelid, indkey
HAVING COUNT(*) > 1;

-- MySQL: check index cardinality and usage
SHOW INDEX FROM your_table;
SELECT * FROM sys.schema_index_statistics WHERE table_name = 'your_table';

-- MySQL: find redundant indexes
SELECT * FROM sys.schema_redundant_indexes;

-- SQL Server: find missing indexes suggested by the optimizer
SELECT mid.statement, mid.equality_columns, mid.inequality_columns,
       mid.included_columns, migs.avg_user_impact
FROM sys.dm_db_missing_index_details mid
JOIN sys.dm_db_missing_index_groups mig ON mid.index_handle = mig.index_handle
JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
ORDER BY migs.avg_user_impact DESC;

-- SQL Server: find unused indexes
SELECT OBJECT_NAME(i.object_id) AS table_name, i.name AS index_name,
       ius.user_seeks, ius.user_scans, ius.user_updates
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats ius ON i.object_id = ius.object_id AND i.index_id = ius.index_id
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND (ius.user_seeks + ius.user_scans) = 0
ORDER BY ius.user_updates DESC;
