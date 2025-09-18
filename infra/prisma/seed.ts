import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed demo targets by creating queued scans with fixed slugs
  const demos = [
    { input: 'https://example.com', targetType: 'url', reportSlug: 'exmpl', summary: 'Mostly safe demo site' },
    { input: 'https://demo-adtech.test', targetType: 'url', reportSlug: 'adtech', summary: 'Tracker-heavy demo' },
    { input: 'https://mixed-content.test', targetType: 'url', reportSlug: 'mixed', summary: 'Dangerous mixed content' },
  ];

  for (const d of demos) {
    await prisma.scan.upsert({
      where: { reportSlug: d.reportSlug },
      update: {},
      create: {
        input: d.input,
        targetType: d.targetType,
        status: 'queued',
        reportSlug: d.reportSlug,
        summary: d.summary,
      },
    });
  }

  // Seed cached lists from embedded fixtures (kept in packages/shared/data)
  const lists = [
    { source: 'easyprivacy', version: 'demo-1', data: require('../../packages/shared/data/easyprivacy-demo.json') },
    { source: 'whotracks', version: 'demo-1', data: require('../../packages/shared/data/whotracks-demo.json') },
    { source: 'psl', version: 'public-1', data: require('../../packages/shared/data/psl-demo.json') },
  ];

  for (const l of lists) {
    await prisma.cachedList.create({ data: l });
  }

  console.log('Seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
