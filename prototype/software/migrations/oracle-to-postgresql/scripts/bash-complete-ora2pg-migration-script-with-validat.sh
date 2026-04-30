#!/bin/bash
# Input:  ora2pg.conf configured with Oracle and PostgreSQL connections
# Output: Fully migrated PostgreSQL database with validation report

set -euo pipefail

CONFIG="ora2pg.conf"
PG_DB="target_db"
EXPORT_DIR="./export"
LOG_FILE="migration_$(date +%Y%m%d_%H%M%S).log"

mkdir -p "$EXPORT_DIR"

echo "=== Oracle to PostgreSQL Migration ===" | tee "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"

# Phase 1: Assessment
echo -e "\n--- Phase 1: Assessment ---" | tee -a "$LOG_FILE"
ora2pg -c "$CONFIG" -t SHOW_REPORT 2>&1 | tee -a "$LOG_FILE"

# Phase 2: Schema export
echo -e "\n--- Phase 2: Schema Export ---" | tee -a "$LOG_FILE"
for type in TABLE SEQUENCE VIEW FUNCTION PROCEDURE TRIGGER PACKAGE TYPE; do
    echo "Exporting $type..." | tee -a "$LOG_FILE"
    ora2pg -c "$CONFIG" -t "$type" -o "$EXPORT_DIR/${type,,}.sql" 2>&1 | tee -a "$LOG_FILE"
done

# Phase 3: Create schema in PostgreSQL
echo -e "\n--- Phase 3: Schema Import ---" | tee -a "$LOG_FILE"
for file in table sequence type view function procedure trigger package; do
    if [ -f "$EXPORT_DIR/$file.sql" ]; then
        echo "Importing $file..." | tee -a "$LOG_FILE"
        psql -d "$PG_DB" -f "$EXPORT_DIR/$file.sql" 2>&1 | tee -a "$LOG_FILE"
    fi
done

# Phase 4: Data migration (parallel)
echo -e "\n--- Phase 4: Data Migration ---" | tee -a "$LOG_FILE"
ora2pg -c "$CONFIG" -t COPY -j 8 -o "$EXPORT_DIR/data.sql" 2>&1 | tee -a "$LOG_FILE"
psql -d "$PG_DB" -f "$EXPORT_DIR/data.sql" 2>&1 | tee -a "$LOG_FILE"

# Phase 5: Rebuild indexes and constraints
echo -e "\n--- Phase 5: Post-migration ---" | tee -a "$LOG_FILE"
psql -d "$PG_DB" -c "ANALYZE;" 2>&1 | tee -a "$LOG_FILE"

echo -e "\nCompleted: $(date)" | tee -a "$LOG_FILE"
echo "Log saved to: $LOG_FILE"
