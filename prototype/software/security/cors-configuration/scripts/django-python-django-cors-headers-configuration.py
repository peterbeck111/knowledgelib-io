# Input:  Django project needing CORS for a separate frontend
# Output: CORS middleware adds headers to all responses

# 1. Install: pip install django-cors-headers
# 2. settings.py:

INSTALLED_APPS = [
    'corsheaders',          # Add before other apps
    # ... other apps
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # MUST be before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

# Allowlist of origins (never use CORS_ALLOW_ALL_ORIGINS=True in production)
CORS_ALLOWED_ORIGINS = [
    'https://app.example.com',
    'https://staging.example.com',
]

CORS_ALLOW_CREDENTIALS = True  # Allow cookies/auth headers

CORS_ALLOW_METHODS = [
    'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS',
]

CORS_ALLOW_HEADERS = [
    'accept', 'authorization', 'content-type', 'x-request-id',
]

CORS_PREFLIGHT_MAX_AGE = 600   # Cache preflight for 10 minutes
