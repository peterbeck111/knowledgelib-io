# Input:  List of endpoints and regions
# Output: Health status map with latency metrics

import dns.resolver  # dnspython==2.6.1
import requests      # requests==2.31.0
import time
from concurrent.futures import ThreadPoolExecutor

ENDPOINTS = {
    "us-east": "alb-us-east.example.com",
    "eu-west": "alb-eu-west.example.com",
    "ap-south": "alb-ap-south.example.com",
}

def check_endpoint(region: str, host: str) -> dict:
    """Check health and latency of a regional endpoint."""
    try:
        # DNS resolution time
        start = time.monotonic()
        answers = dns.resolver.resolve(host, "A")
        dns_ms = (time.monotonic() - start) * 1000

        # HTTP health check
        start = time.monotonic()
        resp = requests.get(
            f"https://{host}/health",
            timeout=5,
            headers={"Host": host}
        )
        http_ms = (time.monotonic() - start) * 1000

        return {
            "region": region,
            "host": host,
            "ips": [r.address for r in answers],
            "dns_ms": round(dns_ms, 2),
            "http_ms": round(http_ms, 2),
            "status": "healthy" if resp.status_code == 200 else "degraded",
            "http_code": resp.status_code,
        }
    except Exception as e:
        return {
            "region": region,
            "host": host,
            "status": "unhealthy",
            "error": str(e),
        }

# Check all endpoints in parallel
with ThreadPoolExecutor(max_workers=len(ENDPOINTS)) as pool:
    results = list(pool.map(
        lambda kv: check_endpoint(kv[0], kv[1]),
        ENDPOINTS.items()
    ))

for r in results:
    print(f"[{r['region']}] {r['status']} "
          f"dns={r.get('dns_ms', 'N/A')}ms "
          f"http={r.get('http_ms', 'N/A')}ms")
