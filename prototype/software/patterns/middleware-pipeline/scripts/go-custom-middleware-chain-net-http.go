// Input:  http.Handler (the next handler in the chain)
// Output: http.Handler (wrapped handler with added behavior)

package main

import (
    "context"
    "log"
    "net/http"
    "time"
)

type ctxKey string

// Logging middleware
func withLogging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

// Auth middleware -- short-circuits on failure
func withAuth(apiKey string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if r.Header.Get("X-API-Key") != apiKey {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return // short-circuit: next.ServeHTTP is NOT called
            }
            ctx := context.WithValue(r.Context(), ctxKey("user"), "authenticated")
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// Chain composes middleware: Chain(h, m1, m2) == m1(m2(h))
func Chain(h http.Handler, middleware ...func(http.Handler) http.Handler) http.Handler {
    for i := len(middleware) - 1; i >= 0; i-- {
        h = middleware[i](h)
    }
    return h
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
        user := r.Context().Value(ctxKey("user")).(string)
        w.Write([]byte("Hello, " + user))
    })

    // Build pipeline: logging -> auth -> handler
    handler := Chain(mux, withLogging, withAuth("secret-key"))
    http.ListenAndServe(":8080", handler)
}
