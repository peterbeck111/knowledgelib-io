#!/bin/bash
# Input:  PostgreSQL connection params
# Output: Index creation candidates based on sequential scan statistics

DB="${PGDATABASE:-mydb}"
HOST="${PGHOST:-localhost}"
PORT="${PGPORT:-5432}"
USER="${PGUSER:-postgres}"

PSQL="psql -h $HOST -p $PORT -U $USER -d $DB -t -A -F'|'"

echo "=== PostgreSQL Index Opportunity Report ==="
echo "Database: $DB | $(date)"
echo ""

echo "--- Tables with high sequential scan ratio (> 10k rows, seq_scan > idx_scan) ---"
eval "$PSQL" -c "
SELECT
  relname AS table_name,
  seq_scan,
  idx_scan,
  n_live_tup,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
  AND seq_scan > idx_scan * 2
ORDER BY seq_scan * n_live_tup DESC
LIMIT 10;" | while IFS='|' read -r table seq idx rows size; do
    echo "  TABLE: $table | rows=$rows size=$size | seq=$seq idx=$idx"
    echo "  ACTION: Identify slow queries on $table via pg_stat_statements"
    echo "          Then: CREATE INDEX CONCURRENTLY idx_${table}_colname ON $table (colname);"
    echo ""
done

echo "--- Unused indexes (0 scans since last stats reset) ---"
eval "$PSQL" -c "
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%pkey%'
  AND indexrelname NOT LIKE '%unique%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;" | while IFS='|' read -r table index size; do
    echo "  UNUSED: $table.$index ($size)"
    echo "  ACTION: DROP INDEX CONCURRENTLY $index;  -- verify no foreign key dependency first"
    echo ""
done

echo "--- Tables needing ANALYZE (not analyzed in 7+ days with > 1k rows) ---"
eval "$PSQL" -c "
SELECT relname, COALESCE(last_analyze::date::text, 'never') AS last_analyzed, n_live_tup
FROM pg_stat_user_tables
WHERE (last_analyze < NOW() - INTERVAL '7 days' OR last_analyze IS NULL)
  AND n_live_tup > 1000
ORDER BY n_live_tup DESC LIMIT 5;" | while IFS='|' read -r table date rows; do
    echo "  STALE: $table (last analyzed: $date, rows: $rows)"
    echo "  ACTION: ANALYZE $table;"
    echo ""
done
