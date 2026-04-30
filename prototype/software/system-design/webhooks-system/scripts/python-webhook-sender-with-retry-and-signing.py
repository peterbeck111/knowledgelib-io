# Input:  event dict, subscriber endpoint URL, signing secret
# Output: delivery result (success/failure/dlq)

import hmac, hashlib, base64, time, json, uuid
import httpx, asyncio, random

RETRY_DELAYS = [0, 5, 300, 1800, 7200, 18000, 36000, 50400, 72000, 86400]

async def send_webhook(event: dict, endpoint_url: str, secret: str) -> str:
    """Send a signed webhook with exponential backoff retry."""
    msg_id = f"msg_{uuid.uuid4().hex[:16]}"
    payload = json.dumps(event, separators=(",", ":")).encode("utf-8")

    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(len(RETRY_DELAYS)):
            # Wait before retry (0 on first attempt)
            if attempt > 0:
                delay = RETRY_DELAYS[attempt]
                await asyncio.sleep(delay + random.uniform(0, delay * 0.1))

            # Sign the payload
            timestamp = str(int(time.time()))
            to_sign = f"{msg_id}.{timestamp}.{payload.decode()}"
            sig = hmac.new(
                base64.b64decode(secret), to_sign.encode(), hashlib.sha256
            ).digest()
            headers = {
                "Content-Type": "application/json",
                "webhook-id": msg_id,
                "webhook-timestamp": timestamp,
                "webhook-signature": f"v1,{base64.b64encode(sig).decode()}",
            }

            try:
                resp = await client.post(endpoint_url, content=payload, headers=headers)
                if 200 <= resp.status_code < 300:
                    return "delivered"
                if 400 <= resp.status_code < 500 and resp.status_code not in (408, 429):
                    return "rejected"  # Client error, no retry
            except httpx.RequestError:
                pass  # Network failure, retry

    return "dlq"  # Exhausted all retries
