# Input:  Database table with items to process
# Output: Processed items written back, failures in DLQ

import time
import psycopg2  # psycopg2==2.9.9

CHUNK_SIZE = 500
MAX_RETRIES = 3

def process_batch(conn, job_id):
    cursor = get_checkpoint(conn, job_id) or 0
    total, failed = 0, 0

    while True:
        items = fetch_chunk(conn, cursor, CHUNK_SIZE)
        if not items:
            break
        for item in items:
            for attempt in range(MAX_RETRIES):
                try:
                    result = process_item(item)  # your logic
                    upsert_result(conn, item["id"], result)
                    break
                except Exception as e:
                    if attempt == MAX_RETRIES - 1:
                        write_to_dlq(conn, job_id, item, str(e))
                        failed += 1
                    else:
                        time.sleep(2 ** attempt)  # exponential backoff
            total += 1
        cursor = items[-1]["id"]
        save_checkpoint(conn, job_id, cursor, len(items))
    return {"processed": total, "failed": failed}

def fetch_chunk(conn, cursor, size):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM items WHERE id > %s ORDER BY id LIMIT %s",
            (cursor, size)
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
