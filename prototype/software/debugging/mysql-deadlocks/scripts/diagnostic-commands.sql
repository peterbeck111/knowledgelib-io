-- === View last deadlock ===
SHOW ENGINE INNODB STATUS\G
-- Look for "LATEST DETECTED DEADLOCK" section

-- === Enable persistent deadlock logging ===
SET GLOBAL innodb_print_all_deadlocks = ON;
-- Check: SHOW VARIABLES LIKE 'innodb_print_all_deadlocks';

-- === Check current InnoDB lock wait timeout ===
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
-- Default: 50 seconds

-- === Check deadlock detection status ===
SHOW VARIABLES LIKE 'innodb_deadlock_detect';
-- Default: ON

-- === View currently waiting transactions ===
SELECT trx_id, trx_state, trx_started,
       trx_wait_started, trx_mysql_thread_id,
       trx_query
FROM information_schema.INNODB_TRX
WHERE trx_state = 'LOCK WAIT';

-- === View current locks (MySQL 8.0+) ===
SELECT ENGINE_TRANSACTION_ID, OBJECT_NAME, INDEX_NAME,
       LOCK_TYPE, LOCK_MODE, LOCK_STATUS, LOCK_DATA
FROM performance_schema.data_locks;

-- === View lock waits (MySQL 8.0+) ===
SELECT * FROM performance_schema.data_lock_waits;

-- === For MySQL 5.7 (deprecated in 8.0) ===
SELECT * FROM information_schema.INNODB_LOCK_WAITS;
SELECT * FROM information_schema.INNODB_LOCKS;

-- === Percona Toolkit: continuous deadlock logger ===
-- pt-deadlock-logger --user=root --password=xxx h=localhost

-- === Check deadlock count (MySQL 8.0+) ===
SELECT COUNT FROM information_schema.INNODB_METRICS
WHERE NAME = 'lock_deadlocks';

-- === Kill a blocking thread if necessary ===
-- KILL <thread_id>;
