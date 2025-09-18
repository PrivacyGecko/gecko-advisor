import path from 'node:path';

type DemoListJson = {
  version?: string;
  [key: string]: unknown;
};

type JsonModule<T> = {
  default: T;
};

type JsonImportAssertion = {
  assert: {
    type: 'json';
  };
};

const JSON_ASSERTION: JsonImportAssertion = { assert: { type: 'json' } };

async function importJson<T extends DemoListJson>(relativePath: string): Promise<T> {
  const fullPath = path.resolve(process.cwd(), relativePath);
  const mod = await import(fullPath, JSON_ASSERTION);
  return (mod as JsonModule<T>).default;
}

export async function loadDemoLists() {
  const easy = await importJson('packages/shared/data/easyprivacy-demo.json');
  const who = await importJson('packages/shared/data/whotracks-demo.json');
  const psl = await importJson('packages/shared/data/psl-demo.json');
  return [
    { source: 'easyprivacy', version: easy.version ?? 'demo', data: easy },
    { source: 'whotracks', version: who.version ?? 'demo', data: who },
    { source: 'psl', version: psl.version ?? 'demo', data: psl },
  ];
}
