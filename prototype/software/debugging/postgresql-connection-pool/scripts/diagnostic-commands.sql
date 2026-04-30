-- === Connection overview ===
SHOW max_connections;
SHOW superuser_reserved_connections;
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state ORDER BY count(*) DESC;

-- === Top consumers ===
SELECT usename, application_name, client_addr, state, count(*)
FROM pg_stat_activity
GROUP BY 1, 2, 3, 4
ORDER BY count(*) DESC LIMIT 20;

-- === Long-running / stuck connections ===
SELECT pid, usename, state, 
       now() - backend_start AS conn_age,
       now() - query_start   AS query_age,
       left(query, 80) AS query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_age DESC NULLS LAST
LIMIT 20;

-- === Emergency: kill idle connections ===
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < NOW() - INTERVAL '10 minutes'
  AND pid <> pg_backend_pid();

-- === Emergency: kill stuck transactions ===
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND pid <> pg_backend_pid();

-- === Headroom calculation ===
SELECT
  current_setting('max_connections')::int AS max_conn,
  current_setting('superuser_reserved_connections')::int AS reserved,
  (SELECT count(*) FROM pg_stat_activity) AS used,
  current_setting('max_connections')::int
    - current_setting('superuser_reserved_connections')::int
    - (SELECT count(*) FROM pg_stat_activity) AS slots_remaining;
