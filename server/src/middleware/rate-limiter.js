const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased from 100 to 2000
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests, please try again later' },
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased from 20 to 100
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many authentication attempts, please try again later' },
  },
});

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200, // Increased from 30 to 200
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many export requests, please try again later' },
  },
});

const executionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // Increased from 60 to 120
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many report executions, please slow down' },
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  exportLimiter,
  executionLimiter,
};
