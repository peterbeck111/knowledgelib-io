// Input:  GET /items?after_id=42&after_ts=2026-01-15T10:30:00Z&limit=25
// Output: JSON { "data": [...], "pagination": { "has_more": true, ... } }

package main

import (
    "database/sql"     // standard library
    "encoding/json"
    "net/http"
    "strconv"
    "time"
)

const defaultLimit = 25
const maxLimit = 100

type Item struct {
    ID        int       `json:"id"`
    Title     string    `json:"title"`
    CreatedAt time.Time `json:"created_at"`
}

func listItems(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
        if limit <= 0 { limit = defaultLimit }
        if limit > maxLimit { limit = maxLimit }

        afterID, _ := strconv.Atoi(r.URL.Query().Get("after_id"))
        afterTS := r.URL.Query().Get("after_ts")

        var rows *sql.Rows
        var err error

        if afterID > 0 && afterTS != "" {
            ts, _ := time.Parse(time.RFC3339, afterTS)
            rows, err = db.Query(
                `SELECT id, title, created_at FROM items
                 WHERE (created_at, id) < ($1, $2)
                 ORDER BY created_at DESC, id DESC LIMIT $3`,
                ts, afterID, limit+1,
            )
        } else {
            rows, err = db.Query(
                `SELECT id, title, created_at FROM items
                 ORDER BY created_at DESC, id DESC LIMIT $1`,
                limit+1,
            )
        }
        if err != nil {
            http.Error(w, err.Error(), 500)
            return
        }
        defer rows.Close()

        var items []Item
        for rows.Next() {
            var it Item
            rows.Scan(&it.ID, &it.Title, &it.CreatedAt)
            items = append(items, it)
        }

        hasMore := len(items) > limit
        if hasMore { items = items[:limit] }

        var nextID int
        var nextTS string
        if hasMore && len(items) > 0 {
            last := items[len(items)-1]
            nextID = last.ID
            nextTS = last.CreatedAt.Format(time.RFC3339)
        }

        json.NewEncoder(w).Encode(map[string]any{
            "data": items,
            "pagination": map[string]any{
                "has_more": hasMore,
                "after_id": nextID,
                "after_ts": nextTS,
                "limit":    limit,
            },
        })
    }
}
