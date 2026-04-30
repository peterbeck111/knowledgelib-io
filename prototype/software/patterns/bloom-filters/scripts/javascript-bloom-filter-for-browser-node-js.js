// Input:  items to add, items to query
// Output: boolean membership test results

class BloomFilter {
  constructor(expectedItems, fpRate = 0.01) {
    this.m = Math.ceil(-expectedItems * Math.log(fpRate) / (Math.log(2) ** 2));
    this.k = Math.max(1, Math.round((this.m / expectedItems) * Math.log(2)));
    this.bits = new Uint8Array(Math.ceil(this.m / 8));
  }

  // FNV-1a hash with seed
  _hash(str, seed) {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h % this.m;
  }

  add(item) {
    const s = String(item);
    for (let i = 0; i < this.k; i++) {
      const idx = this._hash(s, i);
      this.bits[idx >> 3] |= (1 << (idx & 7));
    }
  }

  has(item) {
    const s = String(item);
    for (let i = 0; i < this.k; i++) {
      const idx = this._hash(s, i);
      if (!(this.bits[idx >> 3] & (1 << (idx & 7)))) return false;
    }
    return true;  // possibly in set
  }

  get sizeBytes() {
    return this.bits.length;
  }
}

// Usage
const bf = new BloomFilter(100000, 0.01);
bf.add("session:abc123");
console.log(bf.has("session:abc123")); // true
console.log(bf.has("session:xyz789")); // false
console.log(`Size: ${bf.sizeBytes.toLocaleString()} bytes`);
