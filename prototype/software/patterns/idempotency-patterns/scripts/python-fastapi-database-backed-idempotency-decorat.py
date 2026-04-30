# Input:  FastAPI request with Idempotency-Key header
# Output: Cached response on retry, fresh response on first call

import hashlib, json
from functools import wraps
from fastapi import Request, HTTPException
from sqlalchemy import text        # SQLAlchemy ^2.0

def idempotent(func):
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        key = request.headers.get("Idempotency-Key")
        if not key:
            return await func(request, *args, **kwargs)

        body = await request.body()
        req_hash = hashlib.sha256(body).hexdigest()
        user_id = getattr(request.state, "user_id", request.client.host)

        async with db.begin() as conn:
            result = await conn.execute(text("""
                INSERT INTO idempotency_keys
                    (idempotency_key, user_id, request_method,
                     request_path, request_hash, status)
                VALUES (:key, :uid, :method, :path, :hash, 'processing')
                ON CONFLICT (user_id, idempotency_key)
                DO UPDATE SET locked_at = now()
                RETURNING status, response_code, response_body, request_hash
            """), {"key": key, "uid": user_id, "method": request.method,
                   "path": request.url.path, "hash": req_hash})
            row = result.fetchone()

        if row.status == "finished":
            if row.request_hash != req_hash:
                raise HTTPException(422, "Idempotency key reused with different params")
            return json.loads(row.response_body)

        response = await func(request, *args, **kwargs)

        async with db.begin() as conn:
            await conn.execute(text("""
                UPDATE idempotency_keys
                SET status='finished', response_code=:code, response_body=:body
                WHERE user_id=:uid AND idempotency_key=:key
            """), {"code": 200, "body": json.dumps(response),
                   "uid": user_id, "key": key})
        return response
    return wrapper
