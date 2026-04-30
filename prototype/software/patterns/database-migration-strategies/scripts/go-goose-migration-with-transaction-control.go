// Input:  goose migration framework configured
// Output: Adds 'status' enum column to orders table

// migrations/20260224_add_order_status.go
package migrations

import (
    "database/sql"
    "github.com/pressly/goose/v3"
)

func init() {
    goose.AddMigration(upAddOrderStatus, downAddOrderStatus)
}

func upAddOrderStatus(tx *sql.Tx) error {
    _, err := tx.Exec(`
        CREATE TYPE order_status AS ENUM ('pending','processing','shipped','delivered');
        ALTER TABLE orders ADD COLUMN status order_status DEFAULT 'pending';
    `)
    return err
}

func downAddOrderStatus(tx *sql.Tx) error {
    _, err := tx.Exec(`
        ALTER TABLE orders DROP COLUMN status;
        DROP TYPE order_status;
    `)
    return err
}
