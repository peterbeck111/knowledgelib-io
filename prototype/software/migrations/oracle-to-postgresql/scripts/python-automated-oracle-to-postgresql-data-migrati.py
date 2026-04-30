# Input:  Oracle connection + PostgreSQL connection + list of tables
# Output: Migrated data with row count validation per table

import oracledb  # cx_Oracle is now oracledb (v2.0+)
import psycopg  # psycopg 3.x (async-capable)
from typing import Dict, Tuple

def migrate_table(
    ora_conn: oracledb.Connection,
    pg_conn: psycopg.Connection,
    table_name: str,
    batch_size: int = 10000,
) -> Tuple[int, int]:
    """Migrate a single table from Oracle to PostgreSQL with validation."""
    ora_cur = ora_conn.cursor()
    pg_cur = pg_conn.cursor()

    # Get Oracle row count
    ora_cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    ora_count = ora_cur.fetchone()[0]

    # Fetch and insert in batches
    ora_cur.execute(f"SELECT * FROM {table_name}")
    columns = [desc[0].lower() for desc in ora_cur.description]
    placeholders = ", ".join(["%s"] * len(columns))
    insert_sql = f'INSERT INTO {table_name.lower()} ({", ".join(columns)}) VALUES ({placeholders})'

    inserted = 0
    while True:
        rows = ora_cur.fetchmany(batch_size)
        if not rows:
            break
        # Handle Oracle NULL/empty string conversion
        cleaned_rows = [
            tuple(None if val == "" else val for val in row)
            for row in rows
        ]
        pg_cur.executemany(insert_sql, cleaned_rows)
        inserted += len(rows)

    pg_conn.commit()

    # Validate row count
    pg_cur.execute(f"SELECT COUNT(*) FROM {table_name.lower()}")
    pg_count = pg_cur.fetchone()[0]

    if ora_count != pg_count:
        raise ValueError(
            f"Row count mismatch for {table_name}: Oracle={ora_count}, PG={pg_count}"
        )

    return ora_count, pg_count

def migrate_database(
    oracle_dsn: str,
    pg_dsn: str,
    tables: list[str],
) -> Dict[str, Tuple[int, int]]:
    """Migrate multiple tables with summary report."""
    ora_conn = oracledb.connect(oracle_dsn)
    pg_conn = psycopg.connect(pg_dsn)

    results = {}
    for table in tables:
        try:
            counts = migrate_table(ora_conn, pg_conn, table)
            results[table] = counts
            print(f"  ✓ {table}: {counts[0]} rows migrated")
        except Exception as e:
            print(f"  ✗ {table}: {e}")
            results[table] = (0, 0)

    ora_conn.close()
    pg_conn.close()
    return results
