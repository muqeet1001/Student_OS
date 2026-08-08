import path from 'node:path';
import { existsSync } from 'node:fs';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from './config/env.js';
import { routes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Railway/nginx) so rate limiting sees real client IPs.
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!config.isProduction) {
    app.use(morgan('dev'));
  }

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please slow down' },
    }),
  );

  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', env: config.env, uptime: process.uptime() },
    });
  });

  app.use('/api', routes);

  /*
   * In production the API also serves the built client, so the whole app
   * deploys as one service on one origin — which also means the refresh
   * cookie is same-site and no CORS preflight is involved.
   *
   * Registered after /api so an unknown API path still returns JSON 404
   * rather than the SPA shell.
   */
  if (config.isProduction) {
    const clientDist = path.resolve(config.serverRoot, '../client/dist');

    if (existsSync(clientDist)) {
      // Hashed assets are immutable; index.html must never be cached or
      // users keep booting a stale build after a deploy.
      app.use(
        express.static(clientDist, {
          maxAge: '1y',
          index: false,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
          },
        }),
      );

      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
        // sendFile bypasses the static handler's setHeaders, so the shell's
        // no-cache rule has to be repeated here or a deploy leaves users on
        // an old build that references deleted asset hashes.
        res.setHeader('Cache-Control', 'no-cache');
        return res.sendFile(path.join(clientDist, 'index.html'));
      });
    } else {
      logger.warn(`Client build not found at ${clientDist} — serving the API only`);
    }
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
