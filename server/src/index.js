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

  /*
   * A rejected promise nobody handled is a bug, but it is not proof the
   * process is unusable — it is usually one request's error path. Log it
   * loudly and keep serving the other users; crashing the whole instance
   * because one handler forgot a catch is a worse outcome than the bug.
   */
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason instanceof Error ? reason.stack : reason);
  });

  /*
   * An uncaught exception is different: the stack that threw is gone and
   * whatever it was part-way through is now in an unknown state. Node's own
   * guidance is to treat the process as unrecoverable. So this logs, stops
   * accepting new connections, and exits non-zero for the supervisor to
   * restart — rather than the previous behaviour, which was to let the
   * default handler kill the process with no log line explaining why.
   */
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception — shutting down:', error?.stack || error);
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5_000).unref();
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error.message);
  process.exit(1);
});
