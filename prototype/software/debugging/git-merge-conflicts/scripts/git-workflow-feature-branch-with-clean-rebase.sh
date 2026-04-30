#!/bin/bash
# Input:  feature branch and target branch (default: main)
# Output: Clean linear history via rebase, then FF merge

FEATURE_BRANCH="${1:-$(git branch --show-current)}"
TARGET_BRANCH="${2:-main}"

echo "=== Rebasing $FEATURE_BRANCH onto $TARGET_BRANCH ==="

# Fetch latest target
git fetch origin "$TARGET_BRANCH"

# Save current branch
git checkout "$FEATURE_BRANCH"

# Rebase onto latest target
git rebase "origin/$TARGET_BRANCH"
REBASE_STATUS=$?

if [ $REBASE_STATUS -ne 0 ]; then
    echo ""
    echo "⚠️  Conflicts detected during rebase."
    echo ""
    echo "For each conflicted file:"
    echo "  1. Resolve the conflict in your editor"
    echo "     (look for <<<<<<, =======, >>>>>>> markers)"
    echo "  2. git add <resolved-file>"
    echo "  3. git rebase --continue"
    echo ""
    echo "Other options:"
    echo "  git rebase --abort    → cancel rebase, return to original state"
    echo "  git rebase --skip     → skip this commit entirely"
    echo ""
    echo "Note: With 'rerere' enabled, recurring resolutions are auto-applied:"
    echo "  git config --global rerere.enabled true"
    exit 1
fi

echo "✅ Rebase complete — linear history achieved"
echo ""

# Fast-forward merge into target
git checkout "$TARGET_BRANCH"
git merge --ff-only "$FEATURE_BRANCH"

echo "✅ Fast-forward merge complete"
echo "   → $TARGET_BRANCH is now up to date with $FEATURE_BRANCH commits"
echo ""
echo "Push: git push origin $TARGET_BRANCH"
