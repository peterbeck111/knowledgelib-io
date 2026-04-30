// Input:  Need reusable patterns for safe async operations
// Output: Utility functions that prevent unhandled rejections

/**
 * Wrap an async function to prevent unhandled rejections.
 * Returns [error, result] tuple (Go-style error handling).
 */
async function safely(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error, null];
  }
}

// Usage
const [err, user] = await safely(db.getUser(123));
if (err) {
  console.error('Failed to get user:', err.message);
  return res.status(500).json({ error: 'Database error' });
}
res.json(user);

/**
 * Run multiple async operations with individual error handling.
 * Never throws — returns results with status for each.
 */
async function safelyAll(promises, options = {}) {
  const results = await Promise.allSettled(promises);
  const { onError } = options;

  return results.map((r, i) => {
    if (r.status === 'rejected') {
      if (onError) onError(r.reason, i);
      return { ok: false, error: r.reason };
    }
    return { ok: true, value: r.value };
  });
}

// Usage
const results = await safelyAll(
  userIds.map(id => db.getUser(id)),
  { onError: (err, i) => console.error(`User ${userIds[i]} failed:`, err) }
);

const users = results.filter(r => r.ok).map(r => r.value);
