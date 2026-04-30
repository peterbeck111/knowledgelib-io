# Monitor process memory (Linux)
watch -n 1 "ps -p PID -o rss,vsz,pid,comm"

# Detailed memory map (Linux)
pmap -x PID | tail -5

# Python: check current memory usage
python -c "
import tracemalloc, gc
tracemalloc.start()
gc.collect()
snap = tracemalloc.take_snapshot()
for stat in snap.statistics('filename')[:10]:
    print(stat)
"

# Python: check for uncollectable objects
python -c "import gc; gc.set_debug(gc.DEBUG_SAVEALL); gc.collect(); print(f'Garbage: {len(gc.garbage)} objects')"

# Install profiling tools
pip install objgraph psutil memory-profiler memray

# memray: profile a script
python -m memray run -o output.bin script.py
python -m memray flamegraph output.bin

# memory_profiler: line-by-line
# Add @profile decorator to functions, then:
python -m memory_profiler script.py

# objgraph: interactive in Python REPL
python -c "import objgraph; objgraph.show_most_common_types(limit=20)"

# Check gc stats
python -c "import gc; print(gc.get_stats())"
