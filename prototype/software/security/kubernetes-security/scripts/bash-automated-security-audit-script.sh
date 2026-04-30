#!/usr/bin/env bash
# Input:  Access to a Kubernetes cluster via kubectl
# Output: Security posture report highlighting misconfigurations

set -euo pipefail
echo "=== Kubernetes Security Audit ==="
echo "Cluster: $(kubectl config current-context)"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# 1. Check for pods running as root
echo "--- Pods Running as Root ---"
kubectl get pods -A -o json | \
  jq -r '.items[] | select(.spec.containers[].securityContext.runAsNonRoot != true) |
  "\(.metadata.namespace)/\(.metadata.name)"' | head -20

# 2. Check namespaces without Pod Security Standards
echo -e "\n--- Namespaces Without PSS Enforcement ---"
kubectl get ns -o json | \
  jq -r '.items[] | select(.metadata.labels["pod-security.kubernetes.io/enforce"] == null) |
  .metadata.name' | grep -v "^kube-"

# 3. Check for default NetworkPolicies
echo -e "\n--- Namespaces Without Default-Deny NetworkPolicy ---"
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  count=$(kubectl get networkpolicy -n "$ns" -o json 2>/dev/null | \
    jq '[.items[] | select(.spec.podSelector == {})] | length')
  if [ "$count" -eq 0 ]; then echo "$ns"; fi
done

# 4. Check for pods with automounted service account tokens
echo -e "\n--- Pods with Auto-Mounted SA Tokens ---"
kubectl get pods -A -o json | \
  jq -r '.items[] | select(.spec.automountServiceAccountToken != false) |
  "\(.metadata.namespace)/\(.metadata.name)"' | head -20

echo -e "\n=== Audit Complete ==="
