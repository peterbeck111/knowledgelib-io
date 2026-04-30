// Input:  HTTP GET /events
// Output: text/event-stream with periodic updates

package main

import (
    "fmt"
    "net/http"
    "time"
)

func sseHandler(w http.ResponseWriter, r *http.Request) {
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")

    for {
        select {
        case <-r.Context().Done():
            return // Client disconnected
        default:
            fmt.Fprintf(w, "id:%d\nevent:update\ndata:{\"time\":\"%s\"}\n\n",
                time.Now().UnixMilli(), time.Now().Format(time.RFC3339))
            flusher.Flush()
            time.Sleep(1 * time.Second)
        }
    }
}

func main() {
    http.HandleFunc("/events", sseHandler)
    http.ListenAndServe(":3000", nil)
}
