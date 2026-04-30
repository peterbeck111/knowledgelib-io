# Input:  client_id, scopes, IdP endpoints
# Output: access_token + refresh_token

import time
import requests
import sys

class DeviceFlowClient:
    def __init__(self, client_id, device_code_url, token_url):
        self.client_id = client_id
        self.device_code_url = device_code_url
        self.token_url = token_url

    def authenticate(self, scope="openid profile"):
        # Step 1: Request device code
        resp = requests.post(self.device_code_url, data={
            "client_id": self.client_id,
            "scope": scope,
        })
        resp.raise_for_status()
        auth = resp.json()

        # Step 2: Display instructions
        print(f"\nTo sign in, visit: {auth['verification_uri']}")
        print(f"Enter code: {auth['user_code']}\n")
        if "verification_uri_complete" in auth:
            print(f"Or open: {auth['verification_uri_complete']}\n")

        # Step 3: Poll for token
        interval = auth.get("interval", 5)
        expires_at = time.time() + auth["expires_in"]

        while time.time() < expires_at:
            time.sleep(interval)
            token_resp = requests.post(self.token_url, data={
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "device_code": auth["device_code"],
                "client_id": self.client_id,
            })
            data = token_resp.json()

            if token_resp.status_code == 200:
                return data

            error = data.get("error")
            if error == "authorization_pending":
                continue
            elif error == "slow_down":
                interval += 5
            elif error == "access_denied":
                sys.exit("Authorization denied by user.")
            elif error == "expired_token":
                sys.exit("Code expired. Please restart.")
            else:
                sys.exit(f"Error: {error}: {data.get('error_description')}")

        sys.exit("Code expired before authorization completed.")
