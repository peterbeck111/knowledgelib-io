# Scan for hardcoded secrets in your repository
gitleaks detect --source . --verbose

# Check GitHub Actions workflows for security issues
# Install: pip install actionlint (or download binary)
actionlint .github/workflows/*.yml

# Verify a container image signature with Cosign
cosign verify --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/your-org/your-image@sha256:abc123

# Scan a container image for vulnerabilities
trivy image --severity CRITICAL,HIGH myapp:latest

# Check for unpinned GitHub Actions in workflows
grep -rn 'uses:.*@v[0-9]' .github/workflows/

# Audit npm dependencies for known vulnerabilities
npm audit --audit-level=high

# Check if OIDC is configured correctly (GitHub Actions)
# In a workflow step:
curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq .value

# List all secrets accessed in recent GitLab CI pipelines
# GitLab Admin API:
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.example.com/api/v4/projects/:id/audit_events?created_after=2026-01-01"

# Validate SLSA provenance of an artifact
slsa-verifier verify-artifact myapp-binary \
  --provenance-path provenance.intoto.jsonl \
  --source-uri github.com/your-org/your-repo
