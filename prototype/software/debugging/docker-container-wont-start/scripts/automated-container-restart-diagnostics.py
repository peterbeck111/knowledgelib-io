# Input:  Containers that keep restarting (CrashLoopBackOff-like behavior)
# Output: Script that captures diagnostic info from crashing containers

import subprocess
import json
import time
import sys

def diagnose_container(container_name_or_id):
    """Collect diagnostic info from a failing container."""
    cid = container_name_or_id

    # Get container state
    state_json = subprocess.check_output(
        ["docker", "inspect", "--format", "{{json .State}}", cid]
    )
    state = json.loads(state_json)

    print(f"=== Container: {cid} ===")
    print(f"Status:    {state.get('Status')}")
    print(f"Exit Code: {state.get('ExitCode')}")
    print(f"OOMKilled: {state.get('OOMKilled')}")
    print(f"Error:     {state.get('Error', 'none')}")
    print(f"Started:   {state.get('StartedAt')}")
    print(f"Finished:  {state.get('FinishedAt')}")

    # Interpret exit code
    exit_code = state.get('ExitCode', -1)
    meanings = {
        0: "✅ Success (normal exit)",
        1: "❌ Application error",
        2: "❌ Shell misuse / bad syntax",
        126: "❌ Permission denied (not executable)",
        127: "❌ Command not found",
        137: "❌ SIGKILL — OOM or docker kill",
        139: "❌ SIGSEGV — Segmentation fault",
        143: "⚠️ SIGTERM — Graceful shutdown",
    }
    print(f"Meaning:   {meanings.get(exit_code, f'Unknown ({exit_code})')}")

    # Get logs
    print(f"\n=== Last 30 log lines ===")
    logs = subprocess.check_output(
        ["docker", "logs", "--tail", "30", cid],
        stderr=subprocess.STDOUT
    ).decode('utf-8', errors='replace')
    print(logs)

    # Get config
    config_json = subprocess.check_output(
        ["docker", "inspect", "--format", "{{json .Config}}", cid]
    )
    config = json.loads(config_json)
    print(f"\n=== Configuration ===")
    print(f"Image:       {config.get('Image')}")
    print(f"Entrypoint:  {config.get('Entrypoint')}")
    print(f"Cmd:         {config.get('Cmd')}")
    print(f"WorkingDir:  {config.get('WorkingDir')}")
    print(f"User:        {config.get('User', 'root')}")

    # Resource limits
    host_json = subprocess.check_output(
        ["docker", "inspect", "--format", "{{json .HostConfig}}", cid]
    )
    host = json.loads(host_json)
    mem = host.get('Memory', 0)
    print(f"\n=== Resources ===")
    print(f"Memory limit: {mem // 1024 // 1024}MB" if mem else "Memory limit: unlimited")
    print(f"Restart policy: {host.get('RestartPolicy', {}).get('Name', 'no')}")

if __name__ == "__main__":
    diagnose_container(sys.argv[1] if len(sys.argv) > 1 else "")
