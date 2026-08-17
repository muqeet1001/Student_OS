import path from 'node:path';
import { existsSync } from 'node:fs';

import express from 'express';
import mongoose from 'mongoose';
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

/** mongoose.connection.readyState, in words rather than as a magic number. */
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Railway/nginx) so rate limiting sees real client IPs.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // MediaPipe compiles the self-hosted detector WebAssembly in the
      // browser. `wasm-unsafe-eval` permits only Wasm compilation; ordinary
      // string eval remains blocked by the rest of Helmet's default policy.
      contentSecurityPolicy: {
        directives: { scriptSrc: ["'self'", "'wasm-unsafe-eval'"] },
      },
    }),
  );
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

  /*
   * Request logging in production too, not only development.
   *
   * It used to be dev-only, which left a deployed instance with no access log
   * at all — no way to answer "was that request even received", "which
   * endpoint is slow", or "what was being hit when it fell over". The
   * combined format is what log shippers expect; health checks are dropped
   * because an orchestrator polling every few seconds would otherwise be most
   * of the log.
   */
  app.use(
    morgan(config.isProduction ? 'combined' : 'dev', {
      skip: (req) => req.path.startsWith('/api/health'),
      stream: { write: (line) => logger.info(line.trimEnd()) },
    }),
  );

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

  /*
   * Liveness and readiness are deliberately separate endpoints.
   *
   * Liveness answers "is this process alive" — if it stops answering, the
   * orchestrator should restart the container. It must not depend on the
   * database: a Mongo outage is not fixed by killing every API pod, and
   * wiring a restart to it turns a recoverable database blip into a crash
   * loop across the whole fleet.
   *
   * Readiness answers "should traffic be routed here", which the database
   * absolutely does gate — an instance that cannot reach Mongo serves
   * nothing but 500s, and a load balancer needs to know that. This is the
   * one to point a load balancer's health check at.
   */
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', env: config.env, uptime: process.uptime() },
    });
  });

  app.get('/api/health/ready', (_req, res) => {
    // 1 is `connected`; 2 is `connecting`, which is not ready yet.
    const connected = mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({
      success: connected,
      data: {
        status: connected ? 'ready' : 'not-ready',
        database: DB_STATES[mongoose.connection.readyState] ?? 'unknown',
        env: config.env,
        uptime: process.uptime(),
      },
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
