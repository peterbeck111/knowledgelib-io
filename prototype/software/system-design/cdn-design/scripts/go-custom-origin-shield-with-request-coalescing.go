// Input:  Concurrent requests for the same cache key
// Output: Single origin fetch, result shared across all waiters

package main

import (
    "context"
    "fmt"
    "net/http"
    "time"

    "golang.org/x/sync/singleflight" // golang.org/x/sync v0.6.0
)

var group singleflight.Group

func originShieldHandler(w http.ResponseWriter, r *http.Request) {
    cacheKey := r.URL.Path

    // singleflight deduplicates concurrent requests for the same key
    // Only one goroutine fetches from origin; others wait and share the result
    result, err, shared := group.Do(cacheKey, func() (interface{}, error) {
        ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
        defer cancel()

        req, _ := http.NewRequestWithContext(ctx, "GET", "http://origin:8080"+r.URL.RequestURI(), nil)
        resp, err := http.DefaultClient.Do(req)
        if err != nil {
            return nil, fmt.Errorf("origin fetch failed: %w", err)
        }
        defer resp.Body.Close()

        // Read and return body (simplified; production code should handle large bodies)
        body := make([]byte, 0, 4096)
        buf := make([]byte, 1024)
        for {
            n, readErr := resp.Body.Read(buf)
            body = append(body, buf[:n]...)
            if readErr != nil {
                break
            }
        }
        return body, nil
    })

    if err != nil {
        http.Error(w, "Origin unavailable", http.StatusBadGateway)
        return
    }

    if shared {
        w.Header().Set("X-Coalesced", "true") // Indicate this was a shared response
    }
    w.Header().Set("Cache-Control", "public, max-age=60")
    w.Write(result.([]byte))
}
