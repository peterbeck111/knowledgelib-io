#!/bin/bash
# Input:  PgBouncer admin connection params
# Output: Pool health report with warnings

PGB_HOST="${PGB_HOST:-127.0.0.1}"
PGB_PORT="${PGB_PORT:-6432}"
PGB_USER="${PGB_USER:-pgbouncer_admin}"
PGB_DB="pgbouncer"

PSQL="psql -h $PGB_HOST -p $PGB_PORT -U $PGB_USER $PGB_DB -t -A -F'|'"

echo "=== PgBouncer Health Report ==="
echo "$(date) | $PGB_HOST:$PGB_PORT"
echo ""

# Pool status
echo "--- Connection Pools ---"
eval "$PSQL" -c "SHOW POOLS;" | while IFS='|' read -r db user cl_active cl_waiting sv_active sv_idle sv_used sv_tested sv_login maxwait; do
    [ "$db" = "database" ] && continue  # skip header row
    [ -z "$db" ] && continue
    
    if [ "$cl_waiting" -gt "0" ] 2>/dev/null; then
        echo "  ⚠️  WAITING: $db/$user — cl_waiting=$cl_waiting cl_active=$cl_active sv_active=$sv_active sv_idle=$sv_idle"
    else
        echo "  ✅ OK:      $db/$user — cl_active=$cl_active sv_active=$sv_active sv_idle=$sv_idle"
    fi
done

echo ""
echo "--- Overall Stats ---"
eval "$PSQL" -c "SHOW STATS;" | while IFS='|' read -r db total_xact_count total_query_count total_received total_sent total_xact_time total_query_time total_wait_time avg_xact_count avg_query_count avg_recv avg_sent avg_xact_time avg_query_time avg_wait_time; do
    [ "$db" = "database" ] && continue
    [ -z "$db" ] && continue
    echo "  $db: avg_xact=${avg_xact_time}μs avg_wait=${avg_wait_time}μs total_queries=$total_query_count"
done

echo ""
echo "--- Server Connections ---"
eval "$PSQL" -c "SHOW SERVERS;" | while IFS='|' read -r type user db state addr port local_addr local_port connect_time request_time wait wait_us close_needed ptr link remote_pid tls_version; do
    [ "$type" = "type" ] && continue
    [ -z "$type" ] && continue
    echo "  [$state] $db/$user @ $addr:$port"
done

echo ""
echo "Actions if cl_waiting > 0:"
echo "  1. Increase pool_size in pgbouncer.ini"
echo "  2. Check for long-running transactions in PostgreSQL"
echo "  3. Check for connection leaks in application"
echo "  4. psql -h $PGB_HOST -p $PGB_PORT -U $PGB_USER $PGB_DB -c 'SHOW CLIENTS;'"
