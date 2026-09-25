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
  const userAgent = (req.get('User-Agent') || '').trim();

  // Allow static asset requests (CSS/JS/images/fonts/etc.) to pass through.
  const staticAssetPattern = /\.(css|js|mjs|svg|png|jpg|jpeg|gif|webp|xml|ico|woff|woff2|ttf|eot|json|map)$/i;
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

  const userAgentLower = userAgent.toLowerCase();

  // Block known bot user agents
  const isBlocked = BLOCKED_USER_AGENTS.some(blockedAgent =>
    userAgentLower.includes(blockedAgent.toLowerCase())
  );

  // Detect suspicious crawler/scraping tool patterns
  const suspiciousTools = [
    'python-requests',
    'python-urllib',
    'aiohttp',
    'scrapy',
    'curl/',
    'wget/',
    'httpie',
    'postmanruntime',
    'go-http-client'
  ];

  const isSuspiciousTool = suspiciousTools.some(tool => userAgentLower.includes(tool));
  const isSuspicious = !userAgent || userAgent.length < 5 || /^[a-f0-9-]{36}$/i.test(userAgent) || isSuspiciousTool;

  if (isBlocked || isSuspicious) {
    console.log(`Blocked ${isSuspicious ? 'suspicious' : 'bot'} attempt: ${userAgent} from IP: ${req.ip}`);
    return res.status(403).send('Access denied for automated crawlers');
  }

  next();
}
