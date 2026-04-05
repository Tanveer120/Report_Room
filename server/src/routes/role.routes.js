const express = require('express');
const { list, getById, create, update, remove, assignCats, getCats, removeCat } = require('../controllers/role.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createRoleSchema, updateRoleSchema, assignCategoriesSchema } = require('../validators/role.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', list);
router.get('/:id', getById);
router.post('/', validate(createRoleSchema), create);
router.put('/:id', validate(updateRoleSchema), update);
router.delete('/:id', remove);
router.post('/:id/categories', validate(assignCategoriesSchema), assignCats);
router.get('/:id/categories', getCats);
router.delete('/:roleId/categories/:catId', removeCat);

module.exports = router;
