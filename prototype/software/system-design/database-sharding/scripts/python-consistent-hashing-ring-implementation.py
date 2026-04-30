# Input:  List of shard nodes + data keys to route
# Output: Shard assignment for each key with minimal disruption on node changes
# Deps:   pip install hashlib (stdlib)

import hashlib
from bisect import bisect_right

class ConsistentHashRing:
    """Consistent hashing with virtual nodes for even distribution."""

    def __init__(self, nodes=None, virtual_nodes=150):
        self.ring = {}          # hash -> node mapping
        self.sorted_keys = []   # sorted hash values for binary search
        self.virtual_nodes = virtual_nodes
        for node in (nodes or []):
            self.add_node(node)

    def _hash(self, key: str) -> int:
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node: str):
        """Add a node with virtual_nodes replicas on the ring."""
        for i in range(self.virtual_nodes):
            h = self._hash(f"{node}:vn{i}")
            self.ring[h] = node
            self.sorted_keys.append(h)
        self.sorted_keys.sort()

    def remove_node(self, node: str):
        """Remove node -- only keys mapped to this node are reassigned."""
        for i in range(self.virtual_nodes):
            h = self._hash(f"{node}:vn{i}")
            del self.ring[h]
            self.sorted_keys.remove(h)

    def get_node(self, key: str) -> str:
        """Route a key to its shard node. O(log n) lookup."""
        if not self.ring:
            raise ValueError("No nodes in ring")
        h = self._hash(key)
        idx = bisect_right(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]

# Usage:
ring = ConsistentHashRing(["shard-1", "shard-2", "shard-3"])
print(ring.get_node("user:12345"))   # -> "shard-2"
print(ring.get_node("order:98765"))  # -> "shard-1"

# Adding shard-4 only moves ~25% of keys (1/N), not all of them
ring.add_node("shard-4")
print(ring.get_node("user:12345"))   # likely still "shard-2"
