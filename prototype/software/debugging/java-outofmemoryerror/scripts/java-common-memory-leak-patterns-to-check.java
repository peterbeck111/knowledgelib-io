// Input:  Code review checklist for OOM prevention
// Output: Fixed patterns that prevent memory leaks

// PATTERN 1: Unbounded cache — use bounded Caffeine/Guava cache
// BAD:  static Map<String, Object> cache = new HashMap<>();
// GOOD:
import com.github.benmanes.caffeine.cache.Caffeine;
var cache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(java.time.Duration.ofHours(1))
    .build();

// PATTERN 2: Unclosed resources — use try-with-resources
// BAD:  InputStream is = new FileInputStream(f); // never closed
// GOOD:
try (var is = new java.io.FileInputStream(file)) {
    // process stream
} // auto-closed, even on exception

// PATTERN 3: Large collections — process in batches
// BAD:  List<Record> all = repo.findAll(); // loads millions into heap
// GOOD:
int page = 0;
List<Record> batch;
do {
    batch = repo.findByPage(page++, 1000);
    processBatch(batch);
    batch = null; // help GC
} while (batch != null && !batch.isEmpty());

// PATTERN 4: Event listeners — deregister when done
// BAD:  eventBus.register(listener); // never unregistered
// GOOD:
var registration = eventBus.register(listener);
// On shutdown:
registration.unregister();
