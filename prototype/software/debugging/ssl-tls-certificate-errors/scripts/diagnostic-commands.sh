# === Core diagnostics ===
# Full TLS inspection
openssl s_client -connect host:443 -servername host

# Certificate dates
openssl s_client -connect host:443 -servername host 2>/dev/null | openssl x509 -noout -dates

# Subject Alternative Names
openssl s_client -connect host:443 -servername host 2>/dev/null \
  | openssl x509 -noout -text | grep -A3 "Subject Alternative Name"

# Certificate chain count
openssl s_client -connect host:443 -servername host 2>/dev/null | grep -c "BEGIN CERTIFICATE"

# Verify chain
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt fullchain.pem

# === TLS version testing ===
openssl s_client -tls1_2 -connect host:443 -servername host
openssl s_client -tls1_3 -connect host:443 -servername host

# === curl diagnostics ===
curl -v https://host 2>&1 | grep -E "SSL|TLS|certificate|expire"
curl --cacert /path/to/ca.pem https://internal-host

# === Days until expiry (one-liner) ===
echo | openssl s_client -connect host:443 -servername host 2>/dev/null \
  | openssl x509 -noout -enddate | cut -d= -f2

# === Check OCSP revocation ===
openssl s_client -connect host:443 -servername host -status 2>/dev/null | grep -A3 "OCSP"

# === Online tools ===
# SSL Labs: https://www.ssllabs.com/ssltest/
# Check certificate chain: https://whatsmychaincert.com/
