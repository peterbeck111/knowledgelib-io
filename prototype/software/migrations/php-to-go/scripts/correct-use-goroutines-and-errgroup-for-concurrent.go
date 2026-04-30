// ✅ GOOD — concurrent fetches (Go's killer feature)
import "golang.org/x/sync/errgroup"

func handler(c *gin.Context) {
    var users []User
    var orders []Order
    var stats Stats

    g, ctx := errgroup.WithContext(c.Request.Context())

    g.Go(func() error {
        var err error
        users, err = fetchUsers(ctx)
        return err
    })
    g.Go(func() error {
        var err error
        orders, err = fetchOrders(ctx)
        return err
    })
    g.Go(func() error {
        var err error
        stats, err = fetchStats(ctx)
        return err
    })

    if err := g.Wait(); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    // Total: ~300ms (slowest fetch), not 650ms
    c.JSON(200, gin.H{"users": users, "orders": orders, "stats": stats})
}
