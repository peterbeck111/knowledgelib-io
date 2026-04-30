// Input:  Database rows fetched via cursor pagination
// Output: Processed results, errors sent to DLQ channel

package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

const (
    chunkSize  = 500
    numWorkers = 8
    maxRetries = 3
)

func processBatch(ctx context.Context, db *sql.DB, jobID string) (int, int) {
    items := make(chan Item, chunkSize)
    dlq := make(chan DLQEntry, 100)
    var wg sync.WaitGroup
    var processed, failed int64

    // Fan-out: start worker pool
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for item := range items {
                if err := processWithRetry(ctx, db, item, maxRetries); err != nil {
                    dlq <- DLQEntry{JobID: jobID, Item: item, Err: err}
                    atomic.AddInt64(&failed, 1)
                }
                atomic.AddInt64(&processed, 1)
            }
        }()
    }

    // Producer: cursor-based chunk reads
    go func() {
        defer close(items)
        cursor := getCheckpoint(db, jobID)
        for {
            chunk := fetchChunk(db, cursor, chunkSize)
            if len(chunk) == 0 { break }
            for _, item := range chunk {
                items <- item
            }
            cursor = chunk[len(chunk)-1].ID
            saveCheckpoint(db, jobID, cursor, len(chunk))
        }
    }()

    // Fan-in: collect DLQ entries
    go func() { for entry := range dlq { writeDLQ(db, entry) } }()

    wg.Wait()
    close(dlq)
    return int(processed), int(failed)
}

func processWithRetry(ctx context.Context, db *sql.DB, item Item, maxRetries int) error {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        if err := processItem(ctx, db, item); err != nil {
            lastErr = err
            time.Sleep(time.Duration(1<<uint(i)) * time.Second)
            continue
        }
        return nil
    }
    return fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
}
