# Check which Python is active
which python          # Linux/macOS
where python          # Windows
python --version

# Check if in virtualenv
python -c "import sys; print('venv' if sys.prefix != sys.base_prefix else 'system')"

# Print sys.path
python -c "import sys; print('\n'.join(sys.path))"

# Check if package is installed and where
pip show package_name
python -m pip show package_name

# List all installed packages
pip list
pip freeze

# Check where a module is loaded from
python -c "import module_name; print(module_name.__file__)"

# Find all Python files that could shadow standard library
python -c "
import os, sys
stdlib = set(os.listdir(os.path.dirname(os.__file__)))
local = set(f for f in os.listdir('.') if f.endswith('.py'))
shadows = local & {s + '.py' for s in stdlib if not s.startswith('_')}
if shadows: print('⚠️ Shadowing:', shadows)
else: print('No shadows found')
"

# Check for circular imports (rough detection)
grep -rn "from.*import\|import " --include="*.py" src/ | sort

# Clean bytecode cache
find . -name "__pycache__" -type d -exec rm -rf {} +
find . -name "*.pyc" -delete

# Verify editable install
pip show -f my_package | head -20
