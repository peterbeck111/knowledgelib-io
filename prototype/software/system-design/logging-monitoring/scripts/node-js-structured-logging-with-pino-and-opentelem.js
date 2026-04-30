// Input:  HTTP requests to an Express service
// Output: JSON log lines with trace context, request metadata

const pino = require("pino");       // pino@9.6.0
const { trace } = require("@opentelemetry/api"); // @opentelemetry/api@1.9.0

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ["req.headers.authorization", "body.password"],
});

function withTraceContext(log) {
  const span = trace.getActiveSpan();
  if (!span) return log;
  const ctx = span.spanContext();
  return log.child({
    trace_id: ctx.traceId,
    span_id: ctx.spanId,
  });
}

// Express middleware example
app.use((req, res, next) => {
  req.log = withTraceContext(logger).child({
    method: req.method,
    path: req.url,
    request_id: req.headers["x-request-id"],
  });
  req.log.info("request_received");
  next();
});
