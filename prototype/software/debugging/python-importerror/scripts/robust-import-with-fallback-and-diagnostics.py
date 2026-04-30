# Input:  Script needs to run in different environments (some may lack packages)
# Output: Graceful handling of missing imports with helpful error messages

import sys
import importlib

def safe_import(module_name, package_name=None, install_hint=None):
    """Try to import a module, providing helpful error if it fails."""
    try:
        return importlib.import_module(module_name)
    except ImportError as e:
        pkg = package_name or module_name
        hint = install_hint or f"pip install {pkg}"
        print(f"ERROR: Could not import '{module_name}'", file=sys.stderr)
        print(f"  Python executable: {sys.executable}", file=sys.stderr)
        print(f"  sys.path:", file=sys.stderr)
        for p in sys.path:
            print(f"    {p}", file=sys.stderr)
        print(f"\n  To fix: {hint}", file=sys.stderr)
        raise SystemExit(1) from e

# Usage — common packages where install name ≠ import name
requests = safe_import('requests')
PIL = safe_import('PIL', package_name='Pillow')
cv2 = safe_import('cv2', package_name='opencv-python')
yaml = safe_import('yaml', package_name='PyYAML')
bs4 = safe_import('bs4', package_name='beautifulsoup4')
sklearn = safe_import('sklearn', package_name='scikit-learn')
