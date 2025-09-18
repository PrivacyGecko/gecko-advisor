import type { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface Lists {
  easyprivacy: { domains: string[] };
  whotracks: { fingerprinting?: string[]; trackers?: { domain: string; category: string }[] };
}

export async function getLists(prisma: PrismaClient): Promise<Lists> {
  const lists = await prisma.cachedList.findMany();
  const easy = lists.find((l) => l.source === 'easyprivacy')?.data as any;
  const who = lists.find((l) => l.source === 'whotracks')?.data as any;
  if (!easy || !who) {
    // Fallback to bundled demo lists (read via fs for type-safety)
    const root = process.cwd();
    const e = JSON.parse(await readFile(path.resolve(root, 'packages/shared/data/easyprivacy-demo.json'), 'utf8'));
    const w = JSON.parse(await readFile(path.resolve(root, 'packages/shared/data/whotracks-demo.json'), 'utf8'));
    return { easyprivacy: e, whotracks: w } as any;
  }
  return { easyprivacy: easy, whotracks: who } as any;
}
