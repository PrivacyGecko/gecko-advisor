import path from 'node:path';
import type { Prisma } from '@prisma/client';

const JSON_ASSERTION = { assert: { type: 'json' as const } };

async function importJson(relativePath: string): Promise<Prisma.InputJsonValue> {
  const fullPath = path.resolve(process.cwd(), relativePath);
  const mod = await import(fullPath, JSON_ASSERTION);
  return (mod as { default: Prisma.InputJsonValue }).default;
}

const extractVersion = (value: Prisma.InputJsonValue): string => {
  if (typeof value === 'object' && value !== null && 'version' in value) {
    const version = (value as Record<string, unknown>).version;
    if (typeof version === 'string') return version;
  }
  return 'demo';
};

export type DemoListRecord = {
  source: string;
  version: string;
  data: Prisma.InputJsonValue;
};

export async function loadDemoLists(): Promise<DemoListRecord[]> {
  const easy = await importJson('packages/shared/data/easyprivacy-demo.json');
  const who = await importJson('packages/shared/data/whotracks-demo.json');
  const psl = await importJson('packages/shared/data/psl-demo.json');
  return [
    { source: 'easyprivacy', version: extractVersion(easy), data: easy },
    { source: 'whotracks', version: extractVersion(who), data: who },
    { source: 'psl', version: extractVersion(psl), data: psl },
  ];
}
