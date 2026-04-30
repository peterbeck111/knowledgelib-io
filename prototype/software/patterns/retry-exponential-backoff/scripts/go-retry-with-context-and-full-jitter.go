// Input:  Context, retryable function
// Output: Result of successful call, or error after max attempts

package retry

import (
    "context"
    "math"
    "math/rand"
    "time"
    "fmt"
)

type Config struct {
    MaxAttempts int
    BaseDelay   time.Duration
    MaxDelay    time.Duration
}

func Do(ctx context.Context, cfg Config, fn func() error) error {
    var lastErr error
    for attempt := 0; attempt < cfg.MaxAttempts; attempt++ {
        lastErr = fn()
        if lastErr == nil {
            return nil
        }
        if attempt == cfg.MaxAttempts-1 {
            break
        }
        // Full jitter
        expDelay := math.Min(
            float64(cfg.MaxDelay),
            float64(cfg.BaseDelay)*math.Pow(2, float64(attempt)),
        )
        delay := time.Duration(rand.Float64() * expDelay)

        select {
        case <-ctx.Done():
            return fmt.Errorf("retry cancelled: %w", ctx.Err())
        case <-time.After(delay):
        }
    }
    return fmt.Errorf("all %d attempts failed: %w", cfg.MaxAttempts, lastErr)
}
