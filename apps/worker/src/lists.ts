import type { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface Lists {
  easyprivacy: EasyList;
  whotracks: WhoTracksList;
}

type EasyList = {
  domains: string[];
};

type WhoTracksList = {
  fingerprinting?: string[];
  trackers?: { domain: string; category: string }[];
};

type JsonList = {
  domains?: unknown;
  fingerprinting?: unknown;
  trackers?: unknown;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeEasyList = (raw: unknown): EasyList | null => {
  if (!isRecord(raw)) return null;
  const domains = Array.isArray(raw.domains)
    ? raw.domains.filter((item): item is string => typeof item === 'string')
    : [];
  return { domains };
};

const normalizeWhoTracksList = (raw: unknown): WhoTracksList | null => {
  if (!isRecord(raw)) return null;

  const fingerprinting = Array.isArray(raw.fingerprinting)
    ? raw.fingerprinting.filter((item): item is string => typeof item === 'string')
    : undefined;

  const trackers = Array.isArray(raw.trackers)
    ? raw.trackers
        .map((entry) =>
          isRecord(entry) && typeof entry.domain === 'string' && typeof entry.category === 'string'
            ? { domain: entry.domain, category: entry.category }
            : null,
        )
        .filter((entry): entry is { domain: string; category: string } => entry !== null)
    : undefined;

  return { fingerprinting, trackers };
};

async function readJson(relativePath: string): Promise<JsonList> {
  const absolute = path.resolve(process.cwd(), relativePath);
  const content = await readFile(absolute, 'utf8');
  return JSON.parse(content) as JsonList;
}

// In-memory cache for privacy lists (refreshed every 5 minutes)
let listsCache: { data: Lists; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getLists(prisma: PrismaClient): Promise<Lists> {
  // Return cached lists if still fresh
  if (listsCache && Date.now() - listsCache.timestamp < CACHE_TTL_MS) {
    return listsCache.data;
  }

  const lists = await prisma.cachedList.findMany();
  const easyStored = lists.find((list) => list.source === 'easyprivacy')?.data;
  const whoStored = lists.find((list) => list.source === 'whotracks')?.data;

  const easy = normalizeEasyList(easyStored);
  const who = normalizeWhoTracksList(whoStored);

  let result: Lists;

  if (easy && who) {
    result = { easyprivacy: easy, whotracks: who };
  } else {
    const fallbackEasy = normalizeEasyList(await readJson('packages/shared/data/easyprivacy-demo.json'));
    const fallbackWho = normalizeWhoTracksList(await readJson('packages/shared/data/whotracks-demo.json'));

    if (!fallbackEasy || !fallbackWho) {
      throw new Error('Failed to load privacy lists');
    }

    result = { easyprivacy: fallbackEasy, whotracks: fallbackWho };
  }

  // Cache the result
  listsCache = { data: result, timestamp: Date.now() };
  return result;
}
