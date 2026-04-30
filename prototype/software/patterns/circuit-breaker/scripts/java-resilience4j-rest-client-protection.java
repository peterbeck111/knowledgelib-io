// Input:  REST API call that may fail
// Output: API response or fallback
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;

import java.time.Duration;

// Configure the circuit breaker
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)                // open at 50% failure
    .slowCallRateThreshold(80)               // also open if 80% slow
    .slowCallDurationThreshold(Duration.ofSeconds(3))
    .waitDurationInOpenState(Duration.ofSeconds(30))
    .permittedNumberOfCallsInHalfOpenState(3)
    .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
    .slidingWindowSize(10)
    .minimumNumberOfCalls(5)
    .recordExceptions(IOException.class, TimeoutException.class)
    .ignoreExceptions(IllegalArgumentException.class)
    .build();

CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(config);
CircuitBreaker breaker = registry.circuitBreaker("userService");

// Decorate and execute with fallback
Supplier<UserProfile> decorated = CircuitBreaker
    .decorateSupplier(breaker, () -> userServiceClient.getProfile(userId));

Try<UserProfile> result = Try.ofSupplier(decorated)
    .recover(throwable -> new UserProfile(userId, "Unknown", true));
