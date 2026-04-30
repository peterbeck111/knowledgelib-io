#!/bin/bash
# Input:  Jenkinsfile path
# Output: Basic .github/workflows/ci.yml

set -euo pipefail

JENKINSFILE="${1:-Jenkinsfile}"
OUTPUT=".github/workflows/ci.yml"

mkdir -p .github/workflows

echo "Analyzing $JENKINSFILE..."

# Extract stages
stages=$(grep -oP "stage\('([^']+)'\)" "$JENKINSFILE" | sed "s/stage('\(.*\)')/\1/")

cat > "$OUTPUT" << 'HEADER'
name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
HEADER

for stage in $stages; do
  slug=$(echo "$stage" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  cat >> "$OUTPUT" << EOF
  $slug:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: $stage
        run: echo "TODO: convert Jenkins stage '$stage'"
EOF
done

echo "Generated $OUTPUT with $(echo "$stages" | wc -l) jobs"
echo "⚠️  Review and fill in actual commands for each job"
