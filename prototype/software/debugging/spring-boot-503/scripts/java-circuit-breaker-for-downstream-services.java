// Input:  Downstream API that may be slow/unavailable
// Output: Graceful degradation instead of 503 cascade

@Service
public class PaymentService {
    private final RestTemplate restTemplate;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    // Resilience4j circuit breaker prevents cascade [src6]
    @CircuitBreaker(name = "payment", fallbackMethod = "paymentFallback")
    @TimeLimiter(name = "payment")
    public CompletableFuture<PaymentResult> processPayment(PaymentRequest request) {
        return CompletableFuture.supplyAsync(() ->
            restTemplate.postForObject("/api/payments", request, PaymentResult.class)
        );
    }

    private CompletableFuture<PaymentResult> paymentFallback(PaymentRequest req, Throwable t) {
        return CompletableFuture.completedFuture(
            PaymentResult.pending("Payment queued — retry in progress")
        );
    }
}

// application.yml — circuit breaker config
// resilience4j.circuitbreaker.instances.payment:
//   sliding-window-size: 10
//   failure-rate-threshold: 50
//   wait-duration-in-open-state: 30s
