import path from 'node:path';

export async function loadDemoLists() {
  const root = process.cwd();
  const easy = await import(path.resolve(root, 'packages/shared/data/easyprivacy-demo.json'), { assert: { type: 'json' } } as any);
  const who = await import(path.resolve(root, 'packages/shared/data/whotracks-demo.json'), { assert: { type: 'json' } } as any);
  const psl = await import(path.resolve(root, 'packages/shared/data/psl-demo.json'), { assert: { type: 'json' } } as any);
  return [
    { source: 'easyprivacy', version: easy.default.version || 'demo', data: easy.default },
    { source: 'whotracks', version: who.default.version || 'demo', data: who.default },
    { source: 'psl', version: psl.default.version || 'demo', data: psl.default }
  ];
}
