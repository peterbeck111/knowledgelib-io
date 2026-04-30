# Check SameSite attribute on cookies
curl -sI -b cookies.txt https://your-site.com/login | grep -i set-cookie

# Test CSRF protection -- submit form without token (should fail)
curl -X POST https://your-site.com/api/transfer \
  -H "Cookie: sessionid=valid_session" \
  -d "amount=100&recipient=attacker"
# Expected: 403 Forbidden

# Test with valid CSRF token (should succeed)
curl -X POST https://your-site.com/api/transfer \
  -H "Cookie: sessionid=valid_session" \
  -H "X-CSRF-Token: valid_token_here" \
  -d "amount=100&recipient=joe"

# Check Fetch Metadata headers sent by browser
# In browser DevTools > Network > select request > check Sec-Fetch-* headers

# Verify Origin header validation
curl -X POST https://your-site.com/api/transfer \
  -H "Origin: https://evil.com" \
  -H "Cookie: sessionid=valid_session" \
  -d "amount=100"
# Expected: 403 Forbidden

# Scan for CSRF vulnerabilities with OWASP ZAP
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://your-site.com -r report.html

# Find forms missing CSRF tokens in HTML
grep -rn '<form' --include="*.html" --include="*.jinja2" --include="*.ejs" . | \
  grep -v 'csrf\|_token\|csrfmiddlewaretoken'
