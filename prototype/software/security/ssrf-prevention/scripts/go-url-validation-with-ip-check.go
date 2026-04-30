// Input:  User-supplied URL string
// Output: *http.Response or error if URL targets private/reserved IP

package ssrf

import (
    "fmt"
    "net"
    "net/http"
    "net/url"
    "time"
)

var privateRanges = []string{
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
    "127.0.0.0/8", "169.254.0.0/16", "::1/128",
    "fc00::/7", "fe80::/10",
}

func isBlockedIP(ip net.IP) bool {
    for _, cidr := range privateRanges {
        _, network, _ := net.ParseCIDR(cidr)
        if network.Contains(ip) {
            return true
        }
    }
    return false
}

func SafeFetch(rawURL string) (*http.Response, error) {
    parsed, err := url.Parse(rawURL)
    if err != nil {
        return nil, fmt.Errorf("invalid URL: %w", err)
    }
    if parsed.Scheme != "http" && parsed.Scheme != "https" {
        return nil, fmt.Errorf("blocked scheme: %s", parsed.Scheme)
    }

    // Resolve DNS and validate IP
    ips, err := net.LookupIP(parsed.Hostname())
    if err != nil {
        return nil, fmt.Errorf("DNS lookup failed: %w", err)
    }
    for _, ip := range ips {
        if isBlockedIP(ip) {
            return nil, fmt.Errorf("blocked IP %s for host %s", ip, parsed.Hostname())
        }
    }

    client := &http.Client{
        Timeout: 10 * time.Second,
        CheckRedirect: func(req *http.Request, via []*http.Request) error {
            return http.ErrUseLastResponse // Do not follow redirects
        },
    }
    return client.Get(rawURL)
}
