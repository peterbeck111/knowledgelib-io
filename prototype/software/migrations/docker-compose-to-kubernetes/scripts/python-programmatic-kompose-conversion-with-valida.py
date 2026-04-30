# Input:  docker-compose.yml path
# Output: Validated Kubernetes manifests

import subprocess
import yaml
from pathlib import Path

def convert_and_validate(compose_file: str, output_dir: str = "./k8s") -> list[str]:
    """Convert docker-compose.yml to K8s manifests and validate."""
    Path(output_dir).mkdir(exist_ok=True)

    # Run kompose convert
    result = subprocess.run(
        ["kompose", "convert", "-f", compose_file, "--out", output_dir],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"Kompose failed: {result.stderr}")

    # Validate generated manifests
    manifests = list(Path(output_dir).glob("*.yaml"))
    issues = []
    for f in manifests:
        doc = yaml.safe_load(f.read_text())
        kind = doc.get("kind", "Unknown")

        if kind == "Deployment":
            containers = doc["spec"]["template"]["spec"]["containers"]
            for c in containers:
                if "livenessProbe" not in c:
                    issues.append(f"{f.name}: {c['name']} missing livenessProbe")
                if "resources" not in c:
                    issues.append(f"{f.name}: {c['name']} missing resource limits")

    if issues:
        print("⚠️  Production readiness issues:")
        for i in issues:
            print(f"  - {i}")

    return [str(f) for f in manifests]
