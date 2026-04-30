#!/bin/bash
# Input:  Pod name and namespace
# Output: Complete diagnostic report for Pending pods

POD="$1"
NS="${2:-default}"

if [ -z "$POD" ]; then
    echo "Usage: $0 <pod-name> [namespace]"
    echo ""
    echo "Currently Pending pods:"
    kubectl get pods -A --field-selector=status.phase=Pending 2>/dev/null
    exit 1
fi

echo "============================================"
echo "Pending Pod Diagnostic: $POD"
echo "Namespace: $NS"
echo "Time: $(date -u)"
echo "============================================"

# Basic info
echo ""
echo "=== Pod Status ==="
kubectl get pod "$POD" -n "$NS" -o wide 2>/dev/null

PHASE=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.status.phase}' 2>/dev/null)
CREATED=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.metadata.creationTimestamp}' 2>/dev/null)
echo "Phase: $PHASE"
echo "Created: $CREATED"

# Resource requests
echo ""
echo "=== Pod Resource Requests ==="
kubectl get pod "$POD" -n "$NS" -o jsonpath='{range .spec.containers[*]}  {.name}: cpu={.resources.requests.cpu} mem={.resources.requests.memory}{"\n"}{end}' 2>/dev/null

# NodeSelector
echo ""
echo "=== Node Selector ==="
NS_SEL=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.spec.nodeSelector}' 2>/dev/null)
echo "  ${NS_SEL:-none}"

# Tolerations
echo ""
echo "=== Tolerations ==="
kubectl get pod "$POD" -n "$NS" -o jsonpath='{range .spec.tolerations[*]}  {.key}={.value}:{.effect}{"\n"}{end}' 2>/dev/null || echo "  none"

# Affinity
echo ""
echo "=== Affinity ==="
AFF=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.spec.affinity}' 2>/dev/null)
echo "  ${AFF:-none}"

# Node overview
echo ""
echo "=== Node Resources ==="
echo "Node                     CPU(alloc)  MEM(alloc)  Taints"
kubectl get nodes -o custom-columns=\
  NAME:.metadata.name,\
  CPU:.status.allocatable.cpu,\
  MEM:.status.allocatable.memory,\
  TAINTS:.spec.taints[*].key 2>/dev/null

# Node usage
echo ""
echo "=== Node Usage ==="
kubectl top nodes 2>/dev/null || echo "(metrics-server not available)"

# PVC check
echo ""
echo "=== PVC Status ==="
PVCS=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.spec.volumes[*].persistentVolumeClaim.claimName}' 2>/dev/null)
if [ -n "$PVCS" ]; then
    for PVC in $PVCS; do
        STATUS=$(kubectl get pvc "$PVC" -n "$NS" -o jsonpath='{.status.phase}' 2>/dev/null)
        SC=$(kubectl get pvc "$PVC" -n "$NS" -o jsonpath='{.spec.storageClassName}' 2>/dev/null)
        echo "  $PVC: $STATUS (storageClass: $SC)"
    done
else
    echo "  No PVCs referenced"
fi

# ResourceQuota
echo ""
echo "=== ResourceQuota ==="
kubectl get resourcequota -n "$NS" 2>/dev/null || echo "  No quotas"

# Events (most important!)
echo ""
echo "=== Scheduler Events ==="
kubectl get events -n "$NS" --field-selector "involvedObject.name=$POD" --sort-by='.lastTimestamp' 2>/dev/null | tail -15

# Recommendation
echo ""
echo "=== Quick Diagnosis ==="
EVENTS=$(kubectl get events -n "$NS" --field-selector "involvedObject.name=$POD" -o jsonpath='{.items[-1].message}' 2>/dev/null)
if echo "$EVENTS" | grep -qi "insufficient cpu"; then
    echo "💡 Cause: Insufficient CPU. Reduce cpu request or add nodes."
elif echo "$EVENTS" | grep -qi "insufficient memory"; then
    echo "💡 Cause: Insufficient memory. Reduce memory request or add nodes."
elif echo "$EVENTS" | grep -qi "taint"; then
    echo "💡 Cause: Taint/toleration mismatch. Add toleration or remove taint."
elif echo "$EVENTS" | grep -qi "unbound.*PersistentVolumeClaim"; then
    echo "💡 Cause: PVC not bound. Check StorageClass and PV availability."
elif echo "$EVENTS" | grep -qi "node.*affinity\|selector"; then
    echo "💡 Cause: Node selector/affinity mismatch. Check labels vs selectors."
elif echo "$EVENTS" | grep -qi "unschedulable"; then
    echo "💡 Cause: Node(s) cordoned. Run: kubectl uncordon <node>"
elif echo "$EVENTS" | grep -qi "exceeded quota"; then
    echo "💡 Cause: ResourceQuota exceeded. Increase quota or reduce requests."
elif [ -z "$EVENTS" ]; then
    echo "💡 No events found. Is kube-scheduler running?"
else
    echo "💡 Event: $EVENTS"
fi
