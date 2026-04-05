const express = require('express');
const { list, getById, create, update, remove } = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', list);
router.get('/:id', getById);
router.post('/', validate(createCategorySchema), create);
router.put('/:id', validate(updateCategorySchema), update);
router.delete('/:id', remove);

module.exports = router;
