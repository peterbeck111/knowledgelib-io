// Input:  PHP PDO-style query patterns
// Output: Equivalent Go database/sql + sqlx patterns with proper error handling

package db

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq"
)

// Connect replaces PHP's new PDO($dsn, $user, $pass)
func Connect() (*sqlx.DB, error) {
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        return nil, fmt.Errorf("DATABASE_URL not set")
    }

    db, err := sqlx.Connect("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("connect: %w", err)
    }

    // Connection pool settings (PHP creates a new connection per request;
    // Go reuses connections via pool — a major performance advantage)
    db.SetMaxOpenConns(25)               // max concurrent connections
    db.SetMaxIdleConns(5)                // idle connections kept alive
    db.SetConnMaxLifetime(5 * time.Minute) // recycle connections

    return db, nil
}

// Transaction replaces PDO::beginTransaction() / commit() / rollback()
func Transaction(ctx context.Context, db *sqlx.DB, fn func(tx *sqlx.Tx) error) error {
    tx, err := db.BeginTxx(ctx, nil)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }

    if err := fn(tx); err != nil {
        if rbErr := tx.Rollback(); rbErr != nil {
            log.Printf("rollback failed: %v (original error: %v)", rbErr, err)
        }
        return err
    }
    return tx.Commit()
}

// Example: Transfer money between accounts (replaces PDO transaction)
func TransferFunds(ctx context.Context, db *sqlx.DB, fromID, toID int64, amount float64) error {
    return Transaction(ctx, db, func(tx *sqlx.Tx) error {
        // Debit sender
        result, err := tx.ExecContext(ctx,
            "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1",
            amount, fromID)
        if err != nil {
            return fmt.Errorf("debit: %w", err)
        }
        rows, _ := result.RowsAffected()
        if rows == 0 {
            return fmt.Errorf("insufficient funds or account not found")
        }

        // Credit receiver
        _, err = tx.ExecContext(ctx,
            "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
            amount, toID)
        if err != nil {
            return fmt.Errorf("credit: %w", err)
        }

        return nil
    })
}
