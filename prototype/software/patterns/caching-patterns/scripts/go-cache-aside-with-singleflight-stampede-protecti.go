// Input:  Redis client, database connection
// Output: Cache-aside reads with built-in stampede protection

package main

import (
    "context"
    "encoding/json"
    "math/rand"
    "time"

    "github.com/redis/go-redis/v9"     // go-redis/v9
    "golang.org/x/sync/singleflight"   // prevents thundering herd
)

var (
    rdb = redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    sf  singleflight.Group
)

func CacheGet(ctx context.Context, key string, fetchFn func() (any, error), ttl time.Duration) (any, error) {
    // Try cache first
    val, err := rdb.Get(ctx, key).Result()
    if err == nil {
        var result any
        json.Unmarshal([]byte(val), &result)
        return result, nil
    }
    // singleflight: only one goroutine fetches on miss
    v, err, _ := sf.Do(key, func() (any, error) {
        data, err := fetchFn()
        if err != nil {
            return nil, err
        }
        b, _ := json.Marshal(data)
        jitter := time.Duration(rand.Int63n(int64(ttl) / 10))
        rdb.Set(ctx, key, b, ttl+jitter)
        return data, nil
    })
    return v, err
}
