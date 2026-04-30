#!/usr/bin/env python3
"""
Pre-commit hook to prevent committing with unresolved conflict markers.
Install: cp this_file .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

Input:  Git staged files
Output: Exit 0 (ok) or Exit 1 (conflict markers found — blocks commit)
"""
import subprocess
import sys
import re

CONFLICT_MARKERS = re.compile(r'^(<{7}|={7}|>{7}|\|{7})', re.MULTILINE)

def get_staged_files() -> list[str]:
    """Get list of staged text files."""
    result = subprocess.run(
        ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
        capture_output=True, text=True
    )
    return [f.strip() for f in result.stdout.splitlines() if f.strip()]

def check_file_for_markers(filepath: str) -> list[tuple[int, str]]:
    """Return list of (line_number, line) tuples where conflict markers found."""
    violations = []
    try:
        result = subprocess.run(
            ['git', 'show', f':{filepath}'],  # Check staged content, not working tree
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return []
        for i, line in enumerate(result.stdout.splitlines(), 1):
            if CONFLICT_MARKERS.match(line):
                violations.append((i, line.rstrip()))
    except (subprocess.SubprocessError, UnicodeDecodeError):
        pass
    return violations

def main():
    staged = get_staged_files()
    found_conflicts = False

    for filepath in staged:
        violations = check_file_for_markers(filepath)
        if violations:
            found_conflicts = True
            print(f"❌ Conflict markers in {filepath}:")
            for lineno, line in violations:
                print(f"   Line {lineno}: {line}")

    if found_conflicts:
        print("\nCommit blocked. Resolve conflicts first:")
        print("  git status              # see conflicted files")
        print("  git mergetool           # open GUI resolver")
        print("  git diff --check        # verify no markers remain")
        sys.exit(1)

    sys.exit(0)

if __name__ == '__main__':
    main()
