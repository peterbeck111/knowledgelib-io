// Input:  Function that spawns a goroutine to do work with a timeout
// Output: Result or timeout error — no goroutine leak

package main

import (
    "context"
    "fmt"
    "time"
)

type Result struct {
    Data string
    Err  error
}

func fetchWithTimeout(ctx context.Context) (Result, error) {
    // IMPORTANT: buffered channel (cap 1) so sender never blocks
    ch := make(chan Result, 1)

    go func() {
        // Simulate work
        time.Sleep(2 * time.Second)
        ch <- Result{Data: "success", Err: nil}
        // Even if ctx is cancelled, this send completes into the buffer
        // and the goroutine exits cleanly.
    }()

    select {
    case res := <-ch:
        return res, res.Err
    case <-ctx.Done():
        // Goroutine will complete its send into the buffer and exit.
        // No leak because channel is buffered.
        return Result{}, ctx.Err()
    }
}
