// Input:  HTTP request with Idempotency-Key header
// Output: Cached response on replay, fresh response on first call

package middleware

import (
    "crypto/sha256"
    "database/sql"
    "encoding/hex"
    "encoding/json"
    "io"
    "net/http"
)

func IdempotencyMiddleware(db *sql.DB) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            key := r.Header.Get("Idempotency-Key")
            if key == "" || r.Method == "GET" {
                next.ServeHTTP(w, r)
                return
            }
            body, _ := io.ReadAll(r.Body)
            hash := sha256.Sum256(body)
            hashHex := hex.EncodeToString(hash[:])

            tx, _ := db.Begin()
            var status, reqHash string
            var respCode int
            var respBody []byte

            err := tx.QueryRow(`
                INSERT INTO idempotency_keys
                  (idempotency_key, user_id, request_method,
                   request_path, request_hash, status)
                VALUES ($1, $2, $3, $4, $5, 'processing')
                ON CONFLICT (user_id, idempotency_key)
                DO UPDATE SET locked_at = now()
                RETURNING status, response_code, response_body, request_hash`,
                key, r.RemoteAddr, r.Method, r.URL.Path, hashHex,
            ).Scan(&status, &respCode, &respBody, &reqHash)

            if err != nil {
                tx.Rollback()
                http.Error(w, "Internal error", 500)
                return
            }
            tx.Commit()

            if status == "finished" {
                if reqHash != hashHex {
                    http.Error(w, "Idempotency key reused", 422)
                    return
                }
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(respCode)
                w.Write(respBody)
                return
            }
            // Proceed with handler (response capture omitted for brevity)
            next.ServeHTTP(w, r)
        })
    }
}
