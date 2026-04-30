#!/bin/bash
# Input:  Domain name(s) and email for Let's Encrypt
# Output: Automated certificate issuance + renewal setup

DOMAIN="$1"
EMAIL="$2"
EXTRA_DOMAINS="${3:-}"  # Optional: "www.example.com api.example.com"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <domain> <email> [extra-domains]"
    exit 1
fi

# Install certbot
if ! command -v certbot &>/dev/null; then
    apt-get update && apt-get install -y certbot python3-certbot-nginx
fi

# Build domain arguments
DOMAIN_ARGS="-d $DOMAIN"
for d in $EXTRA_DOMAINS; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

# Issue certificate
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    $DOMAIN_ARGS \
    --redirect  # Auto-redirect HTTP → HTTPS

# Verify renewal works
certbot renew --dry-run

# Set up cron for renewal (if systemd timer not available)
if ! systemctl is-active certbot.timer &>/dev/null; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
fi

echo "✅ Certificate issued for $DOMAIN"
echo "   Renewal: automatic (systemd timer or cron)"
echo "   Check: openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"
