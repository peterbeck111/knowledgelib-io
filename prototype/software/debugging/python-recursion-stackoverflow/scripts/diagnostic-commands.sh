# Check current recursion limit
python -c "import sys; print(sys.getrecursionlimit())"

# Check OS thread stack size (Linux/macOS)
ulimit -s

# Check Python frame size estimate (bytes per frame)
python -c "
import sys, threading
def depth(n):
    if n == 0: return
    depth(n - 1)
sys.setrecursionlimit(2000)
try:
    depth(1500)
    print('1500 frames OK')
except RecursionError:
    print('Hit limit before 1500')
"

# Find the safe maximum recursion depth for your system
python -c "
import sys
sys.setrecursionlimit(100000)
def probe(n):
    try:
        if n == 0: return 0
        return probe(n - 1)
    except RecursionError:
        return n
print(f'Max safe depth: ~{probe(99999)}')
"

# Check if resource module is available (Unix only)
python -c "
try:
    import resource
    soft, hard = resource.getrlimit(resource.RLIMIT_STACK)
    print(f'Stack limit: soft={soft}, hard={hard}')
except ImportError:
    print('resource module not available (Windows)')
"

# Inspect traceback for recursion pattern
python -c "
import traceback, sys
sys.setrecursionlimit(50)
def bad(): bad()
try:
    bad()
except RecursionError:
    traceback.print_exc()
" 2>&1 | head -30
