// Input:  Multiple concurrent tasks where any failure should cancel the rest
// Output: First error encountered, all goroutines cleaned up

package main

import (
    "context"
    "fmt"
    "net/http"

    "golang.org/x/sync/errgroup"
)

func fetchAll(ctx context.Context, urls []string) error {
    g, ctx := errgroup.WithContext(ctx)

    for _, url := range urls {
        g.Go(func() error {
            req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
            if err != nil {
                return err
            }
            resp, err := http.DefaultClient.Do(req)
            if err != nil {
                return err // cancels ctx, other goroutines see ctx.Done()
            }
            defer resp.Body.Close()
            if resp.StatusCode != 200 {
                return fmt.Errorf("%s returned %d", url, resp.StatusCode)
            }
            return nil
        })
    }

    return g.Wait() // blocks until all goroutines finish; returns first error
}
