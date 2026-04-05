const { loadConnections, saveConnections, testConnection, getPool, closeAllPools } = require('../config/connection-manager');
const asyncHandler = require('../utils/async-handler');
const ApiError = require('../utils/api-error');

const list = asyncHandler(async (req, res) => {
  const connections = loadConnections();
  const result = Object.entries(connections).map(([key, config]) => ({
    key,
    label: config.label || key,
    user: config.user,
    connectString: config.connectString,
    hasCredentials: !!(config.user && config.password && config.connectString),
  }));
  res.json({ success: true, data: result });
});

const save = asyncHandler(async (req, res) => {
  const connections = req.body;
  
  if (typeof connections !== 'object' || Array.isArray(connections)) {
    throw new ApiError(400, 'Connections must be a JSON object with string keys');
  }
  
  if (!connections.default) {
    throw new ApiError(400, 'A "default" connection is required');
  }

  // Validate the structure of each connection entry
  for (const [key, config] of Object.entries(connections)) {
    if (!config || typeof config !== 'object') {
      throw new ApiError(400, `Connection "${key}" must be an object`);
    }
    // We optionally allow empty credentials when saving, just as long as we have the structure, 
    // but the required fields must exist as strings.
    if (typeof config.user !== 'string' || typeof config.password !== 'string' || typeof config.connectString !== 'string') {
      throw new ApiError(400, `Connection "${key}" is missing required fields (user, password, connectString)`);
    }
  }

  saveConnections(connections);
  await closeAllPools();
  res.json({ success: true, message: 'Connections saved. All pools have been recycled.' });
});

const test = asyncHandler(async (req, res) => {
  const { user, password, connectString } = req.body;
  if (!user || !password || !connectString) {
    throw new ApiError(400, 'user, password, and connectString are required');
  }
  const result = await testConnection({ user, password, connectString });
  if (result.success) {
    res.json({ success: true, data: result });
  } else {
    res.status(400).json({ success: false, error: { message: result.message } });
  }
});

const testByKey = asyncHandler(async (req, res) => {
  const pool = await getPool(req.params.key);
  const stats = {
    connectionsInUse: pool.connectionsInUse,
    connectionsOpen: pool.connectionsOpen,
    queueLength: pool.queueLength,
  };
  res.json({ success: true, data: { ...stats, message: 'Connection pool is healthy' } });
});

module.exports = {
  list,
  save,
  test,
  testByKey,
};
