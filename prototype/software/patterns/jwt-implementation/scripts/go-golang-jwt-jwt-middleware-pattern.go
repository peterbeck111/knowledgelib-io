// Input:  HTTP request with Authorization header
// Output: Validated claims or 401 error

// go get github.com/golang-jwt/jwt/v5
package auth

import (
    "crypto/rsa"
    "fmt"
    "net/http"
    "strings"
    "github.com/golang-jwt/jwt/v5"
)

func JWTMiddleware(publicKey *rsa.PublicKey) func(http.Handler) http.Handler {
    parser := jwt.NewParser(
        jwt.WithValidMethods([]string{"RS256"}), // Hard-code algorithm
        jwt.WithIssuer("https://api.example.com"),
        jwt.WithAudience("https://app.example.com"),
        jwt.WithExpirationRequired(),
    )
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            auth := r.Header.Get("Authorization")
            if !strings.HasPrefix(auth, "Bearer ") {
                http.Error(w, "missing token", http.StatusUnauthorized)
                return
            }
            token, err := parser.Parse(auth[7:], func(t *jwt.Token) (interface{}, error) {
                if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
                    return nil, fmt.Errorf("unexpected method: %v", t.Header["alg"])
                }
                return publicKey, nil
            })
            if err != nil || !token.Valid {
                http.Error(w, "invalid token", http.StatusUnauthorized)
                return
            }
            // token.Claims contains validated claims
            next.ServeHTTP(w, r)
        })
    }
}
