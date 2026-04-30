#!/bin/bash
# Input:  Fresh Kubernetes cluster with kubectl configured
# Output: cert-manager installed with staging + production issuers

set -euo pipefail

EMAIL="your-email@example.com"
CM_VERSION="v1.17.2"

# 1. Install cert-manager with Helm
helm repo add jetstack https://charts.jetstack.io --force-update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version "$CM_VERSION" \
  --set crds.enabled=true \
  --wait

# 2. Verify installation
kubectl wait --for=condition=Available \
  deployment/cert-manager \
  deployment/cert-manager-cainjector \
  deployment/cert-manager-webhook \
  -n cert-manager --timeout=120s

echo "cert-manager $CM_VERSION installed successfully."

# 3. Create staging ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    email: $EMAIL
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
EOF

# 4. Create production ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: $EMAIL
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
EOF

# 5. Verify issuers
kubectl wait --for=condition=Ready clusterissuer/letsencrypt-staging --timeout=60s
kubectl wait --for=condition=Ready clusterissuer/letsencrypt-prod --timeout=60s

echo "Both ClusterIssuers are ready."
