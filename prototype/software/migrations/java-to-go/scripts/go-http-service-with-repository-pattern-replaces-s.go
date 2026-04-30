// Input:  A Java Spring Boot @RestController + @Service + @Repository
// Output: Equivalent Go service with same API contract

package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "errors"
    "fmt"
    "log"
    "net/http"
    "strconv"
    "time"

    _ "github.com/lib/pq" // PostgreSQL driver
)

// Domain model (replaces Java POJO/Entity)
type Product struct {
    ID    int64   `json:"id" db:"id"`
    Name  string  `json:"name" db:"name"`
    Price float64 `json:"price" db:"price"`
}

// Repository interface (replaces Spring Data JpaRepository)
type ProductRepository interface {
    FindByID(ctx context.Context, id int64) (*Product, error)
    FindAll(ctx context.Context) ([]Product, error)
    Save(ctx context.Context, p *Product) error
}

// Concrete implementation (replaces @Repository class)
type pgProductRepo struct {
    db *sql.DB
}

func (r *pgProductRepo) FindByID(ctx context.Context, id int64) (*Product, error) {
    var p Product
    err := r.db.QueryRowContext(ctx,
        "SELECT id, name, price FROM products WHERE id = $1", id,
    ).Scan(&p.ID, &p.Name, &p.Price)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, nil // Not found
    }
    return &p, err
}

func (r *pgProductRepo) FindAll(ctx context.Context) ([]Product, error) {
    rows, err := r.db.QueryContext(ctx, "SELECT id, name, price FROM products")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var products []Product
    for rows.Next() {
        var p Product
        if err := rows.Scan(&p.ID, &p.Name, &p.Price); err != nil {
            return nil, err
        }
        products = append(products, p)
    }
    return products, rows.Err()
}

func (r *pgProductRepo) Save(ctx context.Context, p *Product) error {
    return r.db.QueryRowContext(ctx,
        "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id",
        p.Name, p.Price,
    ).Scan(&p.ID)
}

// HTTP handler (replaces @RestController)
type ProductHandler struct {
    repo ProductRepository
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
    product, err := h.repo.FindByID(r.Context(), id)
    if err != nil {
        http.Error(w, "internal error", 500)
        return
    }
    if product == nil {
        http.Error(w, "not found", 404)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(product)
}

func main() {
    db, err := sql.Open("postgres", "postgres://user:pass@localhost/mydb?sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    repo := &pgProductRepo{db: db}
    handler := &ProductHandler{repo: repo}

    mux := http.NewServeMux()
    mux.HandleFunc("GET /products/{id}", handler.GetProduct)

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
