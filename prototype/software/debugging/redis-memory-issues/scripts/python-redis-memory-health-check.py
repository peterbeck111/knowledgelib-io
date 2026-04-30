# Input:  Redis connection URL
# Output: Memory health report dict with issues list
import redis

def check_redis_memory(url="redis://localhost:6379"):
    r = redis.Redis.from_url(url)
    info = r.info("memory")
    issues = []

    frag = info.get("mem_fragmentation_ratio", 1.0)
    if frag > 1.5:
        issues.append(f"High fragmentation: {frag:.2f} (>1.5)")
    elif frag < 1.0:
        issues.append(f"Swapping likely: ratio {frag:.2f} (<1.0)")

    used = info.get("used_memory", 0)
    maxmem = info.get("maxmemory", 0)
    if maxmem > 0 and used / maxmem > 0.9:
        issues.append(f"Memory {used/maxmem:.0%} of maxmemory")

    policy = info.get("maxmemory_policy", "noeviction")
    if policy == "noeviction" and maxmem > 0:
        issues.append("noeviction policy with maxmemory set")

    return {
        "used_memory_human": info.get("used_memory_human"),
        "maxmemory_human": info.get("maxmemory_human"),
        "fragmentation_ratio": frag,
        "eviction_policy": policy,
        "evicted_keys": r.info("stats").get("evicted_keys", 0),
        "issues": issues,
    }
