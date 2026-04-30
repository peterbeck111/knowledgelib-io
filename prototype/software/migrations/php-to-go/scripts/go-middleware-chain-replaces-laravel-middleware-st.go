// Input:  HTTP request requiring rate limiting, auth, and request logging
// Output: Gin middleware chain equivalent to Laravel's middleware groups

package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

// RateLimiter replaces Laravel's ThrottleRequests middleware
type RateLimiter struct {
    mu       sync.Mutex
    visitors map[string]*visitor
    limit    int
    window   time.Duration
}

type visitor struct {
    count    int
    lastSeen time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    rl := &RateLimiter{
        visitors: make(map[string]*visitor),
        limit:    limit,
        window:   window,
    }
    // Clean up stale entries every minute
    go func() {
        for range time.Tick(time.Minute) {
            rl.mu.Lock()
            for ip, v := range rl.visitors {
                if time.Since(v.lastSeen) > rl.window {
                    delete(rl.visitors, ip)
                }
            }
            rl.mu.Unlock()
        }
    }()
    return rl
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        rl.mu.Lock()
        v, exists := rl.visitors[ip]
        if !exists {
            rl.visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
            rl.mu.Unlock()
            c.Next()
            return
        }
        if time.Since(v.lastSeen) > rl.window {
            v.count = 1
            v.lastSeen = time.Now()
            rl.mu.Unlock()
            c.Next()
            return
        }
        v.count++
        v.lastSeen = time.Now()
        if v.count > rl.limit {
            rl.mu.Unlock()
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "rate limit exceeded",
            })
            return
        }
        rl.mu.Unlock()
        c.Next()
    }
}

// SetupMiddleware replaces Laravel's Kernel::$middlewareGroups
func SetupMiddleware(r *gin.Engine, jwtSecret string) {
    // Global middleware (applied to all routes)
    r.Use(Logger())
    r.Use(CORS())
    r.Use(gin.Recovery())  // replaces Laravel's exception handler

    // Rate-limited API group
    rl := NewRateLimiter(60, time.Minute)  // 60 req/min like Laravel throttle:60,1
    api := r.Group("/api/v2")
    api.Use(rl.Middleware())
    api.Use(JWTAuth(jwtSecret))

    // Public routes (no auth)
    public := r.Group("/api/v2/public")
    public.Use(rl.Middleware())
}
