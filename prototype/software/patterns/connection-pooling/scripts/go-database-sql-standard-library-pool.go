// Input:  PostgreSQL DSN
// Output: Managed connection pool with bounded connections

import (
    "database/sql"
    "time"
    _ "github.com/lib/pq"
)

db, err := sql.Open("postgres", "postgres://user:pass@host:5432/dbname?sslmode=require")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// Configure pool limits (Go defaults are unbounded -- always set these)
db.SetMaxOpenConns(10)                  // Max simultaneous connections
db.SetMaxIdleConns(5)                   // Keep 5 idle connections ready
db.SetConnMaxLifetime(30 * time.Minute) // Recycle connections
db.SetConnMaxIdleTime(5 * time.Minute)  // Close idle connections after 5min

// Verify connectivity
if err := db.Ping(); err != nil {
    log.Fatal(err)
}

// Queries automatically acquire and release connections
rows, err := db.QueryContext(ctx, "SELECT id, name FROM users WHERE active = $1", true)
if err != nil {
    return err
}
defer rows.Close()  // CRITICAL: always close rows to release connection
