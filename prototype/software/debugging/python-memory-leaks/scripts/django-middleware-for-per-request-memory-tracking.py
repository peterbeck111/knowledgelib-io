# Input:  Django app with memory growing across requests
# Output: Middleware that logs memory usage per request

import tracemalloc
import logging
import psutil
import os

logger = logging.getLogger('memory')

class MemoryTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_count = 0
        tracemalloc.start()

    def __call__(self, request):
        self.request_count += 1
        snapshot_before = tracemalloc.take_snapshot()
        rss_before = psutil.Process(os.getpid()).memory_info().rss

        response = self.get_response(request)

        rss_after = psutil.Process(os.getpid()).memory_info().rss
        rss_diff = (rss_after - rss_before) / 1024 / 1024

        # Log every 100th request or if growth exceeds 5 MB
        if self.request_count % 100 == 0 or rss_diff > 5:
            snapshot_after = tracemalloc.take_snapshot()
            stats = snapshot_after.compare_to(snapshot_before, 'lineno')
            top = '; '.join(str(s) for s in stats[:3])
            logger.info(
                f"[Req #{self.request_count}] {request.path} "
                f"RSS: {rss_after/1024/1024:.0f}MB "
                f"(Δ{rss_diff:+.1f}MB) Top: {top}"
            )

        return response
