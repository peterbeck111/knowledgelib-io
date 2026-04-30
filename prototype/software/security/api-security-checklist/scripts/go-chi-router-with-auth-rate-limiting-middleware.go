// Input:  HTTP request to Go API
// Output: Secured response with middleware chain

package main

import (
    "net/http"
    "os"
    "time"

    "github.com/go-chi/chi/v5"           // v5.1.0
    "github.com/go-chi/chi/v5/middleware"
    "github.com/go-chi/httprate"          // v0.9.0
    "github.com/go-chi/jwtauth/v5"       // v5.3.0
)

var tokenAuth = jwtauth.New("HS256",
    []byte(os.Getenv("JWT_SECRET")), nil)

func main() {
    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(securityHeaders)
    // Global: 100 req/min per IP
    r.Use(httprate.LimitByIP(100, time.Minute))
    // Protected routes
    r.Group(func(r chi.Router) {
        r.Use(jwtauth.Verifier(tokenAuth))
        r.Use(jwtauth.Authenticator(tokenAuth))
        r.Get("/api/orders", listOrders)
    })
    http.ListenAndServeTLS(":443", "cert.pem", "key.pem", r)
}

func securityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("Strict-Transport-Security", "max-age=31536000")
        w.Header().Set("Cache-Control", "no-store")
        next.ServeHTTP(w, r)
    })
}
