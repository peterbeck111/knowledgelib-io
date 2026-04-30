#!/usr/bin/env bash
# bootstrap-ssl.sh -- Initial SSL Certificate Bootstrapping
# Input:  DOMAIN and EMAIL environment variables
# Output: Valid Let's Encrypt certificate + running Nginx with full SSL
#
# This script solves the chicken-and-egg problem: Nginx needs certs to start,
# but Certbot needs Nginx running to complete HTTP-01 challenges.
#
# Usage:
#   DOMAIN=example.com EMAIL=you@example.com ./bootstrap-ssl.sh
#   DOMAIN=example.com EMAIL=you@example.com STAGING=1 ./bootstrap-ssl.sh  # test first

set -euo pipefail

DOMAIN="${DOMAIN:?Error: Set DOMAIN env var (e.g., example.com)}"
EMAIL="${EMAIL:?Error: Set EMAIL env var (e.g., you@example.com)}"
STAGING="${STAGING:-0}"  # Set to 1 for Let's Encrypt staging server

COMPOSE="docker compose"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"

echo "=== SSL Bootstrap for ${DOMAIN} ==="

# Step 1: Create dummy certificate so Nginx can start
echo "[1/5] Creating dummy certificate..."
$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:4096 \
  -days 1 -keyout '${CERT_PATH}/privkey.pem' \
  -out '${CERT_PATH}/fullchain.pem' \
  -subj '/CN=localhost'" certbot
echo "  Dummy certificate created."

# Step 2: Start Nginx with dummy cert
echo "[2/5] Starting Nginx..."
$COMPOSE up --force-recreate -d nginx
echo "  Nginx started."

# Step 3: Delete dummy certificate
echo "[3/5] Removing dummy certificate..."
$COMPOSE run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/${DOMAIN} && \
  rm -rf /etc/letsencrypt/archive/${DOMAIN} && \
  rm -rf /etc/letsencrypt/renewal/${DOMAIN}.conf" certbot
echo "  Dummy certificate removed."

# Step 4: Request real certificate from Let's Encrypt
echo "[4/5] Requesting certificate from Let's Encrypt..."
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
  STAGING_FLAG="--staging"
  echo "  (Using staging server -- certificate will NOT be trusted by browsers)"
fi

$COMPOSE run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  ${STAGING_FLAG} \
  --rsa-key-size 4096

echo "  Certificate obtained successfully."

# Step 5: Reload Nginx with real certificate
echo "[5/5] Reloading Nginx with valid certificate..."
$COMPOSE exec nginx nginx -s reload
echo "  Nginx reloaded."

echo ""
echo "=== SSL Bootstrap Complete ==="
echo "  Domain: https://${DOMAIN}"
echo "  Certificate: Let's Encrypt $([ "$STAGING" = "1" ] && echo "(STAGING)" || echo "(production)")"
echo "  Auto-renewal: Start certbot service with 'docker compose up -d certbot'"
