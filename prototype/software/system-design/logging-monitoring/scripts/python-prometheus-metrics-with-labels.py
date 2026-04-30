# Input:  HTTP request handling in a Flask/FastAPI service
# Output: Prometheus metrics exposed at /metrics endpoint

from prometheus_client import (  # prometheus-client==0.21.1
    Counter, Histogram, Gauge, start_http_server
)

# RED method metrics for services
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)
# USE method metrics for resources
QUEUE_SIZE = Gauge(
    "task_queue_size",
    "Current number of tasks in the processing queue",
    ["queue_name"],
)

def track_request(method, endpoint, status, duration):
    """Record RED metrics for a completed request."""
    REQUEST_COUNT.labels(
        method=method, endpoint=endpoint, status=status
    ).inc()
    REQUEST_DURATION.labels(
        method=method, endpoint=endpoint
    ).observe(duration)

# Start metrics server on port 9090
start_http_server(9090)
