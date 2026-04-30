#!/bin/bash
# Input:  Pod name and namespace
# Output: Complete diagnostic report for CrashLoopBackOff

POD="$1"
NS="${2:-default}"

if [ -z "$POD" ]; then
    echo "Usage: $0 <pod-name> [namespace]"
    echo ""
    echo "Pods in CrashLoopBackOff:"
    kubectl get pods --all-namespaces | grep CrashLoopBackOff
    exit 1
fi

echo "======================================"
echo "CrashLoopBackOff Diagnostic: $POD"
echo "Namespace: $NS"
echo "Time: $(date -u)"
echo "======================================"

# Pod status
echo ""
echo "=== Pod Status ==="
kubectl get pod "$POD" -n "$NS" -o wide 2>/dev/null

# Restart count
RESTARTS=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.status.containerStatuses[0].restartCount}' 2>/dev/null)
echo "Restarts: $RESTARTS"

# Exit code and reason
EXIT_CODE=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}' 2>/dev/null)
REASON=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}' 2>/dev/null)
echo "Last exit code: $EXIT_CODE"
echo "Last reason: $REASON"

# Interpret exit code
echo ""
echo "=== Exit Code Analysis ==="
case "$EXIT_CODE" in
    0)   echo "✅ Exit 0 — Container exited successfully (but shouldn't for long-running services)" ;;
    1)   echo "❌ Exit 1 — Application error. Check logs below." ;;
    126) echo "❌ Exit 126 — Permission denied (binary not executable)" ;;
    127) echo "❌ Exit 127 — Command not found (wrong CMD or missing binary)" ;;
    137) echo "❌ Exit 137 — SIGKILL: $( [ "$REASON" = "OOMKilled" ] && echo "OOMKilled! Increase memory limits" || echo "Killed externally (probe timeout?)")" ;;
    139) echo "❌ Exit 139 — Segfault (architecture mismatch or binary error)" ;;
    143) echo "⚠️ Exit 143 — SIGTERM (graceful shutdown or probe kill)" ;;
    *)   echo "❓ Exit $EXIT_CODE — Unknown" ;;
esac

# Resource limits
echo ""
echo "=== Resource Limits ==="
kubectl get pod "$POD" -n "$NS" -o jsonpath='{range .spec.containers[*]}Container: {.name}
  Requests: CPU={.resources.requests.cpu} Memory={.resources.requests.memory}
  Limits:   CPU={.resources.limits.cpu} Memory={.resources.limits.memory}
{end}' 2>/dev/null

# Actual usage
echo ""
echo "=== Current Resource Usage ==="
kubectl top pod "$POD" -n "$NS" 2>/dev/null || echo "(metrics-server not available)"

# Probes
echo ""
echo "=== Probe Configuration ==="
kubectl get pod "$POD" -n "$NS" -o jsonpath='{range .spec.containers[*]}Container: {.name}
  Liveness:  {.livenessProbe}
  Readiness: {.readinessProbe}
  Startup:   {.startupProbe}
{end}' 2>/dev/null

# Events
echo ""
echo "=== Recent Events ==="
kubectl get events -n "$NS" --field-selector "involvedObject.name=$POD" --sort-by='.lastTimestamp' 2>/dev/null | tail -15

# Previous logs
echo ""
echo "=== Previous Container Logs (last 30 lines) ==="
kubectl logs "$POD" -n "$NS" --previous --tail=30 2>/dev/null || echo "(no previous logs available)"

# Current logs
echo ""
echo "=== Current Container Logs (last 10 lines) ==="
kubectl logs "$POD" -n "$NS" --tail=10 2>/dev/null || echo "(no current logs available)"
