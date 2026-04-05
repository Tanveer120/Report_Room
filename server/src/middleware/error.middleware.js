const ApiError = require('../utils/api-error');
const logger = require('../utils/logger');

function errorMiddleware(err, req, res, _next) {
  let { statusCode, message } = err;

  if (!statusCode) {
    statusCode = 500;
  }

  if (!message) {
    message = 'Internal Server Error';
  }

  if (err.name === 'ValidationError' && err.details) {
    statusCode = 400;
    message = err.details.map(d => d.message).join(', ');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.code === 'NJS-040' || err.code === 'DPY-6005') {
    statusCode = 503;
    message = 'Database connection unavailable';
  }

  if (err.code === 'DPY-6010' || err.message?.includes('queue timeout')) {
    statusCode = 503;
    message = 'Server is busy, please try again later';
  }

  if (err.message?.match(/^ORA-/)) {
    statusCode = 503;
    message = 'Database error occurred. Please try again later.';
  }

  if (statusCode >= 500) {
    logger.error(`[Error ${statusCode}] ${message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn(`[Error ${statusCode}] ${message}`, {
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' && statusCode >= 500
        ? 'Internal Server Error'
        : message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

module.exports = errorMiddleware;
