// Input:  Any function that calls a remote service
// Output: Result or error (ErrCircuitOpen when tripped)
package circuitbreaker

import (
    "errors"
    "sync"
    "time"
)

var ErrCircuitOpen = errors.New("circuit breaker is open")

type State int
const (
    Closed   State = iota
    Open
    HalfOpen
)

type CircuitBreaker struct {
    mu               sync.Mutex
    state            State
    failureCount     int
    successCount     int
    failureThreshold int
    successThreshold int
    resetTimeout     time.Duration
    lastFailure      time.Time
}

func New(failThreshold, successThreshold int, resetTimeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        state:            Closed,
        failureThreshold: failThreshold,
        successThreshold: successThreshold,
        resetTimeout:     resetTimeout,
    }
}

func (cb *CircuitBreaker) Execute(fn func() (interface{}, error)) (interface{}, error) {
    cb.mu.Lock()
    // Check if we should transition from Open -> HalfOpen
    if cb.state == Open && time.Since(cb.lastFailure) > cb.resetTimeout {
        cb.state = HalfOpen
        cb.successCount = 0
    }
    if cb.state == Open {
        cb.mu.Unlock()
        return nil, ErrCircuitOpen
    }
    cb.mu.Unlock()

    result, err := fn()

    cb.mu.Lock()
    defer cb.mu.Unlock()
    if err != nil {
        cb.failureCount++
        cb.lastFailure = time.Now()
        if cb.failureCount >= cb.failureThreshold {
            cb.state = Open
        }
        return result, err
    }
    if cb.state == HalfOpen {
        cb.successCount++
        if cb.successCount >= cb.successThreshold {
            cb.state = Closed
            cb.failureCount = 0
        }
    } else {
        cb.failureCount = 0  // reset on success in closed state
    }
    return result, nil
}
