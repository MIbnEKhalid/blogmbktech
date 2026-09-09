/**
 * HTTP request logging middleware.
 * Logs method, URL, status code, and response duration.
 */
export function loggingMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
  });
  next();
}
