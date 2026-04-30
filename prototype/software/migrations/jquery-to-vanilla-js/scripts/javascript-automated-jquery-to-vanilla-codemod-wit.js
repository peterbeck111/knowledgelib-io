// Input:  jscodeshift transform file — run against jQuery codebase
// Output: Automatically converts common jQuery patterns to vanilla JS
// Usage:  npx jscodeshift -t jquery-to-vanilla.js src/ --extensions=js

// File: jquery-to-vanilla.js (jscodeshift transform)
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  let root = j(fileInfo.source);
  let modified = false;

  // Transform: $('#id') → document.querySelector('#id')
  root.find(j.CallExpression, {
    callee: { name: '$' },
    arguments: [{ type: 'Literal' }]
  }).forEach(path => {
    const selector = path.node.arguments[0].value;
    if (typeof selector === 'string') {
      // Only transform simple selectors (id, class, tag)
      const replacement = selector.match(/^[#.a-z]/i)
        ? j.callExpression(
            j.memberExpression(
              j.identifier('document'),
              j.identifier(selector.startsWith('#') ? 'querySelector' : 'querySelectorAll')
            ),
            [j.literal(selector)]
          )
        : null;
      if (replacement) {
        j(path).replaceWith(replacement);
        modified = true;
      }
    }
  });

  return modified ? root.toSource() : fileInfo.source;
};
