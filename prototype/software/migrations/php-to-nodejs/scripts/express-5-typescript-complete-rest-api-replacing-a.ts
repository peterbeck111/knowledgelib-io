// Input:  A PHP Laravel-style CRUD controller with routes, validation, and DB queries
// Output: Equivalent Express 5 + Knex.js REST API with full error handling

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import knex from 'knex';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
app.use(express.json({ limit: '10mb' }));

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
});

// Auth middleware — replaces PHP's auth:sanctum middleware
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    (req as any).user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/products — replaces ProductController@index
app.get('/api/products', async (req, res) => {
  const { category, min_price, max_price, page = '1' } = req.query;
  let query = db('products').select('*');

  if (category) query = query.where('category', category as string);
  if (min_price) query = query.where('price', '>=', Number(min_price));
  if (max_price) query = query.where('price', '<=', Number(max_price));

  const limit = 20;
  const offset = (Number(page) - 1) * limit;
  const products = await query.limit(limit).offset(offset);
  const [{ count }] = await db('products').count('* as count');

  res.json({ data: products, meta: { page: Number(page), total: Number(count) } });
});

// POST /api/products — replaces ProductController@store
app.post('/api/products', auth, async (req, res) => {
  const { name, price, category, description } = req.body;
  if (!name || !price) {
    return res.status(422).json({ error: 'name and price are required' });
  }

  const [product] = await db('products')
    .insert({ name, price, category, description })
    .returning('*');

  res.status(201).json({ data: product });
});

// Express 5 catches async rejections automatically [src2]
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => console.log('Server running on :3000'));
