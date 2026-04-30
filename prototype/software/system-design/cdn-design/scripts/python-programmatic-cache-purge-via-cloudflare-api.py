# Input:  List of URLs or cache tags to purge
# Output: Purge confirmation from Cloudflare API

import httpx  # httpx==0.27.0

CLOUDFLARE_API = "https://api.cloudflare.com/client/v4"
ZONE_ID = "your-zone-id"
API_TOKEN = "your-api-token"  # Requires Cache Purge permission

async def purge_by_tags(tags: list[str]) -> dict:
    """Purge cached content by surrogate/cache tags (Enterprise)."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CLOUDFLARE_API}/zones/{ZONE_ID}/purge_cache",
            headers={"Authorization": f"Bearer {API_TOKEN}"},
            json={"tags": tags},  # Up to 30 tags per request
        )
        resp.raise_for_status()
        return resp.json()

async def purge_by_urls(urls: list[str]) -> dict:
    """Purge specific URLs from cache (all plans)."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CLOUDFLARE_API}/zones/{ZONE_ID}/purge_cache",
            headers={"Authorization": f"Bearer {API_TOKEN}"},
            json={"files": urls},  # Up to 30 URLs per request
        )
        resp.raise_for_status()
        return resp.json()
