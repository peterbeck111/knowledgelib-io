// Input:  GET /api/items?mode=cursor&cursor=abc&limit=25
//         GET /api/items?mode=offset&offset=0&limit=25
//         GET /api/items?mode=keyset&after_id=42&after_date=2026-01-15&limit=25
// Output: { data: [...], pagination: { has_more, next_cursor|next_offset, limit } }

const express = require('express'); // ^4.18
const app = express();

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

app.get('/api/items', async (req, res) => {
  const limit = Math.min(Math.max(1, parseInt(req.query.limit) || DEFAULT_LIMIT), MAX_LIMIT);
  const mode = req.query.mode || 'cursor';

  let query, params;

  if (mode === 'offset') {
    // Offset/Limit -- simple but slow at scale
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    query = 'SELECT * FROM items ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2';
    params = [limit + 1, offset]; // fetch limit+1 to detect has_more

  } else if (mode === 'keyset') {
    // Keyset/Seek -- transparent cursor values in URL
    const afterId = parseInt(req.query.after_id);
    const afterDate = req.query.after_date;
    if (afterId && afterDate) {
      query = `SELECT * FROM items
               WHERE (created_at, id) < ($1, $2)
               ORDER BY created_at DESC, id DESC LIMIT $3`;
      params = [afterDate, afterId, limit + 1];
    } else {
      query = 'SELECT * FROM items ORDER BY created_at DESC, id DESC LIMIT $1';
      params = [limit + 1];
    }

  } else {
    // Cursor -- opaque base64 token (recommended default)
    let where = '';
    params = [limit + 1];
    if (req.query.cursor) {
      const { id, created_at } = JSON.parse(
        Buffer.from(req.query.cursor, 'base64url').toString()
      );
      where = 'WHERE (created_at, id) < ($2, $3)';
      params.push(created_at, id);
    }
    query = `SELECT * FROM items ${where} ORDER BY created_at DESC, id DESC LIMIT $1`;
  }

  const rows = await db.query(query, params);
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  const lastRow = data[data.length - 1];
  const pagination = { has_more: hasMore, limit };

  if (mode === 'offset') {
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    pagination.next_offset = hasMore ? offset + limit : null;
  } else if (mode === 'keyset') {
    pagination.after_id = hasMore ? lastRow.id : null;
    pagination.after_date = hasMore ? lastRow.created_at : null;
  } else {
    pagination.next_cursor = hasMore
      ? Buffer.from(JSON.stringify({ id: lastRow.id, created_at: lastRow.created_at }))
          .toString('base64url')
      : null;
  }

  res.json({ data, pagination });
});
