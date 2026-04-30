# Input:  author_id (int), post_id (int), follower_ids (list[int])
# Output: None (side effect: updates Redis timelines)

import redis

r = redis.Redis(host="redis-cluster", port=6379, decode_responses=True)
MAX_TIMELINE_SIZE = 800
TIMELINE_TTL_SECONDS = 7 * 24 * 3600  # 7 days

def fan_out_to_timelines(author_id: int, post_id: int, follower_ids: list[int]):
    """Push post_id to each follower's Redis timeline list."""
    pipe = r.pipeline(transaction=False)  # non-transactional for throughput
    for fid in follower_ids:
        key = f"user:{fid}:timeline"
        pipe.lpush(key, post_id)
        pipe.ltrim(key, 0, MAX_TIMELINE_SIZE - 1)
        pipe.expire(key, TIMELINE_TTL_SECONDS)
    pipe.execute()

def rebuild_timeline(user_id: int) -> list[int]:
    """Rebuild timeline from DB for inactive users returning to the app."""
    followees = db.execute(
        "SELECT followee_id FROM follows WHERE follower_id = %s", (user_id,)
    )
    post_ids = db.execute(
        "SELECT post_id FROM posts WHERE author_id = ANY(%s) "
        "ORDER BY created_at DESC LIMIT %s",
        ([f["followee_id"] for f in followees], MAX_TIMELINE_SIZE),
    )
    key = f"user:{user_id}:timeline"
    if post_ids:
        r.delete(key)
        r.rpush(key, *[str(p["post_id"]) for p in post_ids])
        r.expire(key, TIMELINE_TTL_SECONDS)
    return [p["post_id"] for p in post_ids]
