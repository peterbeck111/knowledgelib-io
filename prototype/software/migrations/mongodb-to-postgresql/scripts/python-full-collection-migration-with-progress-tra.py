# Input:  MongoDB connection string + collection name
# Output: Data migrated to PostgreSQL table with JSONB hybrid schema

import json
import time
import psycopg2                    # pip install psycopg2-binary==2.9.9
from pymongo import MongoClient    # pip install pymongo==4.8.0

MONGO_URI = "mongodb://localhost:27017"
PG_DSN = "dbname=myapp user=postgres host=localhost"
BATCH_SIZE = 5000

mongo = MongoClient(MONGO_URI)
pg_conn = psycopg2.connect(PG_DSN)
pg_cur = pg_conn.cursor()

def migrate_collection(db_name, collection_name, pg_table, field_map):
    """
    Migrate a MongoDB collection to a PostgreSQL table.
    field_map: dict mapping MongoDB field names to (pg_column, transform_fn) tuples.
    Unmapped fields are stored in a 'metadata' JSONB column.
    """
    coll = mongo[db_name][collection_name]
    total = coll.estimated_document_count()
    start = time.time()
    batch = []

    columns = [pg_col for pg_col, _ in field_map.values()]
    columns.append("metadata")
    placeholders = ", ".join(["%s"] * len(columns))
    insert_sql = f"""
        INSERT INTO {pg_table} ({', '.join(columns)})
        VALUES ({placeholders})
        ON CONFLICT DO NOTHING
    """

    for i, doc in enumerate(coll.find().batch_size(BATCH_SIZE), 1):
        row = []
        mapped_keys = set(field_map.keys()) | {"_id"}
        for mongo_field, (_, transform) in field_map.items():
            row.append(transform(doc.get(mongo_field)))
        # Remaining fields -> JSONB metadata
        extra = {k: v for k, v in doc.items() if k not in mapped_keys}
        row.append(json.dumps(extra, default=str))
        batch.append(tuple(row))

        if len(batch) >= BATCH_SIZE:
            pg_cur.executemany(insert_sql, batch)
            pg_conn.commit()
            elapsed = time.time() - start
            rate = i / elapsed
            print(f"  {i}/{total} ({i*100//total}%) — {rate:.0f} docs/sec")
            batch.clear()

    if batch:
        pg_cur.executemany(insert_sql, batch)
        pg_conn.commit()

    elapsed = time.time() - start
    print(f"Done: {total} docs in {elapsed:.1f}s ({total/elapsed:.0f} docs/sec)")

# Usage
migrate_collection(
    db_name="myapp",
    collection_name="users",
    pg_table="users",
    field_map={
        "email":     ("email",      lambda v: v),
        "name":      ("name",       lambda v: v or ""),
        "status":    ("status",     lambda v: v or "active"),
        "createdAt": ("created_at", lambda v: v.isoformat() if v else None),
        "updatedAt": ("updated_at", lambda v: v.isoformat() if v else None),
    }
)

pg_cur.close()
pg_conn.close()
mongo.close()
