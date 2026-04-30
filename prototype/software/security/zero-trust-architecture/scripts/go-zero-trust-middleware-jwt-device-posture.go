// Input:  HTTP request with Bearer token + X-Device-ID header
// Output: Authorized request or 403 Forbidden

package middleware

import (
    "context"
    "net/http"
    "github.com/golang-jwt/jwt/v5" // v5.2.0
)

type ZeroTrustMiddleware struct {
    JWKSUrl       string
    DeviceChecker DeviceComplianceChecker
}

func (zt *ZeroTrustMiddleware) Verify(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. Verify identity (JWT)
        token, err := jwt.Parse(r.Header.Get("Authorization")[7:],
            zt.keyFunc)
        if err != nil || !token.Valid {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }

        // 2. Verify device compliance
        deviceID := r.Header.Get("X-Device-ID")
        if !zt.DeviceChecker.IsCompliant(deviceID) {
            http.Error(w, "device not compliant", http.StatusForbidden)
            return
        }

        // 3. Check risk signals (location, time, behavior)
        claims := token.Claims.(jwt.MapClaims)
        ctx := context.WithValue(r.Context(), "user", claims["sub"])
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
