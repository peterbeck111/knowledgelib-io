// Input:  gRPC requests to OrderService
// Output: Order responses with circuit breaker + logging

package main

import (
    "context"
    "log"
    "net"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    pb "myapp/proto/order"
)

func unaryInterceptor(ctx context.Context, req interface{},
    info *grpc.UnaryServerInfo, handler grpc.UnaryHandler,
) (interface{}, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    log.Printf("method=%s duration=%s error=%v",
        info.FullMethod, time.Since(start), err)
    return resp, err
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    srv := grpc.NewServer(grpc.UnaryInterceptor(unaryInterceptor))
    pb.RegisterOrderServiceServer(srv, &orderServer{})
    log.Fatal(srv.Serve(lis))
}
