// Input:  Callable<T> that may throw retryable exceptions
// Output: Result of successful call, or throws after max attempts

import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

public class RetryWithBackoff {
    private static final Set<Integer> RETRYABLE = Set.of(429, 500, 502, 503, 504);

    public static <T> T execute(
            RetryableCall<T> fn, int maxAttempts, long baseMs, long capMs
    ) throws Exception {
        Exception lastException = null;
        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return fn.call();
            } catch (RetryableException e) {
                lastException = e;
                if (!RETRYABLE.contains(e.getStatusCode())
                        || attempt == maxAttempts - 1) {
                    throw e;
                }
                // Full jitter
                long expDelay = Math.min(capMs, baseMs * (1L << attempt));
                long delay = ThreadLocalRandom.current().nextLong(0, expDelay + 1);
                Thread.sleep(delay);
            }
        }
        throw lastException;
    }

    @FunctionalInterface
    public interface RetryableCall<T> {
        T call() throws Exception;
    }
}
