# Input:  HTTP requests to /api/v1/users or /api/v2/users
# Output: Version-appropriate JSON responses

from fastapi import FastAPI, APIRouter

app = FastAPI()
v1 = APIRouter(prefix="/api/v1", tags=["v1"])
v2 = APIRouter(prefix="/api/v2", tags=["v2"])

@v1.get("/users")
async def get_users_v1():
    users = await fetch_users()
    return users  # flat list

@v2.get("/users")
async def get_users_v2():
    users = await fetch_users()
    return {"data": users, "meta": {"total": len(users)}}

app.include_router(v1)
app.include_router(v2)

# Deprecation middleware for v1
from starlette.middleware.base import BaseHTTPMiddleware

class DeprecationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/v1"):
            response.headers["Deprecation"] = "true"
            response.headers["Sunset"] = "Sat, 31 Dec 2026 23:59:59 GMT"
        return response

app.add_middleware(DeprecationMiddleware)
