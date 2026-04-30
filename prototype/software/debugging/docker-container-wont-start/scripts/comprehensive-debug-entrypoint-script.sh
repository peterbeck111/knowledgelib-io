#!/bin/sh
# Input:  Container that fails with unclear errors
# Output: Detailed diagnostic output before main process starts

set -e

echo "=== Container Debug Info ==="
echo "Date:      $(date -u)"
echo "Hostname:  $(hostname)"
echo "User:      $(whoami) (UID=$(id -u), GID=$(id -g))"
echo "Workdir:   $(pwd)"
echo "OS:        $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 || echo 'unknown')"
echo "Arch:      $(uname -m)"

echo ""
echo "=== Environment ==="
env | sort | grep -v -E '(PASSWORD|SECRET|KEY|TOKEN)' || true

echo ""
echo "=== File Permissions ==="
ls -la /app/ 2>/dev/null || echo "/app does not exist"

echo ""
echo "=== Connectivity Check ==="
if [ -n "$DATABASE_URL" ]; then
    DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
    DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
    echo "Checking DB: $DB_HOST:$DB_PORT"
    nc -zv "$DB_HOST" "$DB_PORT" 2>&1 || echo "⚠️ Cannot reach database!"
fi

echo ""
echo "=== Starting Application ==="
exec "$@"
