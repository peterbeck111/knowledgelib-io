# Check AngularJS version in your project
npm ls angular | head -5
# Expected: angular@1.x.x (1.5+ required for react2angular)

# Check if react2angular is installed
npm ls react2angular
# Expected: react2angular@4.x.x

# Find all AngularJS module declarations (to track migration progress)
grep -r "angular\.module\(" src/ --include="*.js" --include="*.ts" | wc -l
# Lower number = more migration progress

# Find remaining AngularJS directives
grep -r "\.directive\(" src/ --include="*.js" --include="*.ts" | wc -l

# Find remaining AngularJS controllers
grep -r "\.controller\(" src/ --include="*.js" --include="*.ts" | wc -l

# Find remaining $scope usage (indicator of unconverted code)
grep -r "\$scope" src/ --include="*.js" --include="*.ts" | wc -l

# Analyze bundle size to track bloat during migration
npx webpack-bundle-analyzer dist/stats.json
# Or with vite:
npx vite-bundle-visualizer

# Check for mixed framework rendering issues in browser console
# Open DevTools Console and run:
# angular.element(document.body).injector().get('$rootScope').$$watchers.length
# Fewer watchers = less AngularJS code remaining

# Run both test suites
npx karma start karma.conf.js && npx jest --coverage
