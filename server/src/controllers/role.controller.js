const {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignCategories,
  getRoleCategories,
  removeCategory,
} = require('../services/role.service');
const asyncHandler = require('../utils/async-handler');

const list = asyncHandler(async (req, res) => {
  const roles = await listRoles();
  res.json({ success: true, data: roles });
});

const getById = asyncHandler(async (req, res) => {
  const role = await getRoleById(req.params.id);
  if (!role) {
    return res.status(404).json({ success: false, error: { message: 'Role not found' } });
  }
  res.json({ success: true, data: role });
});

const create = asyncHandler(async (req, res) => {
  const { name, description, is_default, is_admin } = req.body;
  const role = await createRole({ name, description, is_default, is_admin });
  res.status(201).json({ success: true, data: role });
});

const update = asyncHandler(async (req, res) => {
  const { name, description, is_default, is_admin, is_active } = req.body;
  const role = await updateRole(req.params.id, { name, description, is_default, is_admin, is_active });
  res.json({ success: true, data: role });
});

const remove = asyncHandler(async (req, res) => {
  await deleteRole(req.params.id);
  res.json({ success: true, message: 'Role deleted successfully' });
});

const assignCats = asyncHandler(async (req, res) => {
  const { categoryIds } = req.body;
  await assignCategories(req.params.id, categoryIds || []);
  const categories = await getRoleCategories(req.params.id);
  res.json({ success: true, data: categories });
});

const getCats = asyncHandler(async (req, res) => {
  const categories = await getRoleCategories(req.params.id);
  res.json({ success: true, data: categories });
});

const removeCat = asyncHandler(async (req, res) => {
  await removeCategory(req.params.roleId, req.params.catId);
  res.json({ success: true, message: 'Category removed from role' });
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  assignCats,
  getCats,
  removeCat,
};
