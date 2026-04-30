// Input:  List of URLs to fetch concurrently
// Output: Collected results via channel

package main

import (
    "fmt"
    "net/http"
    "sync"
)

func fetchURL(url string, ch chan<- string, wg *sync.WaitGroup) {
    defer wg.Done()
    resp, err := http.Get(url)
    if err != nil {
        ch <- fmt.Sprintf("error: %v", err)
        return
    }
    defer resp.Body.Close()
    ch <- fmt.Sprintf("%s: %d", url, resp.StatusCode)
}

func main() {
    urls := []string{"https://go.dev", "https://pkg.go.dev", "https://play.golang.org"}
    ch := make(chan string, len(urls))
    var wg sync.WaitGroup
    for _, url := range urls {
        wg.Add(1)
        go fetchURL(url, ch, &wg)
    }
    go func() { wg.Wait(); close(ch) }()
    for result := range ch {
        fmt.Println(result)
    }
}
