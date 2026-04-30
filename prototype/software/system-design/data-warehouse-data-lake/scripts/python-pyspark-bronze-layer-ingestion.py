# Input:  Raw JSON files from S3/ADLS landing zone
# Output: Bronze Delta table with metadata columns

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    current_timestamp, input_file_name, col
)

spark = SparkSession.builder \
    .appName("bronze_ingestion") \
    .config("spark.sql.extensions",
            "io.delta.sql.DeltaSparkSessionExtension") \
    .getOrCreate()

# Auto Loader: incremental file ingestion
bronze_df = (spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation",
            "s3://lakehouse/schemas/events")
    .option("cloudFiles.inferColumnTypes", "true")
    .load("s3://landing-zone/events/"))

# Add ingestion metadata
bronze_with_meta = (bronze_df
    .withColumn("_ingested_at", current_timestamp())
    .withColumn("_source_file", input_file_name()))

# Write to Bronze Delta table
(bronze_with_meta.writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation",
            "s3://lakehouse/checkpoints/bronze_events")
    .trigger(availableNow=True)
    .toTable("bronze.raw_events"))
