#!/bin/bash
# Input:  Git repository with a merge/rebase in progress
# Output: Summary of all conflicts with context

echo "=== Git Conflict Summary ==="
echo "Repository: $(git rev-parse --show-toplevel)"
echo "Current branch: $(git branch --show-current)"
echo ""

# Count conflicts
CONFLICT_FILES=$(git diff --name-only --diff-filter=U 2>/dev/null)
CONFLICT_COUNT=$(echo "$CONFLICT_FILES" | grep -c . 2>/dev/null || echo 0)

if [ "$CONFLICT_COUNT" -eq 0 ]; then
    echo "✅ No conflicts detected"
    exit 0
fi

echo "❌ $CONFLICT_COUNT conflicted file(s):"
echo ""

# Show each conflicted file with hunk counts
while IFS= read -r file; do
    if [ -z "$file" ]; then continue; fi
    HUNKS=$(grep -c "^<<<<<<< " "$file" 2>/dev/null || echo 0)
    SIZE=$(wc -l < "$file" 2>/dev/null || echo "?")
    echo "  📄 $file"
    echo "     Conflict hunks: $HUNKS | Lines: $SIZE"
    # Show first conflict context
    grep -n "^<<<<<<< \|^>>>>>>> \|^=======" "$file" 2>/dev/null | head -6 | sed 's/^/     /'
    echo ""
done <<< "$CONFLICT_FILES"

echo "=== Resolution Commands ==="
echo "  Manual: edit files → git add <file> → git commit"
echo "  GUI:    git mergetool"
echo "  Abort:  git merge --abort  OR  git rebase --abort"
echo "  Check:  git diff --check  (verify no stray markers)"
