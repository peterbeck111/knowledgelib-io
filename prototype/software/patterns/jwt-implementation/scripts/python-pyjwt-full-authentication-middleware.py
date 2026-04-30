# Input:  HTTP request with Authorization: Bearer <token>
# Output: Authenticated user context or 401 response

# pip install PyJWT>=2.8.0 cryptography>=42.0
import jwt
from functools import wraps
from flask import request, jsonify, g

PUBLIC_KEY = open("public.pem").read()
ALLOWED_ALGORITHMS = ["RS256"]  # Hard-coded, never from token
ISSUER = "https://api.example.com"
AUDIENCE = "https://app.example.com"

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing bearer token"}), 401
        token = auth_header[7:]
        try:
            g.user = jwt.decode(
                token, PUBLIC_KEY,
                algorithms=ALLOWED_ALGORITHMS,
                audience=AUDIENCE, issuer=ISSUER,
                options={"require": ["exp", "sub", "iss", "aud"]}
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"Invalid token: {e}"}), 401
        return f(*args, **kwargs)
    return decorated
