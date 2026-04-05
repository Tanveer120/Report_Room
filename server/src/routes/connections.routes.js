const express = require('express');
const { list, save, test, testByKey } = require('../controllers/connections.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', list);
router.post('/', save);
router.post('/test', test);
router.post('/test/:key', testByKey);

module.exports = router;
