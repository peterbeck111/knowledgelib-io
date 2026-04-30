# Input:  GET /items?cursor=eyJpZCI6NDJ9&limit=25
# Output: { "data": [...], "pagination": { "has_more": true, "next_cursor": "...", "limit": 25 } }

import base64, json
from fastapi import FastAPI, Query  # fastapi>=0.109
from sqlalchemy import select, and_  # sqlalchemy>=2.0
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()
MAX_LIMIT = 100
DEFAULT_LIMIT = 25

def encode_cursor(row) -> str:
    payload = json.dumps({"id": row.id, "created_at": row.created_at.isoformat()})
    return base64.urlsafe_b64encode(payload.encode()).decode()

def decode_cursor(cursor: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())

@app.get("/items")
async def list_items(
    cursor: str | None = Query(None),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Item).order_by(Item.created_at.desc(), Item.id.desc())

    if cursor:
        decoded = decode_cursor(cursor)
        stmt = stmt.where(
            and_(
                Item.created_at <= decoded["created_at"],
                ~and_(Item.created_at == decoded["created_at"], Item.id >= decoded["id"])
            )
        )

    stmt = stmt.limit(limit + 1)  # Fetch one extra to detect has_more
    result = await db.execute(stmt)
    rows = result.scalars().all()

    has_more = len(rows) > limit
    data = rows[:limit] if has_more else rows
    next_cursor = encode_cursor(data[-1]) if has_more and data else None

    return {
        "data": [item.to_dict() for item in data],
        "pagination": {"has_more": has_more, "next_cursor": next_cursor, "limit": limit},
    }
