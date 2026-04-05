const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().allow('', null),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().allow('', null),
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
