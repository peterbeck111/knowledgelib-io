// Input:  A JavaScript Express route with untyped request/response
// Output: Fully typed TypeScript Express route with error handling

import { Router, Request, Response, NextFunction } from 'express';

// Define the shape of your data
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';  // union type replaces magic strings
}

// Type the request body and params
interface CreateUserBody {
  name: string;
  email: string;
  role?: User['role'];  // reuse the union type
}

const router = Router();

// BEFORE (JavaScript):
// router.post('/users', async (req, res) => {
//   const user = await db.createUser(req.body);
//   res.json(user);
// });

// AFTER (TypeScript):
router.post(
  '/users',
  async (
    req: Request<{}, User, CreateUserBody>,
    res: Response<User | { error: string }>,
    next: NextFunction
  ) => {
    try {
      const { name, email, role = 'user' } = req.body;
      if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required' });
        return;
      }
      const user: User = await db.createUser({ name, email, role });
      res.status(201).json(user);
    } catch (err) {
      next(err);  // pass to error handler
    }
  }
);

export default router;
