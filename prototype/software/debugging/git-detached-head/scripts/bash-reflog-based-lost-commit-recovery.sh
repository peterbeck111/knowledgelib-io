#!/bin/bash
# Input:  optional keyword to filter reflog entries
# Output: list of potential lost commits with recovery commands

KEYWORD="${1:-}"

echo "=== Lost Commit Recovery via reflog ==="
echo ""

# Show reflog with absolute timestamps
echo "Recent HEAD history (last 30 entries):"
git reflog --pretty=format:"%C(yellow)%h%Creset %C(bold)%gd%Creset %C(dim)%ar%Creset %gs" \
  --color=always 2>/dev/null | head -30
echo ""

# Find detached HEAD commits that aren't on any branch
echo "=== Orphaned Commits (not on any branch) ==="
ALL_BRANCH_COMMITS=$(git branch -a --format='%(objectname:short)' 2>/dev/null | sort | uniq)
REFLOG_COMMITS=$(git reflog --pretty=format:"%h" 2>/dev/null)

ORPHANED=()
while IFS= read -r hash; do
    # Check if this commit is reachable from any branch
    if ! git merge-base --is-ancestor "$hash" HEAD 2>/dev/null; then
        MSG=$(git log --oneline -1 "$hash" 2>/dev/null)
        if [ -n "$MSG" ]; then
            # Filter by keyword if provided
            if [ -z "$KEYWORD" ] || echo "$MSG" | grep -qi "$KEYWORD"; then
                ORPHANED+=("$hash: $MSG")
            fi
        fi
    fi
done <<< "$REFLOG_COMMITS"

if [ ${#ORPHANED[@]} -eq 0 ]; then
    echo "  No orphaned commits found (within reflog window)"
else
    echo "  Found ${#ORPHANED[@]} potentially orphaned commit(s):"
    for entry in "${ORPHANED[@]}"; do
        HASH=$(echo "$entry" | cut -d: -f1)
        MSG=$(echo "$entry" | cut -d: -f2-)
        echo "  📌 $entry"
        echo "     Recover: git branch recover-$(echo $HASH | head -c6) $HASH"
    done
fi

echo ""
echo "=== Manual Recovery Steps ==="
echo "1. Find the commit: git reflog | grep 'detached'"
echo "2. Create a branch:  git branch recover-work <hash>"
echo "3. Switch to it:     git switch recover-work"
echo "4. Verify:           git log --oneline -5"
