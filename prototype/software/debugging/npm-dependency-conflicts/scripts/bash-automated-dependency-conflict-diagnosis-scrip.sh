#!/bin/bash
# Input:  Run in project root with package.json
# Output: Conflict report with actionable fix suggestions

echo "=== npm Dependency Conflict Diagnosis ==="
echo "npm version: $(npm --version)"
echo "node version: $(node --version)"
echo ""

# Step 1: Check for peer dependency issues
echo "--- Peer dependency check ---"
npx check-peer-dependencies 2>/dev/null || echo "(install: npm i -g check-peer-dependencies)"
echo ""

# Step 2: List packages with multiple versions installed
echo "--- Duplicate packages ---"
npm ls --all 2>&1 | grep "deduped" | sort | uniq -c | sort -rn | head -10
echo ""

# Step 3: List outdated packages
echo "--- Outdated packages (source of conflicts) ---"
npm outdated --long 2>/dev/null | head -20
echo ""

# Step 4: Find ERESOLVE errors
echo "--- Attempting install (dry run for conflicts) ---"
npm install --dry-run 2>&1 | grep -E "(ERESOLVE|peer|conflict|WARN)" | head -20
echo ""

echo "=== Suggested Actions ==="
echo "1. Run: npm explain <conflicting-package>"
echo "2. Try: npm update <parent-package>"
echo "3. Add overrides to package.json if alignment impossible"
echo "4. Last resort: npm install --legacy-peer-deps"
