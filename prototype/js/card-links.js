// Open all external links on knowledge-unit pages in a new tab
document.addEventListener('DOMContentLoaded', function() {
  var links = document.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href');
    if (href && (href.startsWith('http') || href.startsWith('/go/'))) {
      links[i].setAttribute('target', '_blank');
      links[i].setAttribute('rel', (links[i].getAttribute('rel') || '') + ' noopener');
    }
  }
});
