// Input:  Raft cluster with 3+ nodes
// Output: Strongly consistent key-value store
// Deps:   go get go.etcd.io/etcd/client/v3@v3.5.17

package main

import (
    "context"
    "fmt"
    "log"
    "time"

    clientv3 "go.etcd.io/etcd/client/v3"
    "go.etcd.io/etcd/client/v3/concurrency"
)

func main() {
    // Connect to etcd cluster (Raft-backed)
    cli, err := clientv3.New(clientv3.Config{
        Endpoints:   []string{"10.0.0.1:2379", "10.0.0.2:2379", "10.0.0.3:2379"},
        DialTimeout: 5 * time.Second,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer cli.Close()

    ctx := context.Background()

    // Leader election using etcd concurrency package
    session, err := concurrency.NewSession(cli, concurrency.WithTTL(10))
    if err != nil {
        log.Fatal(err)
    }
    defer session.Close()

    election := concurrency.NewElection(session, "/leader/config-service")

    // Campaign blocks until this node is elected leader
    if err := election.Campaign(ctx, "node-1"); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Elected as leader!")

    // Leader writes configuration with linearizable consistency
    _, err = cli.Put(ctx, "/config/db-host", "db-primary.internal:5432")
    if err != nil {
        log.Fatal(err)
    }

    // Any node can read with serializable (fast) or linearizable (consistent) reads
    resp, err := cli.Get(ctx, "/config/db-host")
    if err != nil {
        log.Fatal(err)
    }
    for _, kv := range resp.Kvs {
        fmt.Printf("Key: %s, Value: %s, Revision: %d\n",
            kv.Key, kv.Value, kv.ModRevision)
    }
}
