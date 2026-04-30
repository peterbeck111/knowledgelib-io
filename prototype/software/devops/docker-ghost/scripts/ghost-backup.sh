#!/bin/bash
# Ghost CMS Docker backup script
# Usage: ./ghost-backup.sh
# Requires: docker compose stack running with services named "db" and "ghost"
# Creates: timestamped backup directory with database dump and content archive

set -euo pipefail

BACKUP_DIR=~/ghost-backups/$(date +%Y-%m-%d)
COMPOSE_DIR=~/ghost-blog  # Adjust to your docker-compose.yml location
DB_SERVICE=db
MYSQL_ROOT_PASS="${MYSQL_ROOT_PASSWORD:-}"
DB_NAME="${GHOST_DB_NAME:-ghostdb}"
CONTENT_VOLUME=ghost_content  # Named volume from docker-compose.yml

mkdir -p "$BACKUP_DIR"

echo "=== Ghost Backup: $(date) ==="

# 1. Database backup (compressed)
echo "Backing up database..."
docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T "$DB_SERVICE" \
  mysqldump -u root -p"$MYSQL_ROOT_PASS" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/ghost_db.sql.gz"

# 2. Content volume backup (images, themes, settings)
echo "Backing up content volume..."
docker run --rm \
  -v "${CONTENT_VOLUME}:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf /backup/ghost_content.tar.gz -C /data .

echo "=== Backup complete ==="
echo "Files: $(ls -lh "$BACKUP_DIR")"
