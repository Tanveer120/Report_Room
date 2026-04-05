const { verifyAccessToken, findUserById } = require('../services/auth.service');
const asyncHandler = require('../utils/async-handler');
const ApiError = require('../utils/api-error');

const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization header required');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  const user = await findUserById(decoded.id);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'User not found or disabled');
  }

  req.user = {
    id: user.id,
    username: user.username,
    roles: user.roles || [],
    isAdmin: !!user.isAdmin,
  };

  next();
});

module.exports = { authenticate };
