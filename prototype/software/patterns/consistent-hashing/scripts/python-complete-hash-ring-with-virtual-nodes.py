# Input:  list of node names, number of virtual nodes
# Output: ConsistentHashRing with get_node(), add_node(), remove_node()

import hashlib
import bisect
from typing import Optional

class ConsistentHashRing:
    def __init__(self, nodes: list[str] = None, vnodes: int = 150):
        self.vnodes = vnodes
        self._ring: dict[int, str] = {}
        self._sorted_keys: list[int] = []
        for node in (nodes or []):
            self.add_node(node)

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**32)

    def add_node(self, node: str) -> None:
        for i in range(self.vnodes):
            pos = self._hash(f"{node}#vn{i}")
            self._ring[pos] = node
        self._sorted_keys = sorted(self._ring.keys())

    def remove_node(self, node: str) -> None:
        self._ring = {k: v for k, v in self._ring.items() if v != node}
        self._sorted_keys = sorted(self._ring.keys())

    def get_node(self, key: str) -> Optional[str]:
        if not self._ring:
            return None
        pos = self._hash(key)
        idx = bisect.bisect_right(self._sorted_keys, pos) % len(self._sorted_keys)
        return self._ring[self._sorted_keys[idx]]
