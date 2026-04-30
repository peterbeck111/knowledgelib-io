-- Input:  Pre-aggregated 1-minute rollup table
-- Output: Dashboard-ready time series with percentiles

-- Service latency p99 over last 24 hours (1-minute granularity)
SELECT
    ts,
    metric_name,
    source,
    quantileMerge(0.99)(val_p99) AS p99_latency,
    sumMerge(val_sum) / countMerge(cnt) AS avg_latency,
    countMerge(cnt) AS request_count
FROM metrics_1m
WHERE metric_name = 'http_request_duration_ms'
  AND ts > now() - INTERVAL 24 HOUR
GROUP BY ts, metric_name, source
ORDER BY ts;

-- Top 10 slowest endpoints in last hour
SELECT
    tags['endpoint'] AS endpoint,
    quantile(0.99)(value) AS p99_ms,
    count() AS total_requests
FROM metrics_raw
WHERE metric_name = 'http_request_duration_ms'
  AND timestamp_ms > now() - INTERVAL 1 HOUR
GROUP BY endpoint
ORDER BY p99_ms DESC
LIMIT 10;
