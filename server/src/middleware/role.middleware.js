const ApiError = require('../utils/api-error');

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(r => userRoles.includes(r));

    if (!hasRole) {
      throw new ApiError(403, 'Insufficient permissions');
    }

    next();
  };
}

const requireAdmin = (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!req.user.isAdmin) {
    throw new ApiError(403, 'Admin access required');
  }

  next();
};

const requireAny = (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  next();
};

module.exports = {
  requireRole,
  requireAdmin,
  requireAny,
};
