// Input:  jQuery-style event delegation (e.g., $(parent).on('click', '.child', fn))
// Output: Vanilla JS event delegation utility with namespace support

class EventDelegate {
  constructor(root = document) {
    this.root = typeof root === 'string' ? document.querySelector(root) : root;
    this._handlers = new Map();  // namespace -> [{ event, selector, handler, wrapped }]
  }

  // Replaces $(root).on(event, selector, handler)
  on(event, selector, handler, namespace = 'default') {
    const wrapped = (e) => {
      const target = e.target.closest(selector);
      if (target && this.root.contains(target)) {
        handler.call(target, e, target);  // `this` = matched element, like jQuery
      }
    };

    this.root.addEventListener(event, wrapped);

    if (!this._handlers.has(namespace)) {
      this._handlers.set(namespace, []);
    }
    this._handlers.get(namespace).push({ event, selector, handler, wrapped });
    return this;  // chainable
  }

  // Replaces $(root).off(event, selector) or namespace-based unbinding
  off(namespace = 'default') {
    const handlers = this._handlers.get(namespace) || [];
    handlers.forEach(({ event, wrapped }) => {
      this.root.removeEventListener(event, wrapped);
    });
    this._handlers.delete(namespace);
    return this;
  }

  // Replaces $(root).one(event, selector, handler)
  one(event, selector, handler, namespace = 'default') {
    const onceHandler = (e, target) => {
      handler.call(target, e, target);
      this.off(namespace);
    };
    return this.on(event, selector, onceHandler, namespace);
  }

  destroy() {
    for (const ns of this._handlers.keys()) {
      this.off(ns);
    }
  }
}

// Usage — replaces jQuery event delegation patterns
const delegate = new EventDelegate('#app');
delegate
  .on('click', '.btn-delete', function(e) {
    this.closest('.card').remove();    // `this` is the matched .btn-delete element
  })
  .on('input', '.search-field', function(e) {
    filterList(this.value);
  }, 'search');

// Later — remove search handlers only
delegate.off('search');
