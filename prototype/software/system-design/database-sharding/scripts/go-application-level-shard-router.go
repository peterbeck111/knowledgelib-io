// Input:  Shard key (tenant_id) and list of database connections
// Output: Routes queries to correct shard based on hash
// Deps:   database/sql, hash/fnv (stdlib)

package sharding

import (
    "database/sql"
    "hash/fnv"
    "fmt"
)

type ShardRouter struct {
    shards []*sql.DB
    count  uint32
}

func NewShardRouter(dsns []string) (*ShardRouter, error) {
    router := &ShardRouter{count: uint32(len(dsns))}
    for _, dsn := range dsns {
        db, err := sql.Open("postgres", dsn)
        if err != nil {
            return nil, fmt.Errorf("connect shard %s: %w", dsn, err)
        }
        router.shards = append(router.shards, db)
    }
    return router, nil
}

func (r *ShardRouter) GetShard(tenantID string) *sql.DB {
    h := fnv.New32a()
    h.Write([]byte(tenantID))
    idx := h.Sum32() % r.count
    return r.shards[idx]
}

// Usage:
// router, _ := NewShardRouter([]string{dsn1, dsn2, dsn3, dsn4})
// db := router.GetShard("tenant-abc-123")
// rows, err := db.Query("SELECT * FROM orders WHERE tenant_id = $1", "tenant-abc-123")
