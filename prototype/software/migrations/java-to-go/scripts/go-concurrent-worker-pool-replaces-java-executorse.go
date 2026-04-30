// Input:  Java ExecutorService with Callable tasks and Future results
// Output: Go worker pool with goroutines and channels

package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// Job represents work to be done (replaces Callable<T>)
type Job struct {
    ID      int
    Payload string
}

// Result represents completed work (replaces Future<T>)
type Result struct {
    JobID  int
    Output string
    Err    error
}

// WorkerPool processes jobs concurrently (replaces ExecutorService)
func WorkerPool(ctx context.Context, workers int, jobs <-chan Job) <-chan Result {
    results := make(chan Result, len(jobs))
    var wg sync.WaitGroup

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    results <- Result{JobID: job.ID, Err: ctx.Err()}
                    return
                default:
                    output, err := processJob(job)
                    results <- Result{JobID: job.ID, Output: output, Err: err}
                }
            }
        }(i)
    }

    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}

func processJob(j Job) (string, error) {
    time.Sleep(100 * time.Millisecond) // Simulate work
    return fmt.Sprintf("processed: %s", j.Payload), nil
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    jobs := make(chan Job, 20)
    for i := 0; i < 20; i++ {
        jobs <- Job{ID: i, Payload: fmt.Sprintf("task-%d", i)}
    }
    close(jobs)

    results := WorkerPool(ctx, 5, jobs)
    for r := range results {
        if r.Err != nil {
            fmt.Printf("Job %d failed: %v\n", r.JobID, r.Err)
        } else {
            fmt.Printf("Job %d: %s\n", r.JobID, r.Output)
        }
    }
}
