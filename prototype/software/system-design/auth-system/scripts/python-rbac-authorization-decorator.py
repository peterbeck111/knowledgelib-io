# Input:  Flask request with JWT in Authorization header
# Output: Decorated endpoint enforces role check or returns 403

from functools import wraps
from flask import request, jsonify, g
import jwt  # PyJWT==2.x

PUBLIC_KEY = open("keys/public.pem").read()

def require_auth(f):
    """Authentication decorator — verifies JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            g.user = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

def require_role(*roles):
    """Authorization decorator — checks user roles."""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            user_roles = g.user.get("roles", [])
            if not any(r in user_roles for r in roles):
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# Usage
@app.route("/admin/users", methods=["DELETE"])
@require_role("admin")
def delete_user():
    # Only admins reach here
    pass
