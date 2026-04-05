const {
  comparePassword,
  generateTokens,
  verifyRefreshToken,
  findUserByUsername,
  findUserById,
} = require('../services/auth.service');
const asyncHandler = require('../utils/async-handler');
const ApiError = require('../utils/api-error');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await findUserByUsername(username);
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'Account is disabled');
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const tokens = generateTokens(user);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles || [],
      },
      ...tokens,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const decoded = verifyRefreshToken(refreshToken);
  const user = await findUserById(decoded.id);

  if (!user || !user.is_active) {
    throw new ApiError(401, 'User not found or disabled');
  }

  const tokens = generateTokens(user);

  res.json({
    success: true,
    data: tokens,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles || [],
      is_active: user.is_active,
      created_at: user.created_at,
    },
  });
});

module.exports = {
  login,
  refresh,
  me,
};
