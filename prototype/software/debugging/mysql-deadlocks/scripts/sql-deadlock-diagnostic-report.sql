-- Input:  MySQL 8.0+ with performance_schema enabled
-- Output: Current lock contention snapshot

-- 1. Show most recent deadlock
SHOW ENGINE INNODB STATUS\G

-- 2. Currently blocked transactions
SELECT
    r.trx_id AS blocked_trx,
    r.trx_mysql_thread_id AS blocked_thread,
    r.trx_query AS blocked_query,
    b.trx_id AS blocking_trx,
    b.trx_mysql_thread_id AS blocking_thread,
    b.trx_query AS blocking_query
FROM information_schema.INNODB_TRX r
JOIN performance_schema.data_lock_waits w
    ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID
JOIN information_schema.INNODB_TRX b
    ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID;

-- 3. All current locks held and waiting
SELECT
    ENGINE_TRANSACTION_ID AS trx_id,
    OBJECT_SCHEMA AS db,
    OBJECT_NAME AS tbl,
    INDEX_NAME AS idx,
    LOCK_TYPE,
    LOCK_MODE,
    LOCK_STATUS,
    LOCK_DATA
FROM performance_schema.data_locks
ORDER BY ENGINE_TRANSACTION_ID, LOCK_STATUS;
