import { BLOCKED_USER_AGENTS } from '../config/constants.js';

/**
 * Middleware to set security headers that prevent AI/crawler scraping.
 */
export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Robots-Tag', 'noai, noimageai, noarchive, nosnippet');
  res.setHeader('Permissions-Policy', 'browsing-topics=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

/**
 * Middleware to block known AI crawlers, bots, and suspicious clients.
 */
export function botBlockerMiddleware(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  const acceptHeader = req.get('Accept') || '';

  // Allow static asset requests (CSS/JS/images/etc.) to pass through.
  const staticAssetPattern = /\.(css|js|svg|png|jpg|jpeg|gif|webp|xml|ico)$/i;
  if (staticAssetPattern.test(req.path)) {
    return next();
  }

  // Allow local development/test traffic.
  const isLocalRequest =
    ['::1', '127.0.0.1'].includes(req.ip) ||
    (req.ip && req.ip.startsWith('::ffff:127.0.0.1'));
  if (isLocalRequest) {
    return next();
  }

  // Block known bot user agents
  const isBlocked = BLOCKED_USER_AGENTS.some(blockedAgent =>
    userAgent.toLowerCase().includes(blockedAgent.toLowerCase())
  );

  // Detect suspicious patterns typical of AI crawlers
  const suspiciousPatterns = [
    !userAgent,                            // No user agent
    userAgent.length < 10,                 // Too short user agent
    !acceptHeader.includes('text/html'),   // Doesn't accept HTML
    userAgent.includes('python'),          // Python requests
    userAgent.includes('curl'),            // Command line tools
    userAgent.includes('wget'),            // Download tools
    userAgent.includes('scrapy'),          // Scraping frameworks
    /^[a-f0-9-]{36}$/i.test(userAgent),   // UUID-like user agents
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern === true);

  if (isBlocked || isSuspicious) {
    console.log(`Blocked ${isSuspicious ? 'suspicious' : 'bot'} attempt: ${userAgent} from IP: ${req.ip}`);
    return res.status(403).send('Access denied for automated crawlers');
  }

  next();
}
