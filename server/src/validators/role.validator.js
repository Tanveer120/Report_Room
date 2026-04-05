const Joi = require('joi');

const createRoleSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().allow('', null),
  is_default: Joi.number().valid(0, 1).default(0),
  is_admin: Joi.number().valid(0, 1).default(0),
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().allow('', null),
  is_default: Joi.number().valid(0, 1),
  is_admin: Joi.number().valid(0, 1),
  is_active: Joi.number().valid(0, 1),
}).min(1);

const assignCategoriesSchema = Joi.object({
  categoryIds: Joi.array().items(Joi.number().integer().positive()).default([]),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  assignCategoriesSchema,
};
