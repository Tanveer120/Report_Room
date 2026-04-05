const oracledb = require('oracledb');
const { getPool } = require('../../config/connection-manager');
const SqlValidator = require('./sql-validator');
const ParamBinder = require('./param-binder');
const GttManager = require('./gtt-manager');
const SqlRewriter = require('./sql-rewriter');
const { QUERY_TIMEOUT_MS } = require('../../utils/constants');

class QueryEngine {
  constructor() {
    this.validator = new SqlValidator();
    this.paramBinder = new ParamBinder();
    this.gttManager = new GttManager();
    this.sqlRewriter = new SqlRewriter();
  }

  async execute(sql, paramDefs, userParams, connectionKey = 'default') {
    this.validator.validate(sql);

    const classified = this.paramBinder.classifyParams(userParams, paramDefs);

    if (classified.needsGTT) {
      return this._executeWithGTT(sql, classified, userParams, connectionKey);
    }

    return this._executeStandard(sql, classified, connectionKey);
  }

  async _executeStandard(sql, classified, connectionKey) {
    const pool = getPool(connectionKey);
    const binds = this.paramBinder.buildBindObject(classified);
    let expandedSql = this.paramBinder.expandInClause(sql, classified);

    const connection = await pool.getConnection();
    try {
      connection.callTimeout = QUERY_TIMEOUT_MS;

      const finalBinds = this._filterUnusedBinds(expandedSql, binds);

      const result = await connection.execute(expandedSql, finalBinds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: 1000,
      });

      return {
        rows: result.rows,
        metaData: result.metaData,
        rowCount: result.rows ? result.rows.length : 0,
      };
    } finally {
      await connection.close();
    }
  }

  async _executeWithGTT(sql, classified, userParams, connectionKey) {
    const pool = getPool(connectionKey);
    const connection = await pool.getConnection();

    try {
      connection.callTimeout = QUERY_TIMEOUT_MS;

      for (const gttParam of classified.gtt) {
        await this.gttManager.insertValues(connection, gttParam.name, gttParam.values);

        sql = this.sqlRewriter.rewriteInClause(sql, gttParam.name);
      }

      const binds = this.paramBinder.buildBindObject(classified);
      const gttBinds = this.sqlRewriter.buildGttBinds(classified.gtt);
      Object.assign(binds, gttBinds);

      const finalBinds = this._filterUnusedBinds(sql, binds);

      const result = await connection.execute(sql, finalBinds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: 1000,
      });

      await connection.commit();

      return {
        rows: result.rows,
        metaData: result.metaData,
        rowCount: result.rows ? result.rows.length : 0,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      await connection.close();
    }
  }

  _filterUnusedBinds(sql, binds) {
    const filtered = {};
    for (const key of Object.keys(binds)) {
      const placeholderPattern = new RegExp(`:\\b${key}\\b`, 'i');
      if (placeholderPattern.test(sql)) {
        filtered[key] = binds[key];
      }
    }
    return filtered;
  }
}

module.exports = new QueryEngine();
