// Input:  App crashes randomly from various unhandled rejections
// Output: Comprehensive global handler with logging and graceful shutdown

const process = require('process');

let isShuttingDown = false;

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED PROMISE REJECTION ===');
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack || 'No stack');
  console.error('Promise:', promise);
  console.error('===================================');

  // Send to error tracking (Sentry, Datadog, etc.)
  // Sentry.captureException(reason);

  if (!isShuttingDown) {
    isShuttingDown = true;
    gracefulShutdown('unhandledRejection', 1);
  }
});

process.on('uncaughtException', (error, origin) => {
  console.error(`=== UNCAUGHT EXCEPTION (${origin}) ===`);
  console.error(error);
  console.error('=====================================');

  if (!isShuttingDown) {
    isShuttingDown = true;
    gracefulShutdown('uncaughtException', 1);
  }
});

async function gracefulShutdown(signal, exitCode = 0) {
  console.log(`${signal} received — shutting down gracefully`);

  const timeout = setTimeout(() => {
    console.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10000);

  try {
    // Close server, DB connections, etc.
    if (global.server) await new Promise(r => global.server.close(r));
    if (global.dbPool) await global.dbPool.end();
  } finally {
    clearTimeout(timeout);
    process.exit(exitCode);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
