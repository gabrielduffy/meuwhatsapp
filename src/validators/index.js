/**
 * Middleware de validação Zod
 * Valida body, query ou params de acordo com schema
 */

const { AppError } = require('../middlewares/errorHandler');

/**
 * Valida o body da requisição
 */
const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error); // Zod error será tratado pelo errorHandler
  }
};

/**
 * Valida query parameters
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Valida params da URL
 */
const validateParams = (schema) => (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};
