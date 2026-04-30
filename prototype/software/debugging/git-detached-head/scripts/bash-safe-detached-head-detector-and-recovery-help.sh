#!/bin/bash
# Input:  Git repository (optional branch name to recover to)
# Output: Detached HEAD status report + guided recovery

RECOVER_BRANCH="${1:-}"

echo "=== Git HEAD State Inspector ==="
echo "Repository: $(git rev-parse --show-toplevel 2>/dev/null || echo 'not a git repo')"
echo ""

# Check if in detached HEAD
HEAD_REF=$(cat .git/HEAD 2>/dev/null)
if echo "$HEAD_REF" | grep -q "^ref:"; then
    BRANCH=$(git branch --show-current)
    echo "✅ Normal state — on branch: $BRANCH"
    echo "   HEAD → $(git rev-parse --short HEAD)"
    exit 0
fi

DETACHED_SHA=$(git rev-parse --short HEAD 2>/dev/null)
echo "⚠️  DETACHED HEAD at: $DETACHED_SHA"
echo ""

# Count commits made since detaching
# Find the last branch this HEAD was on via reflog
LAST_BRANCH=$(git reflog | grep -E "checkout: moving from" | head -1 | sed 's/.*moving from \([^ ]*\).*/\1/')
echo "   Last known branch: ${LAST_BRANCH:-unknown}"

# Commits in detached state
if [ -n "$LAST_BRANCH" ]; then
    DETACHED_COMMITS=$(git log --oneline "${LAST_BRANCH}..HEAD" 2>/dev/null | wc -l | tr -d ' ')
    echo "   Commits made while detached: $DETACHED_COMMITS"
    if [ "$DETACHED_COMMITS" -gt 0 ]; then
        echo ""
        echo "   Detached commits (newest first):"
        git log --oneline "${LAST_BRANCH}..HEAD" 2>/dev/null | head -10 | sed 's/^/     /'
    fi
fi

echo ""
echo "=== Recovery Options ==="

if [ -n "$RECOVER_BRANCH" ]; then
    echo "Creating branch '$RECOVER_BRANCH' at current position..."
    git switch -c "$RECOVER_BRANCH" 2>/dev/null || git checkout -b "$RECOVER_BRANCH"
    echo "✅ Work saved to branch: $RECOVER_BRANCH"
    echo "   Next: git push -u origin $RECOVER_BRANCH"
else
    echo "1. Save commits to new branch:"
    echo "   git switch -c <new-branch-name>"
    echo ""
    echo "2. Discard and return to ${LAST_BRANCH:-main}:"
    echo "   git switch ${LAST_BRANCH:-main}"
    echo ""
    echo "3. Cherry-pick commits to existing branch:"
    echo "   git switch <target-branch>"
    echo "   git cherry-pick $DETACHED_SHA"
    echo ""
    echo "Run: $0 <branch-name>  to auto-recover"
fi
