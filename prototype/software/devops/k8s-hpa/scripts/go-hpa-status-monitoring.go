// Input:  Kubernetes cluster access
// Output: Prints current HPA status for all HPAs in a namespace

package main

import (
    "context"
    "fmt"
    "os"
    "path/filepath"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    kubeconfig := filepath.Join(os.Getenv("HOME"), ".kube", "config")
    config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
    if err != nil {
        panic(err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err)
    }

    hpaList, err := clientset.AutoscalingV2().
        HorizontalPodAutoscalers("default").
        List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        panic(err)
    }

    for _, hpa := range hpaList.Items {
        fmt.Printf("HPA: %s | Replicas: %d/%d (min: %d, max: %d) | Conditions:\n",
            hpa.Name,
            hpa.Status.CurrentReplicas,
            hpa.Status.DesiredReplicas,
            *hpa.Spec.MinReplicas,
            hpa.Spec.MaxReplicas,
        )
        for _, cond := range hpa.Status.Conditions {
            fmt.Printf("  - %s: %s (%s)\n", cond.Type, cond.Status, cond.Message)
        }
    }
}
