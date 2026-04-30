# Input:  Application events during request handling
# Output: JSON log lines with trace_id, span_id, and structured fields

import structlog  # structlog==24.4.0
from opentelemetry import trace

# Configure structlog for JSON output with OTel context
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
)

logger = structlog.get_logger()

def process_order(order_id: str, amount: float):
    """Log with automatic trace context propagation."""
    span = trace.get_current_span()
    ctx = span.get_span_context()
    # Bind trace context so every log in this scope includes it
    logger.bind(
        trace_id=format(ctx.trace_id, "032x"),
        span_id=format(ctx.span_id, "016x"),
        order_id=order_id,
    )
    logger.info("order_processing_started", amount=amount)
    try:
        # ... business logic ...
        logger.info("order_processing_completed", amount=amount)
    except Exception as e:
        logger.error("order_processing_failed",
                     error=str(e), error_type=type(e).__name__)
        raise
