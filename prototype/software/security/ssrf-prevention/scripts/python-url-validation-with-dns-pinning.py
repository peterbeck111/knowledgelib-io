# Input:  User-supplied URL string
# Output: HTTP response or ValueError if URL targets private/reserved IP

import ipaddress, socket, requests
from urllib.parse import urlparse

BLOCKED_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('169.254.0.0/16'),  # link-local / cloud metadata
    ipaddress.ip_network('::1/128'),
    ipaddress.ip_network('fc00::/7'),         # IPv6 unique local
    ipaddress.ip_network('fe80::/10'),        # IPv6 link-local
]

def is_ip_blocked(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return any(ip in net for net in BLOCKED_RANGES)

def ssrf_safe_fetch(url: str, timeout: int = 10) -> requests.Response:
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValueError(f"Blocked URL scheme: {parsed.scheme}")
    if not parsed.hostname:
        raise ValueError("No hostname in URL")

    # Resolve DNS and validate IP BEFORE making the request
    for _, _, _, _, sockaddr in socket.getaddrinfo(parsed.hostname, parsed.port):
        if is_ip_blocked(sockaddr[0]):
            raise ValueError(f"Blocked IP: {sockaddr[0]}")

    return requests.get(url, timeout=timeout, allow_redirects=False)
