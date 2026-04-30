# Input:  Running WordPress Docker Compose stack
# Output: Common WordPress management operations

# Install and activate a plugin
docker compose run --rm wpcli plugin install woocommerce --activate

# Update all plugins
docker compose run --rm wpcli plugin update --all

# Install a theme
docker compose run --rm wpcli theme install flavor flavor --activate

# Search-replace URLs (e.g., after domain migration)
docker compose run --rm wpcli search-replace \
  'http://localhost:8080' 'https://example.com' --all-tables

# Export database (WP-CLI method)
docker compose run --rm wpcli db export /var/www/html/backup.sql

# Import database
docker compose run --rm wpcli db import /var/www/html/backup.sql

# Check WordPress status
docker compose run --rm wpcli core version
docker compose run --rm wpcli plugin list
docker compose run --rm wpcli theme list

# Enable multisite
docker compose run --rm wpcli core multisite-install \
  --title="Network" --admin_user=admin --admin_email=admin@example.com

# Reset user password
docker compose run --rm wpcli user update admin --user_pass=new_password

# Flush caches and rewrite rules
docker compose run --rm wpcli cache flush
docker compose run --rm wpcli rewrite flush
