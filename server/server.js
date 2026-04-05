require('dotenv').config();

const { createApp } = require('./src/app');
const { loadConnections, initPool, closeAllPools } = require('./src/config/connection-manager');
const { loadEnvironment } = require('./src/config/environment');
const logger = require('./src/utils/logger');

async function startServer() {
  const env = loadEnvironment();
  const app = createApp();

  const connections = loadConnections();
  const connectionKeys = Object.keys(connections);

  if (connectionKeys.length > 0) {
    try {
      await initPool('default');
      logger.info('Default connection pool initialized from connections.json');
      for (const key of connectionKeys) {
        if (key !== 'default') {
          await initPool(key).catch(err => {
            logger.error(`Failed to initialize pool for "${key}":`, err.message);
          });
        }
      }
    } catch (err) {
      logger.error('Failed to initialize default connection pool. Server will start but DB-dependent routes will fail.', err.message);
    }
  } else {
    logger.warn('No connections found in connections.json. Add at least a "default" connection.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await closeAllPools();
        logger.info('Server shut down complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

startServer();
