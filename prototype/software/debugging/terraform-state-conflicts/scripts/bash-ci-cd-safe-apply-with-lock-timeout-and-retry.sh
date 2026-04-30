#!/usr/bin/env bash
# Input:  Terraform workspace directory
# Output: Safe apply with lock timeout, retry, and auto-unlock on stale lock

set -euo pipefail

MAX_RETRIES=3
LOCK_TIMEOUT="5m"

for attempt in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $attempt of $MAX_RETRIES"
  if terraform apply -auto-approve -lock-timeout="$LOCK_TIMEOUT" 2>&1; then
    echo "Apply succeeded"
    exit 0
  else
    EXIT_CODE=$?
    # Check if it was a lock error
    if terraform plan -lock-timeout=30s 2>&1 | grep -q "Error acquiring the state lock"; then
      echo "State lock detected, extracting lock ID..."
      LOCK_ID=$(terraform plan 2>&1 | grep -oP 'ID:\s+\K[a-f0-9-]+' || true)
      if [ -n "$LOCK_ID" ]; then
        echo "Force-unlocking stale lock: $LOCK_ID"
        terraform force-unlock -force "$LOCK_ID"
      fi
    else
      echo "Non-lock error, exiting with code $EXIT_CODE"
      exit $EXIT_CODE
    fi
  fi
done
echo "Failed after $MAX_RETRIES attempts"
exit 1
