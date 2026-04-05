const {
  listUsers,
  getUserById,
  createUser,
  deleteUser,
  assignRoles,
  getUserRoles,
  removeRole,
} = require('../services/user-admin.service');
const asyncHandler = require('../utils/async-handler');

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 8;
  const search = req.query.search || '';

  const result = await listUsers({ page, pageSize, search });
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }
  res.json({ success: true, data: user });
});

const create = asyncHandler(async (req, res) => {
  const { username, email, password, roleIds } = req.body;
  const user = await createUser({ username, email, password, roleIds });
  res.status(201).json({ success: true, data: user });
});

const remove = asyncHandler(async (req, res) => {
  await deleteUser(req.params.id);
  res.json({ success: true, message: 'User deleted successfully' });
});

const assignUserRoles = asyncHandler(async (req, res) => {
  const { roleIds } = req.body;
  const user = await assignRoles(req.params.id, roleIds || []);
  res.json({ success: true, data: user });
});

const getUserRolesList = asyncHandler(async (req, res) => {
  const roles = await getUserRoles(req.params.id);
  res.json({ success: true, data: roles });
});

const removeUserRole = asyncHandler(async (req, res) => {
  await removeRole(req.params.userId, req.params.roleId);
  res.json({ success: true, message: 'Role removed from user' });
});

module.exports = {
  list,
  getById,
  create,
  remove,
  assignUserRoles,
  getUserRolesList,
  removeUserRole,
};
