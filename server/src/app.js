const express = require('express');
const helmet = require('helmet');
const { configureCors } = require('./config/cors');
const { loadEnvironment } = require('./config/environment');
const { getPoolStats } = require('./config/connection-manager');
const errorMiddleware = require('./middleware/error.middleware');
const { generalLimiter, authLimiter, exportLimiter, executionLimiter } = require('./middleware/rate-limiter');
const logger = require('./utils/logger');

function createApp() {
  const env = loadEnvironment();
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  }));
  configureCors(app, env.CORS_ORIGIN);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(generalLimiter);

  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/api/health', async (req, res) => {
    const poolStats = getPoolStats();
    res.status(200).json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: Object.keys(poolStats).length > 0 ? poolStats : 'not_connected',
    });
  });

  const authRoutes = require('./routes/auth.routes');
  app.use('/api/auth', authLimiter, authRoutes);

  const reportRoutes = require('./routes/report.routes');
  app.use('/api/reports', reportRoutes);

  const executeRoutes = require('./routes/execute.routes');
  app.use('/api/reports', executeRoutes);

  const exportRoutes = require('./routes/export.routes');
  app.use('/api/reports', exportRoutes);

  const roleRoutes = require('./routes/role.routes');
  app.use('/api/admin/roles', roleRoutes);

  const categoryRoutes = require('./routes/category.routes');
  app.use('/api/admin/categories', categoryRoutes);

  const userAdminRoutes = require('./routes/user-admin.routes');
  app.use('/api/admin/users', userAdminRoutes);

  const connectionsRoutes = require('./routes/connections.routes');
  app.use('/api/admin/connections', connectionsRoutes);

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
