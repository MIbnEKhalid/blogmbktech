import { isJsonRequest, sendError, sanitizeErrorDetails } from "mbkauthe";

/**
 * 404 Not Found handler – must be registered after all routes.
 */
export function notFoundHandler(req, res) {
  if (isJsonRequest(req)) {
    return sendError(res, "Page not found", {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      req,
    });
  }
  res.status(404).render('error.handlebars', { message: 'Page not found', code: 404 });
}

/**
 * Global error handler – must be registered last with four parameters.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error('Unhandled error:', err);
  const status = Number(err.status || err.statusCode || 500);
  const message = err.message || 'Internal Server Error';

  if (isJsonRequest(req)) {
    return sendError(res, err, {
      statusCode: status,
      req,
      details: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }

  const sanitizedDetails = err.message ? sanitizeErrorDetails(err.message) : undefined;
  res.status(status).render('error.handlebars', {
    message,
    code: status,
    ...(sanitizedDetails ? { details: sanitizedDetails } : {}),
  });
}

export default {
  notFoundHandler,
  errorHandler,
};
