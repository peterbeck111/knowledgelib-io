#!/bin/bash
# Input:  Container ID or name
# Output: Complete memory diagnostic report

CID="$1"
if [ -z "$CID" ]; then echo "Usage: $0 <container_id>"; exit 1; fi

echo "=== Memory Diagnostic Report ==="
echo "Container: $CID"
echo "Time: $(date -u)"

# Check if container exists and get state
STATE=$(docker inspect "$CID" --format='{{.State.Status}}' 2>/dev/null)
if [ -z "$STATE" ]; then echo "❌ Container not found"; exit 1; fi

echo "Status: $STATE"

# OOM status
OOM=$(docker inspect "$CID" --format='{{.State.OOMKilled}}')
EXIT=$(docker inspect "$CID" --format='{{.State.ExitCode}}')
echo "Exit Code: $EXIT"
echo "OOMKilled: $OOM"

# Memory limits
MEM=$(docker inspect "$CID" --format='{{.HostConfig.Memory}}')
SWAP=$(docker inspect "$CID" --format='{{.HostConfig.MemorySwap}}')
RES=$(docker inspect "$CID" --format='{{.HostConfig.MemoryReservation}}')
echo ""
echo "=== Configured Limits ==="
echo "Memory:      $(echo "$MEM" | awk '{if($1>0) printf "%.0fMB\n",$1/1024/1024; else print "unlimited"}')"
echo "Memory+Swap: $(echo "$SWAP" | awk '{if($1>0) printf "%.0fMB\n",$1/1024/1024; else if($1==-1) print "unlimited"; else print "2x memory"}')"
echo "Reservation: $(echo "$RES" | awk '{if($1>0) printf "%.0fMB\n",$1/1024/1024; else print "none"}')"

# Live stats (if running)
if [ "$STATE" = "running" ]; then
    echo ""
    echo "=== Current Usage ==="
    docker stats --no-stream --format "Memory: {{.MemUsage}} ({{.MemPerc}})" "$CID"
    echo ""
    echo "=== Top Processes by Memory ==="
    docker exec "$CID" ps aux --sort=-%mem 2>/dev/null | head -6 || echo "(cannot exec into container)"
fi

# Last logs
echo ""
echo "=== Last 10 Log Lines ==="
docker logs --tail 10 "$CID" 2>&1

# Host OOM events
echo ""
echo "=== Recent Host OOM Events ==="
dmesg 2>/dev/null | grep -i "oom\|killed process" | tail -5 || echo "(dmesg not available)"
