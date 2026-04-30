// Input:  HTTP requests to /api/posts
// Output: JSON responses with CRUD operations on posts

import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// GET /api/posts — equivalent of PostsController#index
app.get('/api/posts', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const posts = await prisma.post.findMany({
    where: { published: true },
    include: { author: { select: { id: true, name: true } } },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: posts, page, limit });
});

// POST /api/posts — equivalent of PostsController#create
app.post('/api/posts', authMiddleware, async (req: Request, res: Response) => {
  const { title, body, published } = req.body;
  const post = await prisma.post.create({
    data: {
      title,
      body,
      published: published ?? false,
      authorId: (req as any).userId,
    },
  });
  res.status(201).json({ data: post });
});

// Error handling middleware — replaces Rails rescue_from
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3001, () => console.log('Server running on port 3001'));
