#!/usr/bin/env python3
"""Container security scan wrapper for CI/CD pipelines."""
# Input:  Docker image reference (e.g., myapp:latest)
# Output: Pass/fail with vulnerability summary

import subprocess
import json
import sys

def scan_image(image_ref: str, severity: str = "CRITICAL,HIGH") -> dict:
    """Scan a Docker image with Trivy and return results."""
    result = subprocess.run(
        ["trivy", "image", "--format", "json",
         "--severity", severity, image_ref],
        capture_output=True, text=True
    )
    return json.loads(result.stdout) if result.stdout else {}

def check_results(report: dict, max_critical: int = 0, max_high: int = 5) -> bool:
    """Return True if image passes security gates."""
    critical = sum(1 for r in report.get("Results", [])
                   for v in r.get("Vulnerabilities", [])
                   if v.get("Severity") == "CRITICAL")
    high = sum(1 for r in report.get("Results", [])
               for v in r.get("Vulnerabilities", [])
               if v.get("Severity") == "HIGH")
    print(f"CRITICAL: {critical} (max: {max_critical}), HIGH: {high} (max: {max_high})")
    return critical <= max_critical and high <= max_high

if __name__ == "__main__":
    image = sys.argv[1] if len(sys.argv) > 1 else "myapp:latest"
    report = scan_image(image)
    if check_results(report):
        print("PASS: Image meets security requirements")
        sys.exit(0)
    else:
        print("FAIL: Image has too many vulnerabilities")
        sys.exit(1)
