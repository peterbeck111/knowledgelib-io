// Input:  HTTP request to /events?metric=requests_per_second
// Output: Server-Sent Events stream with real-time metric updates

package main

import (
    "fmt"
    "net/http"
    "time"
)

func sseHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    flusher, _ := w.(http.Flusher)

    metric := r.URL.Query().Get("metric")
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            value := queryLatestMetric(metric) // your DB query
            fmt.Fprintf(w, "data: {\"metric\":\"%s\",\"value\":%.2f,\"ts\":\"%s\"}\n\n",
                metric, value, time.Now().Format(time.RFC3339))
            flusher.Flush()
        case <-r.Context().Done():
            return
        }
    }
}

func main() {
    http.HandleFunc("/events", sseHandler)
    http.ListenAndServe(":8081", nil)
}
