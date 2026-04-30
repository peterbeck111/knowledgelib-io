# Input:  Kubernetes cluster with kubeconfig configured
# Output: Creates/updates an HPA programmatically

from kubernetes import client, config  # kubernetes==29.0.0

config.load_kube_config()
autoscaling_v2 = client.AutoscalingV2Api()

hpa = client.V2HorizontalPodAutoscaler(
    metadata=client.V1ObjectMeta(name="my-app-hpa", namespace="default"),
    spec=client.V2HorizontalPodAutoscalerSpec(
        scale_target_ref=client.V2CrossVersionObjectReference(
            api_version="apps/v1", kind="Deployment", name="my-app"
        ),
        min_replicas=2,
        max_replicas=20,
        metrics=[
            client.V2MetricSpec(
                type="Resource",
                resource=client.V2ResourceMetricSource(
                    name="cpu",
                    target=client.V2MetricTarget(
                        type="Utilization", average_utilization=50
                    ),
                ),
            )
        ],
    ),
)

# Create or update
try:
    autoscaling_v2.create_namespaced_horizontal_pod_autoscaler("default", hpa)
    print("HPA created")
except client.exceptions.ApiException as e:
    if e.status == 409:  # Already exists
        autoscaling_v2.patch_namespaced_horizontal_pod_autoscaler(
            "my-app-hpa", "default", hpa
        )
        print("HPA updated")
    else:
        raise
