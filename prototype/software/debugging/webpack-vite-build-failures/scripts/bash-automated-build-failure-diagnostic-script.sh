#!/bin/bash
# Input:  Run in project root with package.json
# Output: Diagnostic report for Webpack/Vite build failures

echo "=== Build Failure Diagnostic ==="
echo "Node: $(node --version) | npm: $(npm --version)"
echo ""

# Detect bundler
if [ -f "webpack.config.js" ] || [ -f "webpack.config.ts" ]; then
  BUNDLER="webpack"
  echo "Bundler: Webpack $(npx webpack --version 2>/dev/null || echo 'not installed')"
fi
if [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
  BUNDLER="vite"
  echo "Bundler: Vite $(npx vite --version 2>/dev/null || echo 'not installed')"
fi

# Check for common issues
echo ""
echo "--- Checking package.json type field ---"
TYPE=$(node -e "try{console.log(require('./package.json').type||'commonjs')}catch(e){console.log('missing')}")
echo "Module type: $TYPE"

echo ""
echo "--- Checking for lockfile ---"
[ -f "package-lock.json" ] && echo "Found: package-lock.json"
[ -f "yarn.lock" ] && echo "Found: yarn.lock"
[ -f "pnpm-lock.yaml" ] && echo "Found: pnpm-lock.yaml"

echo ""
echo "--- Checking node_modules health ---"
if [ -d "node_modules" ]; then
  echo "node_modules exists ($(du -sh node_modules 2>/dev/null | cut -f1))"
  echo "Cache dirs:"
  [ -d "node_modules/.cache" ] && echo "  .cache: $(du -sh node_modules/.cache 2>/dev/null | cut -f1)"
  [ -d "node_modules/.vite" ] && echo "  .vite: $(du -sh node_modules/.vite 2>/dev/null | cut -f1)"
else
  echo "WARNING: node_modules missing — run npm install"
fi

echo ""
echo "--- Outdated packages (top 10) ---"
npm outdated 2>/dev/null | head -11
