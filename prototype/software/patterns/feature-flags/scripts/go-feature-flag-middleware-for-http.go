// Input:  Flag config map, HTTP request with user context
// Output: HTTP middleware that injects flag values into request context

package featureflags

import (
	"crypto/md5"
	"encoding/binary"
	"encoding/hex"
	"net/http"
	"context"
)

type FlagConfig struct {
	Enabled    bool              `json:"enabled"`
	Percentage int               `json:"percentage"` // 0-100
	Overrides  map[string]bool   `json:"overrides"`
}

type FlagService struct {
	flags map[string]FlagConfig
}

func (fs *FlagService) IsEnabled(flagKey, userID string) bool {
	config, ok := fs.flags[flagKey]
	if !ok || !config.Enabled {
		return false
	}
	if val, exists := config.Overrides[userID]; exists {
		return val
	}
	if config.Percentage < 100 {
		hash := md5.Sum([]byte(flagKey + ":" + userID))
		bucket := binary.BigEndian.Uint32(hash[:4]) % 100
		return int(bucket) < config.Percentage
	}
	return true
}

// Middleware injects flag evaluation into request context
func (fs *FlagService) Middleware(flagKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := r.Header.Get("X-User-ID")
			enabled := fs.IsEnabled(flagKey, userID)
			ctx := context.WithValue(r.Context(), flagKey, enabled)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// suppress unused import warning
var _ = hex.EncodeToString
