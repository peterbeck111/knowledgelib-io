// Input:  Go HTTP handler, Redis connection
// Output: Secure session management

package main

import (
    "github.com/gorilla/sessions"
    "github.com/rbcervilla/redisstore/v9"
    "github.com/redis/go-redis/v9"
    "net/http"
)

func main() {
    client := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    store, _ := redisstore.NewRedisStore(context.Background(), client)
    store.Options(sessions.Options{
        HttpOnly: true,
        Secure:   true,
        SameSite: http.SameSiteLaxMode,
        MaxAge:   1800, // 30 min
        Path:     "/",
    })

    http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
        sess, _ := store.Get(r, "sid")
        // Regenerate: create new session, copy data
        sess.Options.MaxAge = -1 // expire old
        sess.Save(r, w)
        newSess, _ := store.New(r, "sid")
        newSess.Values["user_id"] = authenticatedUserID
        newSess.Save(r, w)
    })
}
