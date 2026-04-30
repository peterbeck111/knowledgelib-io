// Input:  n vertices, int[][] edges (each [u, v])
// Output: true if graph contains a cycle

public class UnionFind {
    private int[] parent, rank;
    public UnionFind(int n) {
        parent = new int[n]; rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    public int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    public boolean union(int x, int y) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return false; // Cycle detected
        if (rank[rx] < rank[ry]) { int t = rx; rx = ry; ry = t; }
        parent[ry] = rx;
        if (rank[rx] == rank[ry]) rank[rx]++;
        return true;
    }
    public static boolean hasCycle(int n, int[][] edges) {
        UnionFind uf = new UnionFind(n);
        for (int[] e : edges)
            if (!uf.union(e[0], e[1])) return true;
        return false;
    }
}
