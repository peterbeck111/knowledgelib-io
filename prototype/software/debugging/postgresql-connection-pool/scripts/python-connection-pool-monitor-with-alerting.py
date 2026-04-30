#!/usr/bin/env python3
"""
Input:  PostgreSQL DSN + alert thresholds
Output: Connection health report + alerts

Requirements: pip install psycopg2-binary
"""
import psycopg2
import sys
from dataclasses import dataclass

@dataclass
class ConnectionAlert:
    level: str  # OK, WARNING, CRITICAL
    message: str

def check_connection_health(dsn: str, warn_pct: float = 75.0, crit_pct: float = 90.0) -> dict:
    """
    Input:  DSN, warning threshold %, critical threshold %
    Output: Health report dict with connection breakdown and alerts
    """
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    alerts = []

    # Get limits
    cur.execute("SHOW max_connections")
    max_conn = int(cur.fetchone()[0])
    cur.execute("SHOW superuser_reserved_connections")
    reserved = int(cur.fetchone()[0])
    usable = max_conn - reserved

    # Get connection breakdown by state
    cur.execute("""
        SELECT state, count(*) AS cnt,
               max(EXTRACT(EPOCH FROM (now() - query_start)))::int AS max_age_sec
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid()
        GROUP BY state
    """)
    by_state = {row[0] or 'unknown': {'count': row[1], 'max_age_sec': row[2]}
                for row in cur.fetchall()}

    total = sum(v['count'] for v in by_state.values())
    pct = (total / usable) * 100

    # Determine health level
    if pct >= crit_pct:
        alerts.append(ConnectionAlert('CRITICAL',
            f'Connection pool {pct:.1f}% full ({total}/{usable}) — imminent FATAL error'))
    elif pct >= warn_pct:
        alerts.append(ConnectionAlert('WARNING',
            f'Connection pool {pct:.1f}% full ({total}/{usable})'))

    # Check for idle-in-transaction connections
    idle_txn = by_state.get('idle in transaction', {})
    if idle_txn.get('count', 0) > 5:
        alerts.append(ConnectionAlert('WARNING',
            f"{idle_txn['count']} connections idle in transaction "
            f"(max_age={idle_txn.get('max_age_sec',0)}s) — check for missing COMMIT"))

    # Check for connection leaks (many idle connections)
    idle = by_state.get('idle', {})
    if idle.get('count', 0) > usable * 0.5:
        alerts.append(ConnectionAlert('WARNING',
            f"{idle['count']} idle connections ({idle['count']/usable*100:.0f}% of pool) "
            f"— check for connection leaks in application"))

    # Top consumers
    cur.execute("""
        SELECT usename, application_name, client_addr::text, state, count(*)
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid()
        GROUP BY 1, 2, 3, 4
        ORDER BY count(*) DESC LIMIT 10
    """)
    top_consumers = cur.fetchall()

    cur.close()
    conn.close()

    return {
        'max_connections': max_conn,
        'reserved': reserved,
        'usable': usable,
        'used': total,
        'pct': round(pct, 1),
        'by_state': by_state,
        'alerts': alerts,
        'top_consumers': top_consumers,
    }

if __name__ == '__main__':
    dsn = sys.argv[1] if len(sys.argv) > 1 else 'postgresql://localhost/mydb'
    report = check_connection_health(dsn)

    print(f"\n=== PostgreSQL Connection Health ===")
    print(f"Connections: {report['used']}/{report['usable']} ({report['pct']}%)")
    print("\nBy state:")
    for state, info in report['by_state'].items():
        print(f"  {state:<25} {info['count']:>6}  (max_age: {info.get('max_age_sec',0)}s)")

    print("\nAlerts:")
    for alert in report['alerts']:
        print(f"  [{alert.level}] {alert.message}")
    if not report['alerts']:
        print("  OK — no issues detected")

    print("\nTop consumers:")
    for row in report['top_consumers']:
        print(f"  {row[0]}/{row[1]} @ {row[2]} [{row[3]}]: {row[4]} conns")
