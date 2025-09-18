import type { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface Lists {
  easyprivacy: { domains: string[] };
  whotracks: { fingerprinting?: string[]; trackers?: { domain: string; category: string }[] };
}

type JsonList = {
  domains?: string[];
  fingerprinting?: string[];
  trackers?: { domain?: unknown; category?: unknown }[];
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeList = (raw: unknown): Lists['easyprivacy'] | Lists['whotracks'] | null => {
  if (!isRecord(raw)) return null;
  const domains = Array.isArray(raw.domains) ? raw.domains.filter((d): d is string => typeof d === 'string') : [];
  const trackers = Array.isArray(raw.trackers)
    ? raw.trackers
        .map((t) => (isRecord(t) && typeof t.domain === 'string' && typeof t.category === 'string'
            ? { domain: t.domain, category: t.category }
            : null))
        .filter((t): t is { domain: string; category: string } => Boolean(t))
    : undefined;
  const fingerprinting = Array.isArray(raw.fingerprinting)
    ? raw.fingerprinting.filter((f): f is string => typeof f === 'string')
    : undefined;
  return { domains, trackers, fingerprinting };
};

async function readJson(relativePath: string): Promise<JsonList> {
  const absolute = path.resolve(process.cwd(), relativePath);
  const content = await readFile(absolute, 'utf8');
  return JSON.parse(content) as JsonList;
}

export async function getLists(prisma: PrismaClient): Promise<Lists> {
  const lists = await prisma.cachedList.findMany();
  const easyStored = lists.find((l) => l.source === 'easyprivacy')?.data;
  const whoStored = lists.find((l) => l.source === 'whotracks')?.data;

  const easy = normalizeList(easyStored);
  const who = normalizeList(whoStored);

  if (easy && who) return { easyprivacy: easy, whotracks: who };

  const fallbackEasy = normalizeList(await readJson('packages/shared/data/easyprivacy-demo.json'));
  const fallbackWho = normalizeList(await readJson('packages/shared/data/whotracks-demo.json'));

  if (!fallbackEasy || !fallbackWho) {
    throw new Error('Failed to load privacy lists');
  }

  return { easyprivacy: fallbackEasy, whotracks: fallbackWho };
}
