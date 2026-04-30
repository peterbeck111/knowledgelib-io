# === Confirm OOM ===
docker inspect <cid> --format='OOMKilled: {{.State.OOMKilled}}, ExitCode: {{.State.ExitCode}}'
dmesg | grep -i "oom\|killed process" | tail -10

# === Memory Usage (Live) ===
docker stats                                        # All containers, live
docker stats --no-stream                             # Single snapshot
docker stats --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# === Memory Limits ===
docker inspect <cid> --format='Memory: {{.HostConfig.Memory}}, Swap: {{.HostConfig.MemorySwap}}'

# === Inside Container ===
docker exec <cid> cat /proc/meminfo | head -5       # Total/free/available
docker exec <cid> cat /proc/1/status | grep VmRSS   # PID 1 resident memory
docker exec <cid> ps aux --sort=-%mem | head -10     # Top memory consumers

# === cgroups (Linux host) ===
# cgroups v2:
cat /sys/fs/cgroup/system.slice/docker-<full_id>.scope/memory.current
cat /sys/fs/cgroup/system.slice/docker-<full_id>.scope/memory.max
cat /sys/fs/cgroup/system.slice/docker-<full_id>.scope/memory.events
# cgroups v1:
cat /sys/fs/cgroup/memory/docker/<full_id>/memory.usage_in_bytes
cat /sys/fs/cgroup/memory/docker/<full_id>/memory.limit_in_bytes

# === Host Memory ===
free -m                                              # Host memory overview
vmstat 1 5                                           # Memory activity
cat /proc/meminfo | head -10
