#!/usr/bin/env python3
# Input:  Kubernetes cluster access via kubectl
# Output: Capacity report showing schedulable headroom per node

import subprocess
import json
import re

def run_kubectl(cmd):
    """Run kubectl command and return JSON output."""
    result = subprocess.run(
        f"kubectl {cmd} -o json".split(),
        capture_output=True, text=True
    )
    return json.loads(result.stdout) if result.returncode == 0 else None

def parse_resource(value):
    """Convert K8s resource string to numeric (millicores for CPU, bytes for memory)."""
    if not value:
        return 0
    value = str(value)
    if value.endswith("m"):
        return int(value[:-1])
    elif value.endswith("Ki"):
        return int(value[:-2]) * 1024
    elif value.endswith("Mi"):
        return int(value[:-2]) * 1024 * 1024
    elif value.endswith("Gi"):
        return int(value[:-2]) * 1024 * 1024 * 1024
    elif value.endswith("Ti"):
        return int(value[:-2]) * 1024 * 1024 * 1024 * 1024
    else:
        try:
            return int(float(value) * 1000)  # CPU cores to millicores
        except ValueError:
            return 0

def format_cpu(millicores):
    if millicores >= 1000:
        return f"{millicores/1000:.1f} cores"
    return f"{millicores}m"

def format_mem(bytes_val):
    if bytes_val >= 1024**3:
        return f"{bytes_val/1024**3:.1f}Gi"
    elif bytes_val >= 1024**2:
        return f"{bytes_val/1024**2:.0f}Mi"
    return f"{bytes_val/1024:.0f}Ki"

def audit():
    nodes = run_kubectl("get nodes")
    pods = run_kubectl("get pods -A")
    if not nodes or not pods:
        print("❌ Cannot access cluster"); return

    # Aggregate requested resources per node
    node_requested = {}
    for pod in pods.get("items", []):
        node = pod.get("spec", {}).get("nodeName")
        if not node or pod["status"].get("phase") != "Running":
            continue
        if node not in node_requested:
            node_requested[node] = {"cpu": 0, "mem": 0}
        for container in pod["spec"].get("containers", []):
            req = container.get("resources", {}).get("requests", {})
            node_requested[node]["cpu"] += parse_resource(req.get("cpu", "0"))
            node_requested[node]["mem"] += parse_resource(req.get("memory", "0"))

    print(f"{'Node':<30} {'CPU Alloc':>10} {'CPU Req':>10} {'CPU Free':>10} "
          f"{'Mem Alloc':>10} {'Mem Req':>10} {'Mem Free':>10} {'Taints'}")
    print("-" * 120)

    total = {"alloc_cpu": 0, "req_cpu": 0, "alloc_mem": 0, "req_mem": 0}
    for node in nodes["items"]:
        name = node["metadata"]["name"]
        alloc = node["status"].get("allocatable", {})
        alloc_cpu = parse_resource(alloc.get("cpu", "0"))
        alloc_mem = parse_resource(alloc.get("memory", "0"))
        req = node_requested.get(name, {"cpu": 0, "mem": 0})
        free_cpu = alloc_cpu - req["cpu"]
        free_mem = alloc_mem - req["mem"]
        taints = [f"{t['key']}:{t.get('effect','')}"
                  for t in node["spec"].get("taints", [])]

        print(f"{name:<30} {format_cpu(alloc_cpu):>10} {format_cpu(req['cpu']):>10} "
              f"{format_cpu(free_cpu):>10} {format_mem(alloc_mem):>10} "
              f"{format_mem(req['mem']):>10} {format_mem(free_mem):>10} "
              f"{', '.join(taints) if taints else 'none'}")

        total["alloc_cpu"] += alloc_cpu
        total["req_cpu"] += req["cpu"]
        total["alloc_mem"] += alloc_mem
        total["req_mem"] += req["mem"]

    print("-" * 120)
    print(f"{'TOTAL':<30} {format_cpu(total['alloc_cpu']):>10} "
          f"{format_cpu(total['req_cpu']):>10} "
          f"{format_cpu(total['alloc_cpu']-total['req_cpu']):>10} "
          f"{format_mem(total['alloc_mem']):>10} "
          f"{format_mem(total['req_mem']):>10} "
          f"{format_mem(total['alloc_mem']-total['req_mem']):>10}")

    pct_cpu = (total["req_cpu"] / total["alloc_cpu"] * 100) if total["alloc_cpu"] else 0
    pct_mem = (total["req_mem"] / total["alloc_mem"] * 100) if total["alloc_mem"] else 0
    print(f"\nCluster utilization (by requests): CPU {pct_cpu:.1f}%, Memory {pct_mem:.1f}%")
    if pct_cpu > 80 or pct_mem > 80:
        print("⚠️ Cluster is over 80% requested — new pods may stay Pending!")

if __name__ == "__main__":
    audit()
