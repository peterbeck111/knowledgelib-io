# Input:  Bronze Delta table (raw events)
# Output: Silver Delta table (cleansed, deduplicated)

from pyspark.sql.functions import (
    from_json, col, to_date, row_number
)
from pyspark.sql.window import Window
from pyspark.sql.types import (
    StructType, StructField, StringType,
    DoubleType, TimestampType
)

payload_schema = StructType([
    StructField("user_id", StringType()),
    StructField("action", StringType()),
    StructField("amount", DoubleType()),
    StructField("timestamp", TimestampType())
])

bronze_df = spark.read.table("bronze.raw_events")

# Parse, cleanse, deduplicate
dedup_window = Window.partitionBy("event_id") \
    .orderBy(col("_ingested_at").desc())

silver_df = (bronze_df
    .withColumn("parsed",
                from_json(col("payload"), payload_schema))
    .select(
        "event_id",
        "event_type",
        col("parsed.user_id").alias("user_id"),
        col("parsed.action").alias("action"),
        col("parsed.amount").alias("amount"),
        col("parsed.timestamp").alias("event_ts"),
        to_date("parsed.timestamp").alias("event_date"),
        "_ingested_at"
    )
    .filter(col("event_id").isNotNull())
    .filter(col("user_id").isNotNull())
    .withColumn("rn", row_number().over(dedup_window))
    .filter(col("rn") == 1)
    .drop("rn"))

# Merge into Silver (upsert pattern)
from delta.tables import DeltaTable

if DeltaTable.isDeltaTable(spark, "s3://lakehouse/silver/events"):
    silver_table = DeltaTable.forPath(
        spark, "s3://lakehouse/silver/events")
    (silver_table.alias("target")
        .merge(silver_df.alias("source"),
               "target.event_id = source.event_id")
        .whenMatchedUpdateAll()
        .whenNotMatchedInsertAll()
        .execute())
else:
    (silver_df.write.format("delta")
        .partitionBy("event_date")
        .save("s3://lakehouse/silver/events"))
