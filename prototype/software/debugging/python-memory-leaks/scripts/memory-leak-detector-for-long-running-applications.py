# Input:  Long-running service with gradually increasing memory
# Output: Automatic leak detection with periodic snapshots

import tracemalloc
import time
import threading
import logging

logger = logging.getLogger(__name__)

class MemoryLeakDetector:
    def __init__(self, interval=60, top_n=5, growth_threshold_mb=10):
        self.interval = interval
        self.top_n = top_n
        self.threshold = growth_threshold_mb * 1024 * 1024
        self._baseline = None
        self._running = False

    def start(self):
        tracemalloc.start(25)  # 25 frames deep
        self._baseline = tracemalloc.take_snapshot()
        self._running = True
        thread = threading.Thread(target=self._monitor, daemon=True)
        thread.start()
        logger.info("Memory leak detector started")

    def _monitor(self):
        while self._running:
            time.sleep(self.interval)
            snapshot = tracemalloc.take_snapshot()
            stats = snapshot.compare_to(self._baseline, 'lineno')

            total_growth = sum(s.size_diff for s in stats if s.size_diff > 0)
            if total_growth > self.threshold:
                logger.warning(
                    f"Memory grew by {total_growth / 1024 / 1024:.1f} MB "
                    f"since baseline!"
                )
                for stat in stats[:self.top_n]:
                    logger.warning(f"  {stat}")

    def stop(self):
        self._running = False
        tracemalloc.stop()

    def report(self):
        snapshot = tracemalloc.take_snapshot()
        stats = snapshot.compare_to(self._baseline, 'lineno')
        return [(str(s), s.size_diff) for s in stats[:self.top_n]]

# Usage
detector = MemoryLeakDetector(interval=30, growth_threshold_mb=50)
detector.start()
