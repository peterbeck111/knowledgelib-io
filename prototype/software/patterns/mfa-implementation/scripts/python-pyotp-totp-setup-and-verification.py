# Input:  User email, issuer name
# Output: Provisioning URI, base32 secret, verification result

import pyotp  # v2.9.0
from cryptography.fernet import Fernet  # v42.0.0

def setup_totp(user_email: str, issuer: str) -> dict:
    """Generate TOTP secret and provisioning URI."""
    secret = pyotp.random_base32(length=32)  # 160-bit secret
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=user_email,
        issuer_name=issuer
    )
    return {"secret": secret, "provisioning_uri": uri}

def verify_totp(token: str, secret: str) -> bool:
    """Verify a TOTP token with 1-step tolerance."""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)

def encrypt_secret(secret: str, key: bytes) -> str:
    """Encrypt TOTP secret for database storage."""
    f = Fernet(key)  # key = Fernet.generate_key()
    return f.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted: str, key: bytes) -> str:
    """Decrypt TOTP secret from database."""
    f = Fernet(key)
    return f.decrypt(encrypted.encode()).decode()
