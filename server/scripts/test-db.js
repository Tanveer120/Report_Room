require('dotenv').config();

const oracledb = require('oracledb');

async function testConnectivity() {
  console.log('=== Report Room — Database Connectivity Test ===\n');

  const config = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  };

  if (!config.user || !config.password || !config.connectString) {
    console.error('ERROR: Missing Oracle connection environment variables.');
    console.error('Set ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECT_STRING in .env');
    process.exit(1);
  }

  let connection;
  try {
    console.log('1. Testing direct connection...');
    connection = await oracledb.getConnection(config);
    console.log('   Connected successfully.\n');

    console.log('2. Fetching Oracle version...');
    const versionResult = await connection.execute(
      `SELECT banner FROM v$version WHERE banner LIKE 'Oracle%'`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (versionResult.rows.length > 0) {
      console.log(`   ${versionResult.rows[0].BANNER}\n`);
    }

    console.log('3. Testing connection pool...');
    const pool = await oracledb.createPool({
      ...config,
      poolMin: 2,
      poolMax: 5,
      poolIncrement: 1,
      poolTimeout: 10,
    });
    console.log(`   Pool created (min: ${pool.poolMin}, max: ${pool.poolMax})\n`);

    console.log('4. Testing pool stats...');
    console.log(`   Connections in use: ${pool.connectionsInUse}`);
    console.log(`   Connections open:   ${pool.connectionsOpen}`);
    console.log(`   Queue length:       ${pool.queueLength}\n`);

    console.log('5. Testing concurrent connections...');
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        (async (id) => {
          let conn;
          try {
            conn = await pool.getConnection();
            const r = await conn.execute(`SELECT ${id} AS test_val FROM dual`);
            return r.rows[0][0];
          } finally {
            if (conn) await conn.close();
          }
        })(i + 1)
      );
    }
    const results = await Promise.all(promises);
    console.log(`   Concurrent results: ${results.join(', ')}\n`);

    console.log('6. Checking if tables exist...');
    const tables = await connection.execute(
      `SELECT table_name FROM user_tables ORDER BY table_name`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (tables.rows.length > 0) {
      console.log('   Found tables:');
      tables.rows.forEach(row => console.log(`     - ${row.TABLE_NAME}`));
    } else {
      console.log('   No tables found (run scripts/01_create_tables.sql first)');
    }
    console.log('');

    console.log('7. Checking if GTT exists...');
    const gttCheck = await connection.execute(
      `SELECT table_name FROM user_tables WHERE table_name = 'GTT_FILTER_VALUES'`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (gttCheck.rows.length > 0) {
      console.log('   GTT gtt_filter_values exists.\n');
    } else {
      console.log('   GTT gtt_filter_values NOT found (run scripts/02_create_gtt.sql first)\n');
    }

    console.log('8. Checking role/category tables...');
    const roleTables = await connection.execute(
      `SELECT table_name FROM user_tables WHERE table_name IN ('ROLES','CATEGORIES','ROLE_CATEGORIES','USER_ROLES','REPORT_CATEGORIES') ORDER BY table_name`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (roleTables.rows.length === 5) {
      console.log('   All role/category tables exist:');
      roleTables.rows.forEach(row => console.log(`     - ${row.TABLE_NAME}`));
      console.log('');
    } else {
      console.log(`   Missing role/category tables (found ${roleTables.rows.length}/5). Run scripts/04_create_roles_tables.sql\n`);
    }

    console.log('=== All connectivity tests passed ===');
  } catch (err) {
    console.error(`\nERROR: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.close();
    }
    try {
      await oracledb.getPool()?.close(5);
    } catch {
      // pool may not exist
    }
  }
}

testConnectivity();
