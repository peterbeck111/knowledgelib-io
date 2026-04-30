# Input:  Want to detect N+1 queries in development without debug toolbar
# Output: Middleware that logs warning when too many queries run

import logging
from django.db import connection, reset_queries
from django.conf import settings

logger = logging.getLogger('queries')

class QueryCountMiddleware:
    THRESHOLD = 10  # Warn if more than 10 queries per request

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.DEBUG:
            return self.get_response(request)

        reset_queries()
        response = self.get_response(request)
        query_count = len(connection.queries)
        total_time = sum(float(q['time']) for q in connection.queries)

        if query_count > self.THRESHOLD:
            logger.warning(
                f"⚠️ {request.method} {request.path}: "
                f"{query_count} queries ({total_time:.3f}s)"
            )
            # Find duplicate queries (N+1 signature)
            seen = {}
            for q in connection.queries:
                # Normalize query (remove specific IDs)
                normalized = q['sql'][:100]
                seen[normalized] = seen.get(normalized, 0) + 1
            dupes = {k: v for k, v in seen.items() if v > 1}
            if dupes:
                logger.warning(f"  Duplicate queries: {dupes}")

        return response
