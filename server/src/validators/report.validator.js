const Joi = require('joi');

const paramSchema = Joi.object({
  param_name: Joi.string().min(1).max(100).required(),
  param_label: Joi.string().min(1).max(255).required(),
  param_type: Joi.string().valid('text', 'number', 'date', 'multi_value', 'select').required(),
  placeholder: Joi.string().max(255).allow('', null),
  is_required: Joi.number().valid(0, 1).default(1),
  default_value: Joi.string().allow('', null),
  options_json: Joi.string().allow('', null),
  sort_order: Joi.number().default(0),
});

const createReportSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow('', null),
  sql_query: Joi.string().min(1).required(),
  params: Joi.array().items(paramSchema).default([]),
  categoryIds: Joi.array().items(Joi.number().integer().positive()).default([]),
  connection_key: Joi.string().max(100).default('default'),
});

const updateReportSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  description: Joi.string().allow('', null),
  sql_query: Joi.string().min(1),
  params: Joi.array().items(paramSchema),
  categoryIds: Joi.array().items(Joi.number().integer().positive()),
  connection_key: Joi.string().max(100),
}).min(1);

module.exports = {
  createReportSchema,
  updateReportSchema,
};
