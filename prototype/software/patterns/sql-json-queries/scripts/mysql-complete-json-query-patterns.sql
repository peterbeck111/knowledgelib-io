-- Input:  events table with JSON data column
-- Output: filtered, extracted, aggregated JSON data

-- 1. Extract + filter with generated column
SELECT data->>'$.type' AS event_type,
       CAST(JSON_EXTRACT(data, '$.amount') AS DECIMAL(10,2)) AS amount,
       data->>'$.user.name' AS user_name
FROM events
WHERE data->>'$.type' = 'purchase'
  AND CAST(JSON_EXTRACT(data, '$.amount') AS DECIMAL(10,2)) > 25.00;

-- 2. JSON_CONTAINS for object/array membership
SELECT * FROM events
WHERE JSON_CONTAINS(data, '{"name": "Alice"}', '$.user');

SELECT * FROM events
WHERE JSON_CONTAINS(data, '"mobile"', '$.tags');

-- 3. Path existence check
SELECT * FROM events
WHERE JSON_CONTAINS_PATH(data, 'one', '$.user.email');

-- 4. MEMBER OF for array search (8.0.17+, uses multi-valued index)
SELECT * FROM events
WHERE 'mobile' MEMBER OF(data->'$.tags');

-- 5. JSON_TABLE to flatten arrays (8.0.4+)
SELECT e.id, jt.*
FROM events e,
     JSON_TABLE(e.data, '$.tags[*]' COLUMNS(
         row_num FOR ORDINALITY,
         tag VARCHAR(100) PATH '$'
     )) AS jt;

-- 6. Modify JSON in-place
UPDATE events
SET data = JSON_SET(data, '$.user.email', 'alice@example.com')
WHERE data->>'$.user.name' = 'Alice';
