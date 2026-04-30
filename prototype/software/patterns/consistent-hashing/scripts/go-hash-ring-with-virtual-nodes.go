// Input:  list of node names, replicas count
// Output: Ring struct with Get(), Add(), Remove()

package chash

import (
    "crypto/md5"
    "encoding/binary"
    "sort"
    "sync"
)

type Ring struct {
    mu       sync.RWMutex
    nodes    map[uint32]string
    keys     []uint32 // sorted
    replicas int
}

func New(replicas int, nodes ...string) *Ring {
    r := &Ring{replicas: replicas, nodes: make(map[uint32]string)}
    for _, n := range nodes {
        r.Add(n)
    }
    return r
}

func (r *Ring) hash(key string) uint32 {
    h := md5.Sum([]byte(key))
    return binary.BigEndian.Uint32(h[:4])
}

func (r *Ring) Add(node string) {
    r.mu.Lock()
    defer r.mu.Unlock()
    for i := 0; i < r.replicas; i++ {
        h := r.hash(fmt.Sprintf("%s#vn%d", node, i))
        r.nodes[h] = node
        r.keys = append(r.keys, h)
    }
    sort.Slice(r.keys, func(i, j int) bool { return r.keys[i] < r.keys[j] })
}

func (r *Ring) Get(key string) string {
    r.mu.RLock()
    defer r.mu.RUnlock()
    if len(r.keys) == 0 {
        return ""
    }
    h := r.hash(key)
    idx := sort.Search(len(r.keys), func(i int) bool { return r.keys[i] >= h })
    if idx == len(r.keys) {
        idx = 0
    }
    return r.nodes[r.keys[idx]]
}
