import type { PrismaClient } from "@prisma/client";
import { config } from "../config.js";

export async function findReusableScan(prisma: PrismaClient, normalizedInput: string) {
  const since = new Date(Date.now() - config.cacheTtlMs);
  return prisma.scan.findFirst({
    where: {
      normalizedInput,
      status: 'done',
      finishedAt: {
        gte: since,
      },
    },
    orderBy: {
      finishedAt: 'desc',
    },
  });
}
