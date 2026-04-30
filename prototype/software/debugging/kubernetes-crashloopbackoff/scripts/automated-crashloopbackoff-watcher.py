#!/usr/bin/env python3
# Input:  Kubernetes cluster
# Output: Real-time alerts for CrashLoopBackOff pods with diagnostics

import subprocess
import json
import time
from datetime import datetime

def get_crash_loop_pods(namespace="--all-namespaces"):
    """Find all pods in CrashLoopBackOff state."""
    ns_flag = namespace if namespace == "--all-namespaces" else f"-n {namespace}"
    result = subprocess.run(
        f"kubectl get pods {ns_flag} -o json".split(),
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return []

    pods = json.loads(result.stdout)
    crash_pods = []

    for pod in pods.get("items", []):
        name = pod["metadata"]["name"]
        ns = pod["metadata"]["namespace"]
        for cs in pod.get("status", {}).get("containerStatuses", []):
            waiting = cs.get("state", {}).get("waiting", {})
            if waiting.get("reason") == "CrashLoopBackOff":
                last_state = cs.get("lastState", {}).get("terminated", {})
                crash_pods.append({
                    "name": name,
                    "namespace": ns,
                    "container": cs["name"],
                    "restarts": cs.get("restartCount", 0),
                    "exit_code": last_state.get("exitCode"),
                    "reason": last_state.get("reason", "Unknown"),
                })
    return crash_pods

def get_pod_logs(name, namespace, previous=True, tail=10):
    """Get pod logs (previous or current)."""
    cmd = f"kubectl logs {name} -n {namespace} --tail={tail}"
    if previous:
        cmd += " --previous"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else "(no logs)"

def monitor(interval=30):
    """Continuously monitor for CrashLoopBackOff pods."""
    seen = set()
    print(f"[{datetime.now():%H:%M:%S}] Monitoring for CrashLoopBackOff...")

    while True:
        pods = get_crash_loop_pods()
        for pod in pods:
            key = f"{pod['namespace']}/{pod['name']}"
            if key not in seen or pod["restarts"] % 10 == 0:
                seen.add(key)
                print(f"\n🚨 [{datetime.now():%H:%M:%S}] CrashLoopBackOff: {key}")
                print(f"   Container: {pod['container']}")
                print(f"   Restarts:  {pod['restarts']}")
                print(f"   Exit Code: {pod['exit_code']} ({pod['reason']})")
                logs = get_pod_logs(pod["name"], pod["namespace"])
                print(f"   Last logs:\n{logs}")

        if not pods:
            print(f"[{datetime.now():%H:%M:%S}] ✅ No CrashLoopBackOff pods")

        time.sleep(interval)

if __name__ == "__main__":
    monitor()
