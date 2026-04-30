#!/bin/bash
# Input:  hostname (and optional port, default 443)
# Output: Complete SSL/TLS diagnostic report

HOST="$1"
PORT="${2:-443}"

if [ -z "$HOST" ]; then
    echo "Usage: $0 <hostname> [port]"
    exit 1
fi

echo "============================================"
echo "SSL/TLS Diagnostic: $HOST:$PORT"
echo "Time: $(date -u)"
echo "============================================"

# Get certificate
CERT=$(echo | openssl s_client -connect "$HOST:$PORT" -servername "$HOST" 2>/dev/null)

if [ -z "$CERT" ]; then
    echo "❌ Cannot connect to $HOST:$PORT"
    exit 1
fi

# Extract cert info
CERT_PEM=$(echo "$CERT" | openssl x509 2>/dev/null)

echo ""
echo "=== Certificate Details ==="
echo "$CERT_PEM" | openssl x509 -noout -subject -issuer -dates 2>/dev/null

echo ""
echo "=== Subject Alternative Names ==="
echo "$CERT_PEM" | openssl x509 -noout -text 2>/dev/null | grep -A3 "Subject Alternative Name" | tail -2

echo ""
echo "=== Certificate Chain ==="
CHAIN_COUNT=$(echo "$CERT" | grep -c "BEGIN CERTIFICATE")
echo "  Certificates in chain: $CHAIN_COUNT"
if [ "$CHAIN_COUNT" -lt 2 ]; then
    echo "  ⚠️  Chain may be incomplete (expected 2+)"
fi

echo ""
echo "=== Expiry Check ==="
NOT_AFTER=$(echo "$CERT_PEM" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$NOT_AFTER" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "  Expires: $NOT_AFTER"
if [ "$DAYS_LEFT" -lt 0 ]; then
    echo "  ❌ EXPIRED ${DAYS_LEFT#-} days ago!"
elif [ "$DAYS_LEFT" -lt 14 ]; then
    echo "  🔴 CRITICAL: $DAYS_LEFT days left — renew immediately!"
elif [ "$DAYS_LEFT" -lt 30 ]; then
    echo "  🟡 WARNING: $DAYS_LEFT days left — renew soon"
else
    echo "  ✅ $DAYS_LEFT days remaining"
fi

echo ""
echo "=== Hostname Verification ==="
echo | openssl s_client -connect "$HOST:$PORT" -servername "$HOST" 2>&1 \
  | grep -E "Verify return code|verify error" | head -3

echo ""
echo "=== TLS Protocol Support ==="
for VER in tls1_2 tls1_3; do
    RESULT=$(echo | openssl s_client -"$VER" -connect "$HOST:$PORT" -servername "$HOST" 2>&1 | grep -E "Protocol|no peer certificate|handshake failure" | head -1)
    echo "  $VER: $RESULT"
done

echo ""
echo "=== OCSP Stapling ==="
echo | openssl s_client -connect "$HOST:$PORT" -servername "$HOST" -status 2>/dev/null \
  | grep -A3 "OCSP Response" | head -4

echo ""
echo "=== Recommendations ==="
VERIFY=$(echo "$CERT" | grep "Verify return code")
if echo "$VERIFY" | grep -q "ok (0)"; then
    echo "  ✅ Certificate chain validates successfully"
else
    echo "  ❌ Verification failed: $VERIFY"
fi
