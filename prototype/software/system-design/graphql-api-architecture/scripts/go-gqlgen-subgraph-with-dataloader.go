// resolvers/product.go — gqlgen resolver with dataloaden
// Input:  GraphQL product queries
// Output: Batched database responses

package resolvers

import (
    "context"
    "github.com/graph-gophers/dataloader/v7"  // dataloader/v7
)

func (r *queryResolver) Product(ctx context.Context, id string) (*Product, error) {
    // DataLoader batches all Product loads in this request
    thunk := r.Loaders.ProductLoader.Load(ctx, dataloader.StringKey(id))
    result, err := thunk()
    if err != nil {
        return nil, err
    }
    return result.(*Product), nil
}

// Batch function — called once with all accumulated keys
func productBatchFn(ctx context.Context, keys dataloader.Keys) []*dataloader.Result {
    ids := make([]string, len(keys))
    for i, k := range keys { ids[i] = k.String() }
    products, _ := db.GetProductsByIDs(ctx, ids)
    // Map results back in order
    results := make([]*dataloader.Result, len(keys))
    m := make(map[string]*Product)
    for _, p := range products { m[p.ID] = p }
    for i, id := range ids {
        results[i] = &dataloader.Result{Data: m[id]}
    }
    return results
}
