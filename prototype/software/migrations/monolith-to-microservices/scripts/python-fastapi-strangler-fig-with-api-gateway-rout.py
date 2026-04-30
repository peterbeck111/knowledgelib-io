# Input:  A monolith where /api/orders is being extracted to a new service
# Output: A FastAPI gateway that routes between monolith and new services

from fastapi import FastAPI, Request
import httpx

app = FastAPI()

# Service registry — which paths go to which backend
ROUTES = {
    "/api/orders": "http://orders-service:8081",
    "/api/payments": "http://payments-service:8082",
    # Everything else falls through to monolith
}
MONOLITH_URL = "http://monolith:8080"

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy(request: Request, path: str):
    # Find the matching service for this path
    target_url = MONOLITH_URL  # default to monolith
    for prefix, service_url in ROUTES.items():
        if f"/{path}".startswith(prefix):
            target_url = service_url
            break
    
    # Forward the request
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{target_url}/{path}"
        response = await client.request(
            method=request.method,
            url=url,
            headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            content=await request.body(),
            params=request.query_params,
        )
    
    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=dict(response.headers),
    )
