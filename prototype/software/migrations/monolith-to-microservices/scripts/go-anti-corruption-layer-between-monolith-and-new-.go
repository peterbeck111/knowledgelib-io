// Input:  Legacy monolith uses a different data model than the new service
// Output: ACL translates between legacy and new domain models

package acl

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Legacy model from monolith (what the old system returns)
type LegacyOrder struct {
	OrderNum    string  `json:"order_num"`
	CustID      int     `json:"cust_id"`
	TotalCents  int64   `json:"total_cents"` // price in cents
	StatusCode  int     `json:"status_code"` // 0=pending, 1=confirmed, 2=shipped
	CreatedTS   int64   `json:"created_ts"`  // unix timestamp
}

// New domain model (what our service uses)
type Order struct {
	ID          string    `json:"id"`
	CustomerID  string    `json:"customer_id"`
	TotalAmount float64   `json:"total_amount"` // price in dollars
	Status      string    `json:"status"`       // "pending", "confirmed", "shipped"
	CreatedAt   time.Time `json:"created_at"`
}

// AntiCorruptionLayer translates between legacy and new models
type AntiCorruptionLayer struct {
	monolithURL string
	client      *http.Client
}

func NewACL(monolithURL string) *AntiCorruptionLayer {
	return &AntiCorruptionLayer{
		monolithURL: monolithURL,
		client:      &http.Client{Timeout: 10 * time.Second},
	}
}

// GetOrder fetches from monolith and translates to new model
func (acl *AntiCorruptionLayer) GetOrder(ctx context.Context, orderID string) (*Order, error) {
	// Fetch from legacy system
	url := fmt.Sprintf("%s/legacy/orders/%s", acl.monolithURL, orderID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := acl.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching from monolith: %w", err)
	}
	defer resp.Body.Close()

	var legacy LegacyOrder
	if err := json.NewDecoder(resp.Body).Decode(&legacy); err != nil {
		return nil, fmt.Errorf("decoding legacy response: %w", err)
	}

	// Translate to new domain model
	return acl.translate(legacy), nil
}

func (acl *AntiCorruptionLayer) translate(legacy LegacyOrder) *Order {
	statusMap := map[int]string{0: "pending", 1: "confirmed", 2: "shipped"}
	return &Order{
		ID:          legacy.OrderNum,
		CustomerID:  fmt.Sprintf("cust-%d", legacy.CustID),
		TotalAmount: float64(legacy.TotalCents) / 100.0,
		Status:      statusMap[legacy.StatusCode],
		CreatedAt:   time.Unix(legacy.CreatedTS, 0),
	}
}
