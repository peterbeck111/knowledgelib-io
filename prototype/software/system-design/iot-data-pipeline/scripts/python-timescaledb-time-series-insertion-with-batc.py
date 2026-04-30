# Input:  List of telemetry dicts from stream processor
# Output: Batch-inserted rows in TimescaleDB hypertable

import psycopg2  # psycopg2-binary==2.9.9
from psycopg2.extras import execute_values

conn = psycopg2.connect(
    host="timescale.example.com",
    dbname="iot",
    user="writer",
    password="secret",
    sslmode="require"
)

def insert_batch(records):
    """Insert a batch of telemetry records efficiently.
    records: list of (time, device_id, location, metric, value)
    """
    sql = """
        INSERT INTO telemetry (time, device_id, location, metric, value)
        VALUES %s
        ON CONFLICT DO NOTHING
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, records, page_size=1000)
    conn.commit()

# Example: batch of 500 readings
batch = [
    ("2026-02-23T10:00:00Z", "sensor-001", "factory-01", "temperature_c", 23.5),
    ("2026-02-23T10:00:00Z", "sensor-002", "factory-01", "humidity_pct", 65.2),
    # ... up to 1000 per batch for optimal throughput
]
insert_batch(batch)
