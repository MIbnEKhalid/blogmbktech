import rateLimit from 'express-rate-limit';

// Strict rate limiting for potential bots
export const botLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 2, // Very strict for suspicious patterns
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req) => {
    const userAgent = req.get('User-Agent') || '';
    // Apply strict limits to suspicious user agents
    return !userAgent.toLowerCase().includes('bot') &&
           !userAgent.toLowerCase().includes('crawler') &&
           !userAgent.toLowerCase().includes('scraper');
  },
  handler: (req, res) => {
    res.status(429).send('Rate limited');
  }
});

// General rate limiter for typical browsing/API usage
export const generalLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).render('error.handlebars', {
      message: 'Too many requests from your IP. Try again later.',
      code: 429
    });
  }
});

// Stricter rate limiter for dashboard (admin) routes
export const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // stricter for admin/dashboard related routes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render('error.handlebars', {
      message: 'Too many requests from your IP. Try again later.',
      code: 429
    });
  }
});

// Upload rate limiter – very strict for file uploads
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests. Please try again later.' },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many upload requests. Please try again later.' });
  }
});
