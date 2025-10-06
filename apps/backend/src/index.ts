import type { Server } from "node:http";
import { createServer } from "./server.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { closeQueueConnections } from "./queue.js";
import { connectDatabase, disconnectDatabase } from "./prisma.js";
import { disconnectCache } from "./cache.js";

export const app = createServer();

if (!process.env.VITEST_WORKER_ID) {
  let server: Server | undefined;

  const start = async () => {
    try {
      // Initialize database connection
      await connectDatabase();

      server = app.listen(config.port, () => {
        logger.info({ port: config.port }, 'Backend listening');
      });
    } catch (error) {
      logger.error({ error }, 'Failed to start backend');
      process.exit(1);
    }
  };

  type ShutdownSignal = 'SIGINT' | 'SIGTERM';
  const shutdown = async (signal: ShutdownSignal) => {
    logger.info({ signal }, 'Shutting down backend');
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
    }
    await Promise.allSettled([
      closeQueueConnections(),
      disconnectDatabase(),
      disconnectCache(),
    ]);
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  void start();
}

