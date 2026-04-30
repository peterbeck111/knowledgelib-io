#!/usr/bin/env python3
"""
Input:  URL to check
Output: SSL certificate info + connection status
"""
import ssl
import socket
import datetime
import urllib.request
from urllib.error import URLError

def check_ssl_cert(hostname: str, port: int = 443) -> dict:
    """Retrieve and analyze SSL certificate for a host."""
    context = ssl.create_default_context()
    
    try:
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                tls_version = ssock.version()
    except ssl.SSLCertVerificationError as e:
        return {"error": f"Certificate verification failed: {e}", "hostname": hostname}
    except ssl.SSLError as e:
        return {"error": f"SSL error: {e}", "hostname": hostname}
    except ConnectionRefusedError:
        return {"error": "Connection refused", "hostname": hostname}
    
    # Parse expiry
    not_after_str = cert.get("notAfter", "")
    not_after = datetime.datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
    days_left = (not_after - datetime.datetime.utcnow()).days
    
    # Extract SANs
    sans = [v for t, v in cert.get("subjectAltName", []) if t == "DNS"]
    
    # Check hostname match
    try:
        ssl.match_hostname(cert, hostname)
        hostname_match = True
    except ssl.CertificateError:
        hostname_match = False
    
    return {
        "hostname": hostname,
        "subject": dict(x[0] for x in cert.get("subject", [])),
        "issuer": dict(x[0] for x in cert.get("issuer", [])),
        "not_after": not_after.isoformat(),
        "days_until_expiry": days_left,
        "sans": sans,
        "hostname_match": hostname_match,
        "tls_version": tls_version,
        "cipher": cipher[0] if cipher else None,
        "status": "ok" if days_left > 0 and hostname_match else "error",
    }

def monitor_certs(hostnames: list[str]) -> None:
    """Monitor multiple hosts and alert on issues."""
    for host in hostnames:
        result = check_ssl_cert(host)
        if "error" in result:
            print(f"❌ {host}: {result['error']}")
            continue
        
        days = result["days_until_expiry"]
        if days < 0:
            print(f"❌ {host}: EXPIRED {abs(days)} days ago!")
        elif days < 14:
            print(f"🔴 {host}: CRITICAL — expires in {days} days")
        elif days < 30:
            print(f"🟡 {host}: WARNING — expires in {days} days")
        else:
            print(f"✅ {host}: OK — {days} days left, TLS {result['tls_version']}")
        
        if not result["hostname_match"]:
            print(f"   ⚠️  Hostname mismatch! SANs: {result['sans']}")

if __name__ == "__main__":
    hosts = ["example.com", "api.example.com", "internal.example.com"]
    monitor_certs(hosts)
