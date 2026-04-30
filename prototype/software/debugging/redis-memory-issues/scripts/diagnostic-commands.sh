# === Memory overview ===
redis-cli INFO memory

# === Automated memory diagnosis (Redis 4.0+) ===
redis-cli MEMORY DOCTOR

# === Detailed memory statistics breakdown ===
redis-cli MEMORY STATS

# === Find largest keys by element count ===
redis-cli --bigkeys -i 0.1

# === Find largest keys by memory usage (Redis 6.0+) ===
redis-cli --memkeys -i 0.1

# === Check memory usage of a specific key ===
redis-cli MEMORY USAGE mykey SAMPLES 0

# === Check eviction stats ===
redis-cli INFO stats | grep -E "evicted_keys|keyspace"

# === Check current maxmemory and policy ===
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy

# === Check client buffer usage ===
redis-cli CLIENT LIST
redis-cli INFO clients

# === Check if Redis is swapping (Linux) ===
cat /proc/$(pidof redis-server)/smaps 2>/dev/null | grep -c "Swap:" || echo "Check swap manually"

# === Check active defragmentation status ===
redis-cli INFO memory | grep -E "active_defrag|mem_fragmentation"

# === Allocator statistics (jemalloc internals) ===
redis-cli MEMORY MALLOC-STATS

# === Keyspace overview (key count per database) ===
redis-cli INFO keyspace
