#!/bin/bash
# Input:  docker-compose.yml
# Output: Deployed Kubernetes application

set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.yml}"
NAMESPACE="${2:-default}"
OUTPUT_DIR="./k8s-manifests"

echo "=== Docker Compose to Kubernetes Migration ==="

# Step 1: Convert
echo "Converting $COMPOSE_FILE..."
mkdir -p "$OUTPUT_DIR"
kompose convert -f "$COMPOSE_FILE" --out "$OUTPUT_DIR"

# Step 2: Validate
echo "Validating manifests..."
for f in "$OUTPUT_DIR"/*.yaml; do
  kubectl apply --dry-run=client -f "$f" 2>&1 | grep -v "configured" || true
done

# Step 3: Deploy
echo "Deploying to namespace $NAMESPACE..."
kubectl apply -f "$OUTPUT_DIR/" -n "$NAMESPACE"

# Step 4: Wait for rollout
for deployment in $(kubectl get deployments -n "$NAMESPACE" -o name); do
  echo "Waiting for $deployment..."
  kubectl rollout status "$deployment" -n "$NAMESPACE" --timeout=120s
done

echo "=== Migration complete ==="
kubectl get all -n "$NAMESPACE"
