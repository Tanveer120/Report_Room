const express = require('express');
const { login, refresh, me } = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { loginSchema, refreshSchema } = require('../validators/auth.validator');

const router = express.Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.get('/me', authenticate, me);

module.exports = router;
