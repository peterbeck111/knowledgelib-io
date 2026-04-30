# settings.py -- using django-csp >= 4.0
# pip install django-csp

MIDDLEWARE = [
    "csp.middleware.CSPMiddleware",
    # ... other middleware
]

# Strict nonce-based CSP
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ["'self'"],
        "script-src": ["'strict-dynamic'"],  # nonces added automatically
        "style-src": ["'self'"],
        "img-src": ["'self'", "https:"],
        "connect-src": ["'self'"],
        "font-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'none'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": True,
    }
}

# In templates, use the nonce:
# {% load csp %}
# <script nonce="{% csp_nonce %}">...</script>
