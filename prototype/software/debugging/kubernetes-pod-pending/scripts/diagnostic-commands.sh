# === Find Pending pods ===
kubectl get pods -A --field-selector=status.phase=Pending

# === Pod details (MOST IMPORTANT) ===
kubectl describe pod <pod> -n <ns>                    # Focus on Events section
kubectl get events -n <ns> --field-selector involvedObject.name=<pod>

# === Node resources ===
kubectl top nodes                                      # Actual usage
kubectl describe nodes | grep -A5 "Allocatable:"       # What's available
kubectl describe node <node> | grep -A20 "Allocated resources"  # Requested vs allocatable

# === Taints ===
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints[*].key
kubectl describe node <node> | grep -A5 "Taints:"

# === Labels ===
kubectl get nodes --show-labels
kubectl get pod <pod> -o jsonpath='{.spec.nodeSelector}'

# === PVC ===
kubectl get pvc -n <ns>                                # Bound or Pending?
kubectl describe pvc <pvc-name> -n <ns>                # Why is it Pending?
kubectl get pv                                         # Available PVs
kubectl get storageclass                               # Available StorageClasses

# === Quotas ===
kubectl get resourcequota -n <ns>
kubectl describe resourcequota -n <ns>

# === Node schedulability ===
kubectl get nodes                                      # SchedulingDisabled = cordoned
kubectl uncordon <node-name>                           # Re-enable scheduling

# === Scheduler ===
kubectl get pods -n kube-system | grep scheduler       # Is it running?
kubectl logs -n kube-system kube-scheduler-<node>      # Scheduler logs
