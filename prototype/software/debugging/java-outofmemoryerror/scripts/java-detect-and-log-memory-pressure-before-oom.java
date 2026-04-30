// Input:  Running JVM with MemoryMXBean
// Output: Early warning logs when heap usage exceeds threshold

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class MemoryMonitor {
    private static final double WARN_THRESHOLD = 0.80; // 80% heap used
    private static final double CRITICAL_THRESHOLD = 0.90;

    public static void startMonitoring() {
        MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
        Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "memory-monitor");
            t.setDaemon(true);
            return t;
        }).scheduleAtFixedRate(() -> {
            MemoryUsage heap = memBean.getHeapMemoryUsage();
            double usedPct = (double) heap.getUsed() / heap.getMax();
            if (usedPct > CRITICAL_THRESHOLD) {
                System.err.printf("CRITICAL: Heap %.1f%% used (%dMB / %dMB)%n",
                    usedPct * 100, heap.getUsed() >> 20, heap.getMax() >> 20);
            } else if (usedPct > WARN_THRESHOLD) {
                System.err.printf("WARNING: Heap %.1f%% used (%dMB / %dMB)%n",
                    usedPct * 100, heap.getUsed() >> 20, heap.getMax() >> 20);
            }
        }, 0, 10, TimeUnit.SECONDS);
    }
}
