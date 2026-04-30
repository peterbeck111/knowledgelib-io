# === Find CrashLoopBackOff pods ===
kubectl get pods -A | grep CrashLoopBackOff
kubectl get pods -A | grep -E "0/[0-9]+"   # Not ready

# === Pod details ===
kubectl describe pod <pod> -n <ns>
kubectl get pod <pod> -o yaml
kubectl get pod <pod> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'
kubectl get pod <pod> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'

# === Logs ===
kubectl logs <pod> --previous                # Previous crash
kubectl logs <pod> --previous --tail=50      # Last 50 lines
kubectl logs <pod> -c <container> --previous # Multi-container
kubectl logs <pod> -c <init-container>       # Init container

# === Events ===
kubectl get events -n <ns> --sort-by='.lastTimestamp' | tail -20
kubectl get events --field-selector involvedObject.name=<pod> -n <ns>

# === Resources ===
kubectl top pod <pod> -n <ns>                # Current usage
kubectl top nodes                             # Node resources
kubectl describe node <node> | grep -A10 "Allocated resources"

# === Interactive debugging ===
kubectl debug -it <pod> --image=busybox --target=<container>  # Ephemeral (K8s 1.23+)
kubectl exec -it <pod> -- /bin/sh             # Shell into running container
kubectl run debug --rm -it --image=busybox -- /bin/sh  # Temp debug pod

# === Config inspection ===
kubectl get configmap -n <ns>
kubectl get secret -n <ns>
kubectl get pod <pod> -o jsonpath='{.spec.containers[0].env}'
