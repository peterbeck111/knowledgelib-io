# Input:  MySQL connection, list of (query, params) tuples
# Output: True on success, raises on non-deadlock error

import mysql.connector
import time
import logging

logger = logging.getLogger(__name__)

DEADLOCK_ERROR = 1213
LOCK_WAIT_TIMEOUT = 1205

def deadlock_retry(conn, operations, max_retries=3, base_delay=0.1):
    """
    Execute a transaction with automatic deadlock retry.
    Uses exponential backoff: 0.1s, 0.2s, 0.4s.
    """
    for attempt in range(max_retries):
        try:
            cursor = conn.cursor()
            cursor.execute("START TRANSACTION")
            for sql, params in operations:
                cursor.execute(sql, params)
            conn.commit()
            cursor.close()
            return True
        except mysql.connector.Error as err:
            conn.rollback()
            if err.errno in (DEADLOCK_ERROR, LOCK_WAIT_TIMEOUT):
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(
                        f"Deadlock on attempt {attempt+1}, "
                        f"retrying in {delay}s: {err}"
                    )
                    time.sleep(delay)
                    continue
            raise  # Non-deadlock error or retries exhausted
    raise RuntimeError("Deadlock retries exhausted")
