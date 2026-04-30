# Check CORS headers for a specific origin
curl -sI -H "Origin: https://app.example.com" https://your-api.com/endpoint \
  | grep -i "access-control\|vary"

# Test preflight (OPTIONS) request
curl -sI -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  https://your-api.com/endpoint

# Verify blocked origin returns no ACAO
curl -sI -H "Origin: https://evil.com" https://your-api.com/endpoint \
  | grep -i access-control
# Expected: no Access-Control headers in output

# Check if null origin is allowed (security test -- should fail)
curl -sI -H "Origin: null" https://your-api.com/endpoint \
  | grep -i access-control

# Full verbose CORS trace (shows preflight + actual request)
curl -v -X PUT \
  -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -d '{"test":true}' \
  https://your-api.com/endpoint 2>&1 | grep -i "< access-control\|< vary"

# Browser DevTools: check CORS errors
# Chrome: DevTools > Console > filter for "CORS"
# Firefox: DevTools > Console > filter for "Cross-Origin Request Blocked"
