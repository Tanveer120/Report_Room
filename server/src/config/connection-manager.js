const oracledb = require('oracledb');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Ensure CLOBs are parsed back as Strings to avoid circular references (Lob objects)
oracledb.fetchAsString = [oracledb.CLOB];

const CONNECTIONS_FILE = path.join(__dirname, 'connections.json');
const pools = {};

function loadConnections() {
  try {
    const raw = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Failed to load connections.json:', err.message);
    return {};
  }
}

function saveConnections(connections) {
  fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2), 'utf-8');
}

async function initPool(key) {
  // If existing pool is still alive, reuse it
  if (pools[key]) {
    try {
      // Basic health check — if pool is terminated this will throw
      if (pools[key].connectionsOpen >= 0) {
        return pools[key];
      }
    } catch {
      // Pool is dead, remove it and re-create
      logger.warn(`Connection pool "${key}" is stale, re-creating...`);
      delete pools[key];
    }
  }

  const connections = loadConnections();
  const config = connections[key];

  if (!config) throw new Error(`Connection "${key}" not found in connections.json`);
  if (!config.user || !config.password || !config.connectString) {
    throw new Error(`Connection "${key}" is not fully configured (missing user, password, or connectString)`);
  }

  const pool = await oracledb.createPool({
    user: config.user,
    password: config.password,
    connectString: config.connectString,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 2,
    poolTimeout: 30,
    queueTimeout: 30000,
    stmtCacheSize: 30,
    prefetchRows: 1000,
  });

  pool.execute = async function(sql, binds = [], options = {}) {
    const connection = await this.getConnection();
    try {
      return await connection.execute(sql, binds, options);
    } finally {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Error closing connection:', err);
      }
    }
  };

  pools[key] = pool;
  logger.info(`Connection pool created for "${key}" (${config.connectString})`);
  return pool;
}

function getPool(key) {
  const resolvedKey = (!key || key === 'default') ? 'default' : key;

  if (!pools[resolvedKey]) {
    throw new Error(`Connection pool "${resolvedKey}" not initialized. Check connections.json and ensure the server started successfully.`);
  }

  return pools[resolvedKey];
}

async function testConnection(config) {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: config.user,
      password: config.password,
      connectString: config.connectString,
    });
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        logger.error('Error closing test connection:', closeErr.message);
      }
    }
  }
}

async function closeAllPools() {
  for (const [key, pool] of Object.entries(pools)) {
    try {
      await pool.close(10);
      logger.info(`Connection pool closed for "${key}"`);
    } catch (err) {
      logger.error(`Error closing pool "${key}":`, err.message);
    }
  }
  Object.keys(pools).forEach(k => delete pools[k]);
}

function getPoolStats() {
  const stats = {};
  for (const [key, pool] of Object.entries(pools)) {
    stats[key] = {
      connectionsInUse: pool.connectionsInUse,
      connectionsOpen: pool.connectionsOpen,
      queueLength: pool.queueLength,
    };
  }
  return stats;
}

module.exports = {
  loadConnections,
  saveConnections,
  initPool,
  getPool,
  testConnection,
  closeAllPools,
  getPoolStats,
};
