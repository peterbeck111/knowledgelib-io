#!/usr/bin/env bash
# Input:  MySQL source and PostgreSQL target connection details
# Output: Migrated and validated PostgreSQL database

set -euo pipefail

MYSQL_URI="mysql://root:password@mysql-host:3306/mydb"
PG_URI="postgresql://postgres:password@pg-host:5432/mydb_pg"
LOAD_FILE="migration.load"

echo "=== Step 1: Create target database ==="
psql "${PG_URI%/*}/postgres" -c "DROP DATABASE IF EXISTS mydb_pg;"
psql "${PG_URI%/*}/postgres" -c "CREATE DATABASE mydb_pg ENCODING 'UTF8';"

echo "=== Step 2: Run pgloader ==="
pgloader "$LOAD_FILE" 2>&1 | tee pgloader_output.log

echo "=== Step 3: Check for errors ==="
if grep -qi 'error' pgloader_output.log; then
    echo "ERRORS DETECTED — review pgloader_output.log"
    exit 1
fi

echo "=== Step 4: Validate row counts ==="
psql "$PG_URI" -c "
SELECT schemaname, relname AS table_name, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;"

echo "=== Step 5: Verify sequences ==="
psql "$PG_URI" -c "
SELECT sequencename, last_value
FROM pg_sequences
WHERE schemaname = 'public';"

echo "=== Step 6: Run ANALYZE ==="
psql "$PG_URI" -c "ANALYZE;"

echo "=== Migration complete ==="
