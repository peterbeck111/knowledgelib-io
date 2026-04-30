-- Input:  T-SQL patterns commonly found in SQL Server applications
-- Output: PostgreSQL PL/pgSQL equivalents

-- 1. Temporary tables: # prefix → CREATE TEMP TABLE
-- SQL Server:  SELECT * INTO #temp_users FROM users WHERE active = 1
-- PostgreSQL:
CREATE TEMP TABLE temp_users AS
SELECT * FROM users WHERE active = TRUE;

-- 2. String concatenation: + → ||
-- SQL Server:  SELECT first_name + ' ' + last_name AS full_name
-- PostgreSQL:
SELECT first_name || ' ' || last_name AS full_name FROM users;

-- 3. Date functions
-- SQL Server:  DATEADD(day, 30, GETDATE())
-- PostgreSQL:
SELECT NOW() + INTERVAL '30 days';

-- SQL Server:  DATEDIFF(day, start_date, end_date)
-- PostgreSQL:
SELECT end_date - start_date AS days_diff FROM events;
-- or: SELECT EXTRACT(EPOCH FROM (end_date - start_date)) / 86400

-- 4. IF EXISTS pattern
-- SQL Server:  IF EXISTS (SELECT 1 FROM users WHERE email = @email)
-- PostgreSQL:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'test@example.com') THEN
        RAISE NOTICE 'User exists';
    END IF;
END;
$$;

-- 5. Pagination: OFFSET FETCH vs LIMIT OFFSET
-- SQL Server:  ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY
-- PostgreSQL:
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;

-- 6. MERGE → INSERT ... ON CONFLICT
-- SQL Server:
-- MERGE INTO target USING source ON target.id = source.id
-- WHEN MATCHED THEN UPDATE SET ...
-- WHEN NOT MATCHED THEN INSERT ...;
-- PostgreSQL:
INSERT INTO target (id, name, value)
SELECT id, name, value FROM source
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, value = EXCLUDED.value;

-- 7. Error handling: TRY/CATCH → EXCEPTION
-- SQL Server:
-- BEGIN TRY ... END TRY BEGIN CATCH ... END CATCH
-- PostgreSQL:
DO $$
BEGIN
    INSERT INTO users (email) VALUES ('dup@example.com');
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Duplicate email, skipping';
END;
$$;
