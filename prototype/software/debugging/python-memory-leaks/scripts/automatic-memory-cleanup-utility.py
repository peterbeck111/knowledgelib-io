# Input:  Data pipeline processing large files in a loop
# Output: Context manager that ensures cleanup after each batch

import gc
import tracemalloc
import contextlib

@contextlib.contextmanager
def memory_guard(label="operation", warn_mb=100):
    """Context manager that tracks and cleans up memory."""
    gc.collect()
    if tracemalloc.is_tracing():
        snap_before = tracemalloc.take_snapshot()

    try:
        yield
    finally:
        gc.collect()
        if tracemalloc.is_tracing():
            snap_after = tracemalloc.take_snapshot()
            stats = snap_after.compare_to(snap_before, 'filename')
            growth = sum(s.size_diff for s in stats if s.size_diff > 0)
            if growth > warn_mb * 1024 * 1024:
                print(f"⚠️ [{label}] Memory grew by {growth/1024/1024:.1f} MB")
                for s in stats[:3]:
                    print(f"  {s}")

# Usage in data pipeline
tracemalloc.start()
for batch_file in glob.glob("data/*.csv"):
    with memory_guard(f"Processing {batch_file}", warn_mb=50):
        df = pd.read_csv(batch_file)
        process(df)
        del df  # Explicit cleanup
