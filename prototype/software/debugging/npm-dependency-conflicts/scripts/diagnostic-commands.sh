# === Identify conflicts ===
# Full dependency tree (shows duplicates and unmet peers)
npm ls --all 2>&1 | head -100

# Why is this specific package installed? (trace dependency chain)
npm explain <package-name>
# Alias: npm why <package-name>

# List all outdated packages (potential conflict sources)
npm outdated --long

# Dry-run install to see conflicts without modifying anything
npm install --dry-run 2>&1 | grep -E "ERESOLVE|peer|conflict"

# === Yarn equivalents ===
yarn why <package-name>
yarn list --pattern <package-name>

# === pnpm equivalents ===
pnpm why <package-name>
pnpm ls <package-name>

# === Fix commands ===
# Deduplicate (reduce duplicate versions in tree)
npm dedupe
npm dedupe --dry-run  # preview changes

# Clean install from scratch
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Verify peer dependencies are satisfied
npx check-peer-dependencies

# === Check npm/node versions ===
npm --version   # need >= 8.3 for overrides
node --version  # check engine compatibility
