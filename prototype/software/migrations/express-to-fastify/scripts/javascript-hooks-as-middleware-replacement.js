// Input:  Express middleware chain for auth + rate limiting
// Output: Fastify hooks and decorators achieving the same flow

const fp = require('fastify-plugin');

// Authentication plugin (replaces app.use(authMiddleware))
const authPlugin = fp(async function (fastify, opts) {
  fastify.decorate('authenticate', async function (request, reply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      reply.code(401);
      throw new Error('Missing authentication token');
    }
    try {
      request.user = await fastify.jwt.verify(token);
    } catch (err) {
      reply.code(401);
      throw new Error('Invalid token');
    }
  });
});

// Register auth plugin globally
fastify.register(authPlugin);

// Apply auth to specific routes using preHandler hook
fastify.register(async function protectedRoutes(fastify) {
  // This hook runs before every route in this plugin scope
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/api/profile', async (request) => {
    return { user: request.user };
  });

  fastify.get('/api/settings', async (request) => {
    return { settings: await db.getSettings(request.user.id) };
  });
});

// Public routes — no auth hook applied
fastify.get('/api/health', async () => ({ status: 'ok' }));
