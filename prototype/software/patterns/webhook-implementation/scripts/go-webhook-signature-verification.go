// Input:  HTTP POST with JSON body + HMAC signature headers
// Output: 200/202 for valid webhooks, 401 for invalid

package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "math"
    "net/http"
    "strconv"
    "time"
)

func verifySignature(secret, timestamp string, rawBody []byte, receivedSig string) bool {
    // Check timestamp freshness (5 min window)
    ts, err := strconv.ParseInt(timestamp, 10, 64)
    if err != nil || math.Abs(float64(time.Now().Unix()-ts)) > 300 {
        return false
    }
    signingInput := fmt.Sprintf("%s.%s", timestamp, string(rawBody))
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(signingInput))
    expected := hex.EncodeToString(mac.Sum(nil))
    // hmac.Equal is constant-time
    return hmac.Equal([]byte(expected), []byte(receivedSig))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    rawBody, _ := io.ReadAll(r.Body)
    sig := r.Header.Get("X-Webhook-Signature")
    ts := r.Header.Get("X-Webhook-Timestamp")

    if !verifySignature(os.Getenv("WEBHOOK_SECRET"), ts, rawBody, sig) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    // Enqueue for async processing
    w.WriteHeader(http.StatusAccepted)
    w.Write([]byte(`{"received":true}`))
}
