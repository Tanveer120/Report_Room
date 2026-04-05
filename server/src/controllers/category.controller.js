const {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../services/category.service');
const asyncHandler = require('../utils/async-handler');

const list = asyncHandler(async (req, res) => {
  const categories = await listCategories();
  res.json({ success: true, data: categories });
});

const getById = asyncHandler(async (req, res) => {
  const category = await getCategoryById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, error: { message: 'Category not found' } });
  }
  res.json({ success: true, data: category });
});

const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await createCategory({ name, description });
  res.status(201).json({ success: true, data: category });
});

const update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await updateCategory(req.params.id, { name, description });
  res.json({ success: true, data: category });
});

const remove = asyncHandler(async (req, res) => {
  await deleteCategory(req.params.id);
  res.json({ success: true, message: 'Category deleted successfully' });
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
