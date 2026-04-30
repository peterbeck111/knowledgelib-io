import jwt  # PyJWT >= 2.4.0

# Input:  JWT string, RSA public key (PEM), expected issuer and audience
# Output: Decoded claims dict, or raises exception on invalid token

def verify_token(token: str, public_key: str) -> dict:
    """Verify JWT with all security checks."""
    try:
        payload = jwt.decode(
            token,
            key=public_key,
            algorithms=["RS256"],         # Explicit allowlist -- NEVER omit
            audience="https://api.example.com",
            issuer="https://auth.example.com",
            options={
                "require": ["exp", "iss", "aud", "sub", "jti"],
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": True,
            }
        )
        # Check revocation denylist
        if is_revoked(payload.get("jti")):
            raise jwt.InvalidTokenError("Token has been revoked")
        return payload
    except jwt.ExpiredSignatureError:
        raise  # Token expired
    except jwt.InvalidAudienceError:
        raise  # Wrong audience
    except jwt.InvalidIssuerError:
        raise  # Wrong issuer
    except jwt.InvalidTokenError as e:
        raise  # Catch-all for other JWT errors
