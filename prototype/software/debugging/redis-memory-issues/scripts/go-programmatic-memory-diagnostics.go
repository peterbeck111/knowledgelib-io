// Input:  Redis address
// Output: MemoryReport struct with diagnostic fields
package main

import (
    "context"
    "fmt"
    "strconv"
    "strings"
    "github.com/redis/go-redis/v9" // v9.x
)

type MemoryReport struct {
    UsedMemory    int64   `json:"used_memory"`
    MaxMemory     int64   `json:"maxmemory"`
    FragRatio     float64 `json:"fragmentation_ratio"`
    Policy        string  `json:"eviction_policy"`
    EvictedKeys   int64   `json:"evicted_keys"`
    DoctorMessage string  `json:"doctor_message"`
}

func DiagnoseRedis(ctx context.Context, addr string) (*MemoryReport, error) {
    rdb := redis.NewClient(&redis.Options{Addr: addr})
    defer rdb.Close()

    info, err := rdb.InfoMap(ctx, "memory").Result()
    if err != nil {
        return nil, fmt.Errorf("INFO memory: %w", err)
    }
    mem := info["memory"]
    used, _ := strconv.ParseInt(mem["used_memory"], 10, 64)
    maxm, _ := strconv.ParseInt(mem["maxmemory"], 10, 64)
    frag, _ := strconv.ParseFloat(mem["mem_fragmentation_ratio"], 64)

    doctor, _ := rdb.MemoryDoctor(ctx).Result()

    stats, _ := rdb.InfoMap(ctx, "stats").Result()
    evicted, _ := strconv.ParseInt(stats["stats"]["evicted_keys"], 10, 64)

    return &MemoryReport{
        UsedMemory: used, MaxMemory: maxm,
        FragRatio: frag, Policy: strings.TrimSpace(mem["maxmemory_policy"]),
        EvictedKeys: evicted, DoctorMessage: doctor,
    }, nil
}
