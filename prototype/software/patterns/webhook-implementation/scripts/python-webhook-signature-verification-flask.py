# Input:  POST request with JSON body + HMAC signature headers
# Output: 200/202 for valid webhooks, 401 for invalid

import hmac
import hashlib
import time
from flask import Flask, request, jsonify

app = Flask(__name__)

def verify_signature(secret: str, timestamp: str, raw_body: bytes, received_sig: str) -> bool:
    # Reject stale timestamps (> 5 minutes)
    if abs(time.time() - int(timestamp)) > 300:
        return False
    signing_input = f"{timestamp}.".encode() + raw_body
    expected = hmac.new(
        secret.encode(), signing_input, hashlib.sha256
    ).hexdigest()
    # Constant-time comparison -- prevents timing attacks
    return hmac.compare_digest(expected, received_sig.removeprefix("sha256="))

@app.route("/webhooks", methods=["POST"])
def receive_webhook():
    sig = request.headers.get("X-Webhook-Signature", "")
    ts = request.headers.get("X-Webhook-Timestamp", "")
    wh_id = request.headers.get("X-Webhook-Id", "")
    raw = request.get_data()  # raw bytes -- NOT request.json

    if not verify_signature(app.config["WEBHOOK_SECRET"], ts, raw, sig):
        return jsonify({"error": "Invalid signature"}), 401

    # Enqueue for async processing
    task_queue.enqueue(process_event, wh_id, request.json)
    return jsonify({"received": True}), 202
