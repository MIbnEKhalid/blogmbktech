import { createRateLimiter } from 'mbkutils';

// Strict rate limiting for potential bots
export const botLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 2, // Very strict for suspicious patterns
  standardHeaders: false,
  skip: (req) => {
    const userAgent = req.get('User-Agent') || '';
    return !userAgent.toLowerCase().includes('bot') &&
           !userAgent.toLowerCase().includes('crawler') &&
           !userAgent.toLowerCase().includes('scraper');
  },
  message: 'Rate limited',
});

// General rate limiter for typical browsing/API usage
export const generalLimiter = createRateLimiter({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  errorView: 'error.hbs',
  errorLayout: false,
  message: 'Too many requests from your IP. Try again later.',
});

// Stricter rate limiter for dashboard (admin) routes
export const dashboardLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // stricter for admin/dashboard related routes
  errorView: 'error.hbs',
  errorLayout: false,
  message: 'Too many requests from your IP. Try again later.',
});

// Upload rate limiter – very strict for file uploads
export const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per IP per window
  message: 'Too many upload requests. Please try again later.',
});
