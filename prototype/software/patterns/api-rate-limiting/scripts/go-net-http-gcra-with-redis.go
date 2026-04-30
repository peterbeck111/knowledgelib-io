// Input:  HTTP request to any Go HTTP handler
// Output: 429 if rate limited, passes to next handler if allowed
// Requires: go-redis/redis/v9

package ratelimit

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// GCRA Lua script - single timestamp (TAT) per key
var gcraScript = redis.NewScript()

type Limiter struct {
	rdb              *redis.Client
	emissionInterval float64 // seconds between allowed requests
	burst            int
	keyFn            func(*http.Request) string
}

func New(rdb *redis.Client, rate int, window, burst int,
	keyFn func(*http.Request) string) *Limiter {
	return &Limiter{
		rdb:              rdb,
		emissionInterval: float64(window) / float64(rate),
		burst:            burst,
		keyFn:            keyFn,
	}
}

func (l *Limiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.Background()
		key := fmt.Sprintf("rl:%s", l.keyFn(r))
		now := float64(time.Now().UnixMilli()) / 1000.0

		result, err := gcraScript.Run(ctx, l.rdb, []string{key},
			l.emissionInterval, l.burst, now).Int64Slice()
		if err != nil {
			next.ServeHTTP(w, r) // fail open
			return
		}

		w.Header().Set("X-RateLimit-Remaining", strconv.FormatInt(result[1], 10))
		if result[0] == 0 {
			w.Header().Set("Retry-After", strconv.FormatInt(result[2], 10))
			http.Error(w, ,
				http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Usage:
// rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
// limiter := ratelimit.New(rdb, 100, 60, 10, func(r *http.Request) string {
//     return r.Header.Get("X-API-Key")
// })
// mux.Handle("/api/", limiter.Middleware(apiHandler))
