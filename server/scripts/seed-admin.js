require('dotenv').config();

const bcrypt = require('bcrypt');
const oracledb = require('oracledb');

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin123';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@reportroom.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const saltRounds = 10;

  const hash = await bcrypt.hash(password, saltRounds);

  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    });

    const existing = await connection.execute(
      `SELECT id FROM users WHERE username = :username`,
      { username },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existing.rows.length > 0) {
      console.log(`Admin user "${username}" already exists (id: ${existing.rows[0].ID}).`);
      return;
    }

    const result = await connection.execute(
      `INSERT INTO users (username, email, password_hash, is_active)
       VALUES (:username, :email, :hash, 1)
       RETURNING id INTO :outId`,
      { username, email, hash, outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } },
      { autoCommit: false }
    );

    const userId = result.outBinds.outId[0];

    await connection.execute(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT :userId, id FROM roles WHERE is_admin = 1 AND is_active = 1`,
      { userId },
      { autoCommit: true }
    );

    console.log(`Admin user "${username}" created successfully and assigned Admin role.`);
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

seedAdmin();
