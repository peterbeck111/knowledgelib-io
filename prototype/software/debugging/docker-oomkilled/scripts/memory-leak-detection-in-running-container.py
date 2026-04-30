#!/usr/bin/env python3
# Input:  Container name to monitor
# Output: Alert when memory growth exceeds threshold

import subprocess
import json
import time
import sys
from datetime import datetime

def get_container_memory(container_id):
    """Get current memory usage in bytes from docker stats."""
    result = subprocess.run(
        ["docker", "stats", "--no-stream", "--format", "{{json .}}", container_id],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    data = json.loads(result.stdout.strip())
    # Parse "123.4MiB / 512MiB" format
    usage_str = data.get("MemUsage", "").split("/")[0].strip()
    if "GiB" in usage_str:
        return float(usage_str.replace("GiB", "")) * 1024 * 1024 * 1024
    elif "MiB" in usage_str:
        return float(usage_str.replace("MiB", "")) * 1024 * 1024
    elif "KiB" in usage_str:
        return float(usage_str.replace("KiB", "")) * 1024
    return 0

def monitor(container_id, interval=30, growth_threshold_mb=50, samples=10):
    """Monitor container memory and alert on sustained growth."""
    history = []
    print(f"Monitoring {container_id} every {interval}s...")

    while True:
        mem = get_container_memory(container_id)
        if mem is None:
            print(f"⚠️ Container {container_id} not found or not running")
            break

        history.append((datetime.now(), mem))
        mem_mb = mem / 1024 / 1024
        print(f"[{datetime.now():%H:%M:%S}] {mem_mb:.1f} MB")

        if len(history) >= samples:
            first_mem = history[-samples][1]
            growth_mb = (mem - first_mem) / 1024 / 1024
            if growth_mb > growth_threshold_mb:
                rate = growth_mb / (samples * interval / 60)
                print(f"🚨 ALERT: Memory grew {growth_mb:.1f}MB in last "
                      f"{samples} samples ({rate:.1f} MB/min)")
                print(f"   Projected OOM in ~{(512 - mem_mb) / rate:.0f} min "
                      f"at current rate (assuming 512MB limit)")

        time.sleep(interval)

if __name__ == "__main__":
    monitor(sys.argv[1] if len(sys.argv) > 1 else "myapp")
