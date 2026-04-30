# Input:  MySQL and PostgreSQL connection details
# Output: Comparison report of row counts and schema differences

import mysql.connector
import psycopg2

def validate_migration(mysql_config: dict, pg_config: dict) -> dict:
    """Compare row counts and detect schema mismatches after migration."""
    mysql_conn = mysql.connector.connect(**mysql_config)
    pg_conn = psycopg2.connect(**pg_config)
    mysql_cur = mysql_conn.cursor()
    pg_cur = pg_conn.cursor()

    # Get MySQL tables and row counts
    mysql_cur.execute("""
        SELECT table_name, table_rows
        FROM information_schema.tables
        WHERE table_schema = %s AND table_type = 'BASE TABLE'
    """, (mysql_config['database'],))
    mysql_tables = dict(mysql_cur.fetchall())

    # Get PostgreSQL tables and row counts
    pg_cur.execute("""
        SELECT relname, n_live_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
    """)
    pg_tables = dict(pg_cur.fetchall())

    report = {'matched': [], 'mismatched': [], 'missing_in_pg': []}
    for table, mysql_count in mysql_tables.items():
        pg_count = pg_tables.get(table)
        if pg_count is None:
            report['missing_in_pg'].append(table)
        elif abs(mysql_count - pg_count) <= 1:  # table_rows is approximate
            report['matched'].append(table)
        else:
            report['mismatched'].append({
                'table': table,
                'mysql_rows': mysql_count,
                'pg_rows': pg_count
            })

    mysql_conn.close()
    pg_conn.close()
    return report

# Usage
result = validate_migration(
    mysql_config={'host': 'mysql-host', 'database': 'mydb', 'user': 'root', 'password': 'pass'},
    pg_config={'host': 'pg-host', 'dbname': 'mydb_pg', 'user': 'postgres', 'password': 'pass'}
)
print(f"Matched: {len(result['matched'])}, Mismatched: {len(result['mismatched'])}, Missing: {len(result['missing_in_pg'])}")
