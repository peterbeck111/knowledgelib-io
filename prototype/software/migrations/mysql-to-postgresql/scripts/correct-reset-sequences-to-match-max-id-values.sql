-- ✅ GOOD — Reset all sequences after migration
-- pgloader does this with `reset sequences` option

-- Manual reset for a specific table:
SELECT setval(
  pg_get_serial_sequence('users', 'id'),
  COALESCE(MAX(id), 1)
) FROM users;

-- Reset ALL sequences in the database:
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name,
           pg_get_serial_sequence(c.table_name, c.column_name) AS seq
    FROM information_schema.columns c
    WHERE c.column_default LIKE 'nextval%'
      AND c.table_schema = 'public'
  LOOP
    EXECUTE format(
      'SELECT setval(%L, COALESCE(MAX(%I), 1)) FROM %I',
      r.seq, r.column_name, r.table_name
    );
  END LOOP;
END $$;
