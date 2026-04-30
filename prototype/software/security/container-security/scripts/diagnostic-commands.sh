#!/bin/bash
# Docker Container Security Diagnostic Commands

# Check if container runs as root
docker exec <container> whoami
docker exec <container> id

# Inspect security configuration of running container
docker inspect <container> --format '{{json .HostConfig.SecurityOpt}}'
docker inspect <container> --format '{{json .HostConfig.CapDrop}}'
docker inspect <container> --format '{{json .HostConfig.ReadonlyRootfs}}'
docker inspect <container> --format '{{json .HostConfig.Privileged}}'

# Scan image for vulnerabilities with Trivy
trivy image --severity CRITICAL,HIGH myapp:latest

# Scan Dockerfile for misconfigurations
trivy config Dockerfile
hadolint Dockerfile

# Check image layers for secret leaks
docker history --no-trunc myapp:latest
docker image inspect myapp:latest --format '{{json .Config.Env}}'

# Run CIS Docker Benchmark audit
docker run --net host --pid host --userns host --cap-add audit_control   -v /var/lib:/var/lib -v /var/run/docker.sock:/var/run/docker.sock   -v /etc:/etc --label docker_bench_security   docker/docker-bench-security

# Check Docker daemon configuration
docker info --format '{{json .SecurityOptions}}'
docker info | grep -E "Rootless|Security|Runtimes"

# List capabilities of running container
docker exec <container> cat /proc/1/status | grep -i cap

# Verify image signature with Cosign
cosign verify --key cosign.pub myregistry.com/myapp:1.0
