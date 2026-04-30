// Input:  Express route file with TypeScript
// Output: Fastify plugin with typed schema, request, and reply

import { FastifyPluginAsync } from 'fastify';

interface UserParams {
  id: string;
}

interface CreateUserBody {
  email: string;
  name: string;
  role?: 'admin' | 'user';
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const userRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // GET /api/users/:id
  fastify.get<{ Params: UserParams; Reply: UserResponse }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const user = await fastify.db.findUser(request.params.id);
      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }
      return user;
    }
  );

  // POST /api/users
  fastify.post<{ Body: CreateUserBody; Reply: UserResponse }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 2 },
            role: { type: 'string', enum: ['admin', 'user'], default: 'user' }
          }
        }
      }
    },
    async (request, reply) => {
      const user = await fastify.db.createUser(request.body);
      reply.code(201);
      return user;
    }
  );
};

export default userRoutes;
