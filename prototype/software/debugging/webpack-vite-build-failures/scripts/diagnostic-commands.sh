# === Webpack Diagnostics ===
# Verbose build output with error details
npx webpack --stats=verbose

# Only show errors (fast check)
npx webpack --stats=errors-only

# Trace deprecated API usage
node --trace-deprecation node_modules/.bin/webpack --mode production

# Check installed webpack version
npx webpack --version

# Analyze bundle contents
npx webpack --profile --json > stats.json
# Upload stats.json to webpack.github.io/analyse/

# Debug with Chrome DevTools
node --inspect-brk node_modules/.bin/webpack --mode development

# Increase memory for large builds
NODE_OPTIONS=--max-old-space-size=8192 npx webpack

# === Vite Diagnostics ===
# Debug build output
npx vite build --debug

# Force re-optimize dependencies
npx vite --force

# Profile build performance (generates .cpuprofile)
npx vite build --profile

# Check installed vite version
npx vite --version

# === General ===
# Check Node.js version
node --version

# Verify package installation
npm list package-name

# List all outdated packages
npm outdated

# Clean all caches
rm -rf node_modules/.cache node_modules/.vite dist .parcel-cache

# Nuclear option: full clean reinstall
rm -rf node_modules package-lock.json && npm install
