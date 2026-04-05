require('dotenv').config({ path: '../.env' });
const oracledb = require('oracledb');

async function run() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    });
    console.log("Connected to local DB properly.");

    await connection.execute(`ALTER TABLE reports ADD (connection_key VARCHAR2(100) DEFAULT 'default')`);
    console.log("ALTER TABLE executed successfully.");

  } catch (err) {
    if (err.message.includes('ORA-01430')) {
      console.log('Column already exists.');
    } else {
      console.error(err);
    }
  } finally {
    if (connection) {
      await connection.close();
    }
    process.exit(0);
  }
}
run();
