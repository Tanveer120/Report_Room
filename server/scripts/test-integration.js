require('dotenv').config();

const oracledb = require('oracledb');
const { getPool, initializePool, closePool } = require('./src/config/database');
const { listRoles, createRole, updateRole, deleteRole, assignCategories, getRoleCategories } = require('./src/services/role.service');
const { listCategories, createCategory, updateCategory, deleteCategory } = require('./src/services/category.service');
const { listUsers, createUser, deleteUser, assignRoles, getUserRoles } = require('./src/services/user-admin.service');
const { canAccessReport, getUserAccessibleCategoryIds } = require('./src/services/access.service');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

async function runTests() {
  console.log('=== Report Room — Integration Tests ===\n');

  try {
    await initializePool();
    console.log('✅ Database connected\n');

    // ── T1: Role CRUD ──
    console.log('T1: Role CRUD');

    const roles1 = await listRoles();
    const initialCount = roles1.length;
    assert(initialCount >= 2, `Should have at least 2 default roles (found ${initialCount})`);

    const newRole = await createRole({ name: 'Test Role', description: 'For testing', is_default: 0 });
    assert(newRole.id && newRole.name === 'Test Role', 'Create role returns id and name');

    const roles2 = await listRoles();
    assert(roles2.length === initialCount + 1, 'Role count increased by 1');

    const updated = await updateRole(newRole.id, { name: 'Updated Role' });
    assert(updated.name === 'Updated Role', 'Update role name works');

    const fetched = await listCategories();
    // Create a temp category for assignment
    const tempCat = await createCategory({ name: 'Temp Cat', description: 'Temp' });
    await assignCategories(newRole.id, [tempCat.id]);
    const cats = await getRoleCategories(newRole.id);
    assert(cats.length === 1 && cats[0].id === tempCat.id, 'Assign categories to role works');

    await deleteRole(newRole.id);
    const roles3 = await listRoles();
    assert(roles3.length === initialCount, 'Delete role works');
    await deleteCategory(tempCat.id);

    // ── T2: Category CRUD ──
    console.log('\nT2: Category CRUD');

    const cats1 = await listCategories();
    const catCount1 = cats1.length;

    const newCat = await createCategory({ name: 'Test Category', description: 'Testing' });
    assert(newCat.id && newCat.name === 'Test Category', 'Create category returns id and name');

    const cats2 = await listCategories();
    assert(cats2.length === catCount1 + 1, 'Category count increased by 1');

    const updatedCat = await updateCategory(newCat.id, { name: 'Updated Category' });
    assert(updatedCat.name === 'Updated Category', 'Update category name works');

    await deleteCategory(newCat.id);
    const cats3 = await listCategories();
    assert(cats3.length === catCount1, 'Delete category works');

    // ── T3: User creation with role assignment ──
    console.log('\nT3: User creation with role assignment');

    const users1 = await listUsers();
    const userCount1 = users1.length;

    const newUser = await createUser({
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@test.com`,
      password: 'TestPass123',
      roleIds: [],
    });
    assert(newUser.id && newUser.username.startsWith('testuser_'), 'Create user returns id and username');
    assert(newUser.roles.length > 0, 'User gets auto-assigned default role');

    const users2 = await listUsers();
    assert(users2.length === userCount1 + 1, 'User count increased by 1');

    const roles = await listRoles();
    const nonDefaultRole = roles.find(r => !r.is_default);
    if (nonDefaultRole) {
      await assignRoles(newUser.id, [nonDefaultRole.id]);
      const userRoles = await getUserRoles(newUser.id);
      assert(userRoles.length === 1 && userRoles[0].id === nonDefaultRole.id, 'Assign roles to user works');
    }

    await deleteUser(newUser.id);
    const users3 = await listUsers();
    assert(users3.length === userCount1, 'Delete user works');

    // ── T4: Access control ──
    console.log('\nT4: Access control');

    const adminUser = users1.find(u => u.roles.some(r => r.is_admin));
    assert(adminUser, 'Admin user exists');

    // Admin should have access to all reports
    const adminAccess = await canAccessReport(adminUser.id, 1);
    assert(adminAccess === true, 'Admin can access any report');

    const adminCats = await getUserAccessibleCategoryIds(adminUser.id);
    assert(adminCats === null, 'Admin returns null for accessible categories (sees all)');

    // Test with a non-admin user
    const regularUser = users1.find(u => !u.roles.some(r => r.is_admin));
    if (regularUser) {
      const userCats = await getUserAccessibleCategoryIds(regularUser.id);
      assert(Array.isArray(userCats), 'Non-admin user gets array of accessible category IDs');

      // Create a test report with categories
      const testCat = await createCategory({ name: 'Access Test Cat' });
      const pool = getPool();
      const reportResult = await pool.execute(
        `INSERT INTO reports (name, description, sql_query, created_by, is_active)
         VALUES (:name, :desc, :sql, :createdBy, 1)
         RETURNING id INTO :outId`,
        {
          name: 'Access Test Report',
          desc: 'Testing access',
          sql: 'SELECT 1 FROM dual',
          createdBy: regularUser.id,
          outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: true }
      );
      const testReportId = reportResult.outBinds.outId[0];

      // No categories = public = accessible
      const publicAccess = await canAccessReport(regularUser.id, testReportId);
      assert(publicAccess === true, 'Report with no categories is accessible to everyone');

      // Add category that user doesn't have access to
      await pool.execute(
        `INSERT INTO report_categories (report_id, category_id) VALUES (:reportId, :catId)`,
        { reportId: testReportId, catId: testCat.id },
        { autoCommit: true }
      );
      const restrictedAccess = await canAccessReport(regularUser.id, testReportId);
      assert(restrictedAccess === false, 'Report with inaccessible category is blocked');

      // Clean up
      await pool.execute(`DELETE FROM report_categories WHERE report_id = :id`, { id: testReportId });
      await pool.execute(`DELETE FROM reports WHERE id = :id`, { id: testReportId });
      await pool.execute(`DELETE FROM categories WHERE id = :id`, { id: testCat.id });
      await pool.execute(`COMMIT`);
    }

    // ── Summary ──
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    process.exitCode = failed > 0 ? 1 : 0;
  } catch (err) {
    console.error('\n❌ Test suite error:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

runTests();
