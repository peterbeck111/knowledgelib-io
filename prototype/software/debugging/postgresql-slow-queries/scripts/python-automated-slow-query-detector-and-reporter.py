#!/usr/bin/env python3
"""
Input:  PostgreSQL connection string + threshold_ms (default 100ms)
Output: Ranked slow query report with index recommendations

Requirements: pip install psycopg2-binary
"""
import psycopg2
import sys
from typing import Optional

def get_slow_query_report(dsn: str, threshold_ms: float = 100.0, limit: int = 20) -> list[dict]:
    """
    Input:  PostgreSQL DSN, minimum mean_exec_time in ms, result limit
    Output: List of slow query dicts with recommendations
    """
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    # Check pg_stat_statements is available
    cur.execute("SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'")
    if not cur.fetchone():
        raise RuntimeError("pg_stat_statements extension is not installed. "
                           "Add 'pg_stat_statements' to shared_preload_libraries.")

    cur.execute("""
        SELECT
            queryid,
            calls,
            round(total_exec_time::numeric, 2) AS total_ms,
            round(mean_exec_time::numeric, 2)  AS mean_ms,
            round(min_exec_time::numeric, 2)   AS min_ms,
            round(max_exec_time::numeric, 2)   AS max_ms,
            round(stddev_exec_time::numeric, 2) AS stddev_ms,
            rows,
            shared_blks_hit + shared_blks_read AS total_blocks,
            shared_blks_read AS disk_reads,
            left(regexp_replace(query, E'\\\\s+', ' ', 'g'), 200) AS query_text
        FROM pg_stat_statements
        WHERE mean_exec_time > %s AND calls > 5
        ORDER BY total_exec_time DESC
        LIMIT %s
    """, (threshold_ms, limit))

    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]

    # Add recommendations
    for r in rows:
        recs = []
        if r['disk_reads'] > r['total_blocks'] * 0.5:
            recs.append('High disk reads — increase shared_buffers or add index')
        if r['stddev_ms'] > r['mean_ms'] * 2:
            recs.append('High variance — possible lock contention or parameter sensitivity')
        if 'SELECT *' in r['query_text'].upper():
            recs.append('Avoid SELECT * — specify only needed columns')
        if 'OFFSET' in r['query_text'].upper():
            recs.append('OFFSET pagination is O(n) — consider keyset/cursor pagination')
        r['recommendations'] = recs or ['Run EXPLAIN (ANALYZE, BUFFERS) for detailed analysis']

    cur.close()
    conn.close()
    return rows

def print_report(rows: list[dict]) -> None:
    print(f"{'#':<3} {'mean_ms':>8} {'calls':>7} {'total_ms':>10}  Query")
    print("-" * 100)
    for i, r in enumerate(rows, 1):
        print(f"{i:<3} {r['mean_ms']:>8} {r['calls']:>7} {r['total_ms']:>10}  {r['query_text'][:70]}")
        for rec in r['recommendations']:
            print(f"    → {rec}")

if __name__ == '__main__':
    dsn = sys.argv[1] if len(sys.argv) > 1 else 'postgresql://localhost/mydb'
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 100.0
    try:
        report = get_slow_query_report(dsn, threshold)
        print(f"\n=== PostgreSQL Slow Query Report (mean > {threshold}ms) ===\n")
        print_report(report)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
