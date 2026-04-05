const Joi = require('joi');

const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(100).required()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
    }),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  roleIds: Joi.array().items(Joi.number().integer().positive()).default([]),
});

const assignRolesSchema = Joi.object({
  roleIds: Joi.array().items(Joi.number().integer().positive()).default([]),
});

module.exports = {
  createUserSchema,
  assignRolesSchema,
};
