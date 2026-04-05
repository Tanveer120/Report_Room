const express = require('express');
const { list, getById, create, remove, assignUserRoles, getUserRolesList, removeUserRole } = require('../controllers/user-admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createUserSchema, assignRolesSchema } = require('../validators/user-admin.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', list);
router.get('/:id', getById);
router.post('/', validate(createUserSchema), create);
router.delete('/:id', remove);
router.post('/:id/roles', validate(assignRolesSchema), assignUserRoles);
router.get('/:id/roles', getUserRolesList);
router.delete('/:userId/roles/:roleId', removeUserRole);

module.exports = router;
