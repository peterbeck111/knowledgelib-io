// Input:  clientID string, scopes []string
// Output: ApiKey struct with RawKey, Prefix, KeyHash

package apikeys

import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
)

type ApiKey struct {
    RawKey  string
    Prefix  string
    KeyHash string
}

func GenerateApiKey(keyType, env string) (*ApiKey, error) {
    payload := make([]byte, 32) // 256-bit entropy
    if _, err := rand.Read(payload); err != nil {
        return nil, fmt.Errorf("CSPRNG failed: %w", err)
    }
    rawKey := fmt.Sprintf("%s_%s_%s", keyType, env, hex.EncodeToString(payload))
    hash := sha256.Sum256([]byte(rawKey))
    return &ApiKey{
        RawKey:  rawKey,
        Prefix:  rawKey[:12],
        KeyHash: hex.EncodeToString(hash[:]),
    }, nil
}
