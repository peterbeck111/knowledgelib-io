#!/bin/bash
# Input:  Heroku app name, Railway project
# Output: Fully migrated app on Railway

set -euo pipefail

HEROKU_APP="$1"
echo "=== Migrating $HEROKU_APP to Railway ==="

# Export Heroku config
echo "Exporting Heroku config vars..."
heroku config -a "$HEROKU_APP" --shell > /tmp/heroku_vars.txt

# Create Railway project
railway init --name "$HEROKU_APP"

# Import variables
echo "Importing environment variables..."
while IFS='=' read -r key value; do
  [[ "$key" =~ ^(DATABASE_URL|HEROKU_) ]] && continue  # Skip Heroku-managed vars
  railway variables set "$key=$value" 2>/dev/null || true
done < /tmp/heroku_vars.txt

# Add database
echo "Creating Railway Postgres..."
railway add --plugin postgresql

# Migrate data
echo "Migrating database..."
HEROKU_DB_URL=$(heroku config:get DATABASE_URL -a "$HEROKU_APP")
pg_dump "$HEROKU_DB_URL" -Fc -f /tmp/heroku_db.dump

RAILWAY_DB_URL=$(railway variables get DATABASE_URL)
pg_restore "$RAILWAY_DB_URL" /tmp/heroku_db.dump || true

# Deploy
echo "Deploying..."
railway up

echo "=== Migration complete ==="
echo "Check: railway status"
echo "Logs:  railway logs"
