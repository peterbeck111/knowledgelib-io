# Check current Python version
python --version && python3 --version

# Run Python 2 with Python 3 deprecation warnings
python2 -3 -Werror script.py

# Run Python 3 with bytes/str mixing detection
python3 -bb -m pytest tests/ -v

# Check if dependencies support Python 3
pip install caniusepython3
caniusepython3 --requirements requirements.txt

# Run pylint with Python 3 compatibility checker
pip install pylint
pylint --py3k mypackage/

# Count Python 2-specific patterns remaining in codebase
grep -rn "print " --include="*.py" | grep -v "print(" | wc -l
grep -rn "has_key\|iteritems\|itervalues\|iterkeys" --include="*.py" | wc -l
grep -rn "except.*," --include="*.py" | grep -v "except.*as" | wc -l

# Test across multiple Python versions with tox
pip install tox
tox -e py38,py39,py310,py311,py312

# Run futurize in dry-run mode (no changes)
futurize --stage1 mypackage/ 2>&1 | head -50

# Check for __future__ imports coverage
grep -rL "from __future__ import" --include="*.py" mypackage/

# Verify type annotations with mypy
pip install mypy
mypy --python-version 3.10 mypackage/
