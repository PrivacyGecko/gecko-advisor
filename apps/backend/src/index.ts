import type { Server } from "node:http";
import { createServer } from "./server.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { closeQueueConnections } from "./queue.js";
import { prisma } from "./prisma.js";

export const app = createServer();

if (!process.env.VITEST_WORKER_ID) {
  let server: Server | undefined;

  const start = () => {
    server = app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Backend listening');
    });
  };

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'Shutting down backend');
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
    }
    await Promise.allSettled([
      closeQueueConnections(),
      prisma.$disconnect(),
    ]);
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  start();
}

