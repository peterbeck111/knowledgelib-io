// Input:  String words, String prefix
// Output: boolean for search, List<String> for autocomplete

class Trie {
    private static final int ALPHA = 26;
    private int[][] children;  // node x 26
    private boolean[] isEnd;
    private int size = 0;

    public Trie(int maxNodes) {
        children = new int[maxNodes][ALPHA];
        isEnd = new boolean[maxNodes];
        for (int[] row : children) Arrays.fill(row, -1);
        size = 1;  // root = node 0
    }

    public void insert(String word) {
        int node = 0;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (children[node][idx] == -1)
                children[node][idx] = size++;
            node = children[node][idx];
        }
        isEnd[node] = true;
    }

    public boolean search(String word) {
        int node = find(word);
        return node != -1 && isEnd[node];
    }

    public boolean startsWith(String prefix) {
        return find(prefix) != -1;
    }

    private int find(String s) {
        int node = 0;
        for (char c : s.toCharArray()) {
            int idx = c - 'a';
            if (children[node][idx] == -1) return -1;
            node = children[node][idx];
        }
        return node;
    }
}
