// Input:  number of nodes, adjacency list ([][]int)
// Output: topological order slice, or error if cycle exists

func topologicalSort(n int, graph [][]int) ([]int, error) {
    inDegree := make([]int, n)
    for u := 0; u < n; u++ {
        for _, v := range graph[u] {
            inDegree[v]++
        }
    }
    queue := []int{}
    for i, d := range inDegree {
        if d == 0 {
            queue = append(queue, i)
        }
    }
    order := []int{}
    for len(queue) > 0 {
        u := queue[0]
        queue = queue[1:]
        order = append(order, u)
        for _, v := range graph[u] {
            inDegree[v]--
            if inDegree[v] == 0 {
                queue = append(queue, v)
            }
        }
    }
    if len(order) != n {
        return nil, fmt.Errorf("cycle detected: only %d of %d nodes ordered", len(order), n)
    }
    return order, nil
}
