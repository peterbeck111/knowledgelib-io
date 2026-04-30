# Input:  auth_url, token_url, client_id
# Output: PKCE authorization + token exchange

import hashlib, base64, os, secrets, urllib.parse
import httpx  # pip install httpx>=0.27

def generate_pkce_pair():
    """Generate code_verifier and code_challenge (S256)."""
    verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b'=').decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b'=').decode()
    return verifier, challenge

def build_auth_url(auth_url, client_id, redirect_uri, scope, challenge):
    """Build authorization URL with PKCE parameters."""
    params = urllib.parse.urlencode({
        'response_type': 'code',
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'scope': scope,
        'state': secrets.token_urlsafe(32),
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
    })
    return f"{auth_url}?{params}"

async def exchange_code(token_url, client_id, code, verifier, redirect_uri):
    """Exchange authorization code for tokens using code_verifier."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(token_url, data={
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'code': code,
            'code_verifier': verifier,
            'redirect_uri': redirect_uri,
        })
        resp.raise_for_status()
        return resp.json()
