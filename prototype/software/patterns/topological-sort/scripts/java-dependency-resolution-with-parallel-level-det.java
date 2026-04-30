// Input:  numNodes=6, edges={{5,2},{5,0},{4,0},{4,1},{2,3},{3,1}}
// Output: levels [[4,5],[0,2],[3],[1]] -- nodes at each level can run in parallel

import java.util.*;

public class ParallelTopSort {
    public static List<List<Integer>> topSortLevels(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        int[] inDeg = new int[n];
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());

        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            inDeg[e[1]]++;
        }

        Queue<Integer> queue = new LinkedList<>();
        for (int i = 0; i < n; i++)
            if (inDeg[i] == 0) queue.add(i);

        List<List<Integer>> levels = new ArrayList<>();
        int processed = 0;

        while (!queue.isEmpty()) {
            List<Integer> level = new ArrayList<>();
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                int node = queue.poll();
                level.add(node);
                processed++;
                for (int nb : adj.get(node)) {
                    if (--inDeg[nb] == 0) queue.add(nb);
                }
            }
            levels.add(level);
        }

        if (processed != n) throw new RuntimeException("Cycle detected");
        return levels;
    }
}
