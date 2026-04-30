# Input:  Can't figure out why an import is failing
# Output: Diagnostic script that pinpoints the problem

import sys
import os
import importlib

def diagnose_import(module_name):
    """Diagnose why a module can't be imported."""
    print(f"=== Import Diagnosis for '{module_name}' ===\n")

    # 1. Check Python info
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    print(f"Platform: {sys.platform}")
    print(f"Virtual env: {sys.prefix != sys.base_prefix}")
    if sys.prefix != sys.base_prefix:
        print(f"  venv path: {sys.prefix}")
    print()

    # 2. Check sys.path
    print("sys.path:")
    for i, p in enumerate(sys.path):
        exists = "✅" if os.path.exists(p) else "❌"
        print(f"  [{i}] {exists} {p}")
    print()

    # 3. Try the import
    try:
        mod = importlib.import_module(module_name)
        print(f"✅ Import succeeded!")
        print(f"  Location: {getattr(mod, '__file__', 'built-in')}")
        print(f"  Package: {getattr(mod, '__package__', 'N/A')}")
        return mod
    except ModuleNotFoundError as e:
        print(f"❌ ModuleNotFoundError: {e}")
    except ImportError as e:
        print(f"❌ ImportError: {e}")

    # 4. Check for name shadowing
    parts = module_name.split('.')
    shadow_path = os.path.join(os.getcwd(), parts[0] + '.py')
    shadow_dir = os.path.join(os.getcwd(), parts[0])
    if os.path.exists(shadow_path):
        print(f"\n⚠️ NAME SHADOWING: Found '{shadow_path}' in current directory!")
        print(f"  This file may be shadowing the '{parts[0]}' package.")
        print(f"  Rename it to fix the issue.")
    if os.path.isdir(shadow_dir) and os.path.exists(
        os.path.join(shadow_dir, '__init__.py')
    ):
        print(f"\n⚠️ NAME SHADOWING: Found package '{shadow_dir}/' in current directory!")

    # 5. Check pip
    print(f"\nChecking pip for '{module_name}'...")
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'show', module_name],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f"  Package IS installed:\n{result.stdout}")
        else:
            print(f"  Package NOT installed via pip")
    except Exception:
        print("  Could not check pip")

    return None

# Usage
if __name__ == '__main__':
    diagnose_import(sys.argv[1] if len(sys.argv) > 1 else 'requests')
