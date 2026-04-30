// Input:  HTTP requests to /api/v2/products (GET, POST, PUT, DELETE)
// Output: JSON responses with proper status codes and error handling

package main

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

type Product struct {
    ID    int64   `db:"id" json:"id"`
    Name  string  `db:"name" json:"name" binding:"required"`
    Price float64 `db:"price" json:"price" binding:"required,gt=0"`
    SKU   string  `db:"sku" json:"sku" binding:"required"`
}

type ProductHandler struct {
    db *sqlx.DB
}

// Index replaces ProductController::index()
func (h *ProductHandler) Index(c *gin.Context) {
    var products []Product
    err := h.db.SelectContext(c.Request.Context(), &products,
        "SELECT id, name, price, sku FROM products ORDER BY id LIMIT 50")
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
        return
    }
    c.JSON(http.StatusOK, products)
}

// Store replaces ProductController::store()
func (h *ProductHandler) Store(c *gin.Context) {
    var input Product
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var id int64
    err := h.db.QueryRowContext(c.Request.Context(),
        "INSERT INTO products (name, price, sku) VALUES ($1, $2, $3) RETURNING id",
        input.Name, input.Price, input.SKU,
    ).Scan(&id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "insert failed"})
        return
    }

    input.ID = id
    c.JSON(http.StatusCreated, input)
}

// Show replaces ProductController::show($id)
func (h *ProductHandler) Show(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }

    var product Product
    err = h.db.GetContext(c.Request.Context(), &product,
        "SELECT id, name, price, sku FROM products WHERE id = $1", id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
        return
    }
    c.JSON(http.StatusOK, product)
}

// Destroy replaces ProductController::destroy($id)
func (h *ProductHandler) Destroy(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }

    result, err := h.db.ExecContext(c.Request.Context(),
        "DELETE FROM products WHERE id = $1", id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
        return
    }

    rows, _ := result.RowsAffected()
    if rows == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
        return
    }
    c.JSON(http.StatusNoContent, nil)
}

func registerProductRoutes(r *gin.Engine, db *sqlx.DB) {
    h := &ProductHandler{db: db}
    api := r.Group("/api/v2/products")
    {
        api.GET("", h.Index)
        api.POST("", h.Store)
        api.GET("/:id", h.Show)
        api.DELETE("/:id", h.Destroy)
    }
}
