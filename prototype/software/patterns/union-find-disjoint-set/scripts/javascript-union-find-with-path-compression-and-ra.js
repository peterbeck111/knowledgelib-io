// Input:  n (number of elements)
// Output: UnionFind object with find, union, connected methods

class UnionFind {
  constructor(n) {
    this.parent = Array.from({length: n}, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n;
  }
  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }
  union(x, y) {
    let rx = this.find(x), ry = this.find(y);
    if (rx === ry) return false;
    if (this.rank[rx] < this.rank[ry]) [rx, ry] = [ry, rx];
    this.parent[ry] = rx;
    if (this.rank[rx] === this.rank[ry]) this.rank[rx]++;
    this.count--;
    return true;
  }
  connected(x, y) { return this.find(x) === this.find(y); }
}
