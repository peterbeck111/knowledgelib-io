# Input:  list of items to insert, items to query
# Output: membership test results (True = possibly in set, False = definitely not)

import mmh3  # pip install mmh3==4.1.0
from bitarray import bitarray  # pip install bitarray==2.9.2
import math

class BloomFilter:
    """Production-ready Bloom filter with optimal parameter calculation."""

    def __init__(self, expected_items, fp_rate=0.01):
        self.m = int(-expected_items * math.log(fp_rate) / (math.log(2) ** 2))
        self.k = max(1, int((self.m / expected_items) * math.log(2)))
        self.bits = bitarray(self.m)
        self.bits.setall(0)

    def add(self, item):
        for seed in range(self.k):
            idx = mmh3.hash(str(item), seed) % self.m
            self.bits[idx] = 1

    def __contains__(self, item):
        return all(
            self.bits[mmh3.hash(str(item), seed) % self.m]
            for seed in range(self.k)
        )

# Usage
bf = BloomFilter(1_000_000, fp_rate=0.001)  # 0.1% FP rate
bf.add("user:12345")
print("user:12345" in bf)  # True (definitely inserted)
print("user:99999" in bf)  # False (definitely not inserted)
