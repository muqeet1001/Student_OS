import fs from 'node:fs';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  fs.mkdirSync(config.uploadsDir, { recursive: true });

  await connectDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.success(`Student OS API listening on http://localhost:${config.port} [${config.env}]`);
    if (!config.ai.enabled) {
      logger.warn('AI_API_KEY not set — AI features will use the offline mock provider');
    }
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force-exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error.message);
  process.exit(1);
});
