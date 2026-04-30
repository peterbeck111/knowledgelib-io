// Input:  HTTP requests to /api/v1/users or /api/v2/users
// Output: Version-appropriate JSON responses

package main

import (
    "encoding/json"
    "net/http"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

// v1 handler — flat array response
func usersV1(w http.ResponseWriter, r *http.Request) {
    users := []User{{ID: 1, Name: "Alice"}}
    json.NewEncoder(w).Encode(users)
}

// v2 handler — envelope response
func usersV2(w http.ResponseWriter, r *http.Request) {
    users := []User{{ID: 1, Name: "Alice"}}
    resp := map[string]interface{}{
        "data": users,
        "meta": map[string]int{"total": len(users)},
    }
    json.NewEncoder(w).Encode(resp)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/v1/users", usersV1)
    mux.HandleFunc("/api/v2/users", usersV2)
    http.ListenAndServe(":8080", mux)
}
