import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import mbkauthe, { sessPerm } from 'mbkauthe';
import { engine } from 'express-handlebars';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { VIEWS_DIR, PUBLIC_DIR } from './config/constants.js';
import { loggingMiddleware } from './middleware/logging.js';
import { securityHeadersMiddleware, botBlockerMiddleware } from './middleware/bot-blocker.js';
import { botLimiter, generalLimiter, dashboardLimiter } from './middleware/rate-limiter.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { handlebarsHelpers } from './utils/handlebars-helpers.js';
import { blogRouter, dashboardRouter, postsRouter, commentsRouter, categoriesRouter, tagsRouter, mediaRouter, aiRouter } from './routes/index.js';

import { createBucketRouter } from "mbkbucket";
import { Permissions } from './permissions.js';

dotenv.config();

const server = express();
server.set('trust proxy', 1);

// Request logging
server.use(loggingMiddleware);

// Security headers
server.use(securityHeadersMiddleware);

// Compression
server.use(compression());

// Bot / AI crawler blocking
server.use(botBlockerMiddleware);

// Strict rate limiting for bots
server.use(botLimiter);

// Serve static assets
server.use(['/assets', '/Assets'], express.static(path.join(PUBLIC_DIR, 'assets'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (
      filePath.endsWith('.js') ||
      filePath.endsWith('.css') ||
      filePath.endsWith('.png') ||
      filePath.endsWith('.jpg') ||
      filePath.endsWith('.svg')
    ) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

// Serve static sitemaps from public directory
server.use('/', express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.xml')) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cookieParser());

// Session middleware (mbkauthe)
server.use(mbkauthe);

server.use((req, res, next) => {
  const rawProfileImg = req.cookies?.profile_image_url || req.session?.user?.image;
  res.locals.profile_image_url = (rawProfileImg && rawProfileImg !== 'default') ? rawProfileImg : null;
  res.locals.user = req.session?.user || null;
  res.locals.isLogin = !!req.session?.user;
  res.locals.issuperadmin = req.session?.user?.role === 'superadmin';
  next();
});

// Configure Handlebars engine
server.engine('handlebars', engine({
  extname: '.handlebars',
  defaultLayout: 'main',
  partialsDir: [
    path.join(VIEWS_DIR, 'templates'),
    path.join(VIEWS_DIR, 'templates/notice'),
    VIEWS_DIR,
    path.join(VIEWS_DIR, 'partials'),
    path.join(process.cwd(), 'node_modules/mbkauthe/views'),
    path.join(process.cwd(), 'node_modules/mbkbucket/views'),
  ],
  cache: process.env.NODE_ENV === 'production',
  helpers: handlebarsHelpers
}));

server.set('view engine', 'handlebars');
server.set('views', [
  VIEWS_DIR,
  path.join(process.cwd(), 'node_modules/mbkauthe/views'),
  path.join(process.cwd(), 'node_modules/mbkbucket/views'),

]);

// Apply general limiter to application routes (after static assets)
server.use(generalLimiter);

import { createHealthRouter } from "mbkhealth";

// Health check & test endpoints
server.use("/api/health", createHealthRouter({
  appName: "blogmbktech",
  app: server,
}));
server.get("/health", (req, res) => res.redirect("/api/health"));

// Blog routes
server.use(blogRouter);

// Dashboard feature routes (stricter limiter; each route file carries its own
// sessPerm guard, so access is permission-based rather than role-based).
server.use( '/dashboard', dashboardLimiter, dashboardRouter, postsRouter, commentsRouter, categoriesRouter, tagsRouter, mediaRouter, aiRouter);

server.use(createBucketRouter({
  authorization: {
    view: sessPerm(Permissions.storage.view),
    upload: sessPerm(Permissions.storage.upload),
    delete: sessPerm(Permissions.storage.delete),
  },
}));

// 404 handler
server.use(notFoundHandler);

// Global error handler
server.use(errorHandler);

export default server;
