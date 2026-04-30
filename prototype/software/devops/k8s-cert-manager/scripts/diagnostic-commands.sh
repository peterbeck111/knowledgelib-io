# Check cert-manager pods are running
kubectl get pods -n cert-manager

# Check ClusterIssuer/Issuer status
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod

# List all certificates and their READY status
kubectl get certificates --all-namespaces

# Describe a specific certificate (shows events and conditions)
kubectl describe certificate <name> -n <namespace>

# Follow the issuance chain: Certificate -> CertificateRequest -> Order -> Challenge
kubectl get certificaterequest -n <namespace>
kubectl describe certificaterequest <name> -n <namespace>

kubectl get order -n <namespace>
kubectl describe order <name> -n <namespace>

kubectl get challenges --all-namespaces
kubectl describe challenge <name> -n <namespace>

# Check the actual TLS secret was created
kubectl get secret <secretName> -n <namespace> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text

# Check certificate expiry date
kubectl get secret <secretName> -n <namespace> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# View cert-manager controller logs
kubectl logs -n cert-manager deploy/cert-manager --tail=100

# Check if HTTP-01 solver created an ingress
kubectl get ingress --all-namespaces | grep acme

# Test DNS-01 TXT record propagation
dig _acme-challenge.example.com TXT +short

# Check cert-manager version
kubectl get deployment cert-manager -n cert-manager -o jsonpath='{.spec.template.spec.containers[0].image}'
