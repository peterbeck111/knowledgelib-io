# Input:  A unique integer ID from your ID generator
# Output: A 6-7 character URL-safe short code

import string
import time
import threading

ALPHABET = string.digits + string.ascii_lowercase + string.ascii_uppercase

def base62_encode(num: int) -> str:
    if num == 0:
        return ALPHABET[0]
    result = []
    while num > 0:
        num, remainder = divmod(num, 62)
        result.append(ALPHABET[remainder])
    return ''.join(reversed(result))

class SnowflakeIDGenerator:
    """Twitter Snowflake-inspired ID generator.
    Produces 64-bit IDs: timestamp(41) + node_id(10) + sequence(12)
    """
    def __init__(self, node_id: int):
        self.node_id = node_id & 0x3FF        # 10 bits -> 1024 nodes
        self.sequence = 0
        self.last_ts = 0
        self.lock = threading.Lock()
        self.epoch = 1577836800000             # 2020-01-01 epoch

    def next_id(self) -> int:
        with self.lock:
            ts = int(time.time() * 1000) - self.epoch
            if ts == self.last_ts:
                self.sequence = (self.sequence + 1) & 0xFFF  # 12 bits
                if self.sequence == 0:
                    while ts <= self.last_ts:
                        ts = int(time.time() * 1000) - self.epoch
            else:
                self.sequence = 0
            self.last_ts = ts
            return (ts << 22) | (self.node_id << 12) | self.sequence

# Usage:
gen = SnowflakeIDGenerator(node_id=1)
uid = gen.next_id()
short_code = base62_encode(uid)
print(f"ID: {uid} -> Short code: {short_code}")
