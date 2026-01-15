/**
 * Middleware de validação utilizando Zod
 */
const { AppError } = require('./errorHandler');

const validate = (schema) => (req, res, next) => {
    try {
        const data = schema.parse({
            ...req.body,
            ...req.params,
            ...req.query
        });

        // Mesclar dados validados de volta no req.body
        req.body = { ...req.body, ...data };
        next();
    } catch (error) {
        next(error); // O errorHandler já trata ZodError
    }
};

module.exports = { validate };
