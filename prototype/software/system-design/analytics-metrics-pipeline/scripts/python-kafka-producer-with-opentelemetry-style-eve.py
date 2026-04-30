# Input:  Application metrics (HTTP request durations, counters)
# Output: Structured events published to Kafka topic

from confluent_kafka import Producer  # confluent-kafka==2.6.1
import json, uuid, time

producer = Producer({
    "bootstrap.servers": "kafka:9092",
    "acks": "all",                    # wait for all ISR replicas
    "linger.ms": 5,                   # batch for 5ms to improve throughput
    "compression.type": "zstd",       # 3-5x compression ratio
    "enable.idempotence": True,       # exactly-once per partition
})

def emit_metric(name: str, value: float, tags: dict):
    event = {
        "event_id": str(uuid.uuid4()),
        "metric_name": name,
        "value": value,
        "timestamp_ms": int(time.time() * 1000),
        "tags": tags,                 # bounded cardinality only!
        "source": "api-gateway",
    }
    producer.produce(
        topic="metrics-events",
        key=name.encode(),            # partition by metric name
        value=json.dumps(event).encode(),
        callback=lambda err, msg: err and print(f"DLQ: {err}"),
    )

emit_metric("http_request_duration_ms", 42.5, {"method": "GET", "status": "200", "endpoint": "/api/users"})
producer.flush()
