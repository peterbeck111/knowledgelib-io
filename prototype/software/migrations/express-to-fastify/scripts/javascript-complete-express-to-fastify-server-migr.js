// Input:  An Express server with routes, middleware, and error handling
// Output: Equivalent Fastify server with plugins and JSON Schema validation

const Fastify = require('fastify');

// Create Fastify instance (replaces const app = express())
const fastify = Fastify({
  logger: true,           // Built-in Pino logger (replaces morgan/winston)
  ajv: {
    customOptions: {
      removeAdditional: true,  // Strip unknown properties
      coerceTypes: true        // Auto-coerce query string types
    }
  }
});

// Register plugins (replaces app.use(middleware))
fastify.register(require('@fastify/cors'), { origin: true });
fastify.register(require('@fastify/helmet'));
fastify.register(require('@fastify/compress'));

// Register route plugins with prefix (replaces express.Router)
fastify.register(require('./routes/users'), { prefix: '/api/users' });
fastify.register(require('./routes/products'), { prefix: '/api/products' });

// Global error handler (replaces app.use((err, req, res, next) => {}))
fastify.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'Request error');

  if (error.validation) {
    return reply.code(400).send({ error: 'Bad Request', details: error.validation });
  }

  reply.code(error.statusCode || 500).send({
    error: error.statusCode >= 500 ? 'Internal Server Error' : error.message
  });
});

// 404 handler (replaces app.use((req, res) => res.status(404)...))
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: 'Route not found' });
});

// Start server (replaces app.listen(port, callback))
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.fatal(err);
    process.exit(1);
  }
};

start();
