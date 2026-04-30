// Input:  Project source directory path
// Output: Migration progress report (AngularJS vs Angular component counts)

// scripts/migration-progress.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function countPattern(dir, pattern, ext) {
  try {
    const result = execSync(
      `grep -r "${pattern}" "${dir}" --include="*.${ext}" -l 2>/dev/null | wc -l`,
      { encoding: 'utf-8' }
    );
    return parseInt(result.trim(), 10);
  } catch {
    return 0;
  }
}

const srcDir = process.argv[2] || './src';

const report = {
  angularjs: {
    controllers: countPattern(srcDir, '\\.controller(', 'js'),
    directives: countPattern(srcDir, '\\.directive(', 'js'),
    services: countPattern(srcDir, '\\.service(\\|.factory(', 'js'),
    filters: countPattern(srcDir, '\\.filter(', 'js'),
  },
  angular: {
    components: countPattern(srcDir, '@Component', 'ts'),
    directives: countPattern(srcDir, '@Directive', 'ts'),
    services: countPattern(srcDir, '@Injectable', 'ts'),
    pipes: countPattern(srcDir, '@Pipe', 'ts'),
  }
};

const totalAJS = Object.values(report.angularjs).reduce((a, b) => a + b, 0);
const totalNG = Object.values(report.angular).reduce((a, b) => a + b, 0);
const pct = totalNG + totalAJS > 0
  ? Math.round((totalNG / (totalNG + totalAJS)) * 100)
  : 0;

console.log('=== Migration Progress ===');
console.log(`AngularJS artifacts: ${totalAJS}`);
console.log(`  Controllers: ${report.angularjs.controllers}`);
console.log(`  Directives:  ${report.angularjs.directives}`);
console.log(`  Services:    ${report.angularjs.services}`);
console.log(`  Filters:     ${report.angularjs.filters}`);
console.log(`Angular artifacts:   ${totalNG}`);
console.log(`  Components:  ${report.angular.components}`);
console.log(`  Directives:  ${report.angular.directives}`);
console.log(`  Services:    ${report.angular.services}`);
console.log(`  Pipes:       ${report.angular.pipes}`);
console.log(`\nProgress: ${pct}% migrated (${totalNG}/${totalNG + totalAJS})`);
