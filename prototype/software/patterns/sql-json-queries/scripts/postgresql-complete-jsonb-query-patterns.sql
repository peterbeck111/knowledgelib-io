-- Input:  events table with jsonb data column
-- Output: filtered, extracted, aggregated JSON data

-- 1. Extract + filter + cast in one query
SELECT data->>'type' AS event_type,
       (data->>'amount')::numeric AS amount,
       data->'user'->>'name' AS user_name
FROM events
WHERE data @> '{"type": "purchase"}'::jsonb
  AND (data->>'amount')::numeric > 25.00
ORDER BY (data->>'amount')::numeric DESC;

-- 2. Containment with nested objects
SELECT * FROM events
WHERE data @> '{"user": {"name": "Alice"}}'::jsonb;

-- 3. Key existence checks
SELECT * FROM events WHERE data ? 'tags';           -- has 'tags' key
SELECT * FROM events WHERE data ?| ARRAY['email', 'phone']; -- has ANY key
SELECT * FROM events WHERE data ?& ARRAY['type', 'amount']; -- has ALL keys

-- 4. jsonpath queries (PostgreSQL 12+)
SELECT jsonb_path_query(data, '$.tags[*]') AS tag
FROM events;

SELECT * FROM events
WHERE jsonb_path_exists(data, '$.amount ? (@ > 30)');

-- 5. Aggregate into JSON
SELECT jsonb_agg(data->>'type') AS event_types,
       jsonb_object_agg(data->>'type', data->>'amount') AS type_amounts
FROM events;

-- 6. Update JSON fields (immutable — returns new jsonb)
UPDATE events
SET data = jsonb_set(data, '{user,email}', '"alice@example.com"')
WHERE data @> '{"user": {"name": "Alice"}}'::jsonb;
