// Input:  Stream of jobs
// Output: Processed results with bounded goroutine count

package main

import (
    "context"
    "fmt"
    "sync"
)

func workerPool(ctx context.Context, jobs <-chan int, numWorkers int) <-chan string {
    results := make(chan string, numWorkers)

    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for {
                select {
                case job, ok := <-jobs:
                    if !ok {
                        return // jobs channel closed — worker exits
                    }
                    results <- fmt.Sprintf("worker %d processed job %d", id, job)
                case <-ctx.Done():
                    return // context cancelled — worker exits
                }
            }
        }(i)
    }

    // Close results channel when all workers finish
    go func() {
        wg.Wait()
        close(results)
    }()

    return results
}
