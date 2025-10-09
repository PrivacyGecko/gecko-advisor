import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demos = [
    { input: "https://example.com", targetType: "url", slug: "exmpl", summary: "Mostly safe demo site" },
    { input: "https://demo-adtech.test", targetType: "url", slug: "adtech", summary: "Tracker-heavy demo" },
    { input: "https://mixed-content.test", targetType: "url", slug: "mixed", summary: "Dangerous mixed content" },
  ];

  for (const demo of demos) {
    await prisma.scan.upsert({
      where: { slug: demo.slug },
      update: {
        input: demo.input,
        summary: demo.summary,
        status: 'queued',
      },
      create: {
        input: demo.input,
        normalizedInput: `${demo.input}/`,
        targetType: demo.targetType,
        status: 'queued',
        slug: demo.slug,
        summary: demo.summary,
      },
    });
  }

  const lists = [
    { source: "easyprivacy", version: "demo-1", data: require("../../packages/shared/data/easyprivacy-demo.json") },
    { source: "whotracks", version: "demo-1", data: require("../../packages/shared/data/whotracks-demo.json") },
    { source: "psl", version: "public-1", data: require("../../packages/shared/data/psl-demo.json") },
  ];

  for (const list of lists) {
    await prisma.cachedList.create({ data: list });
  }

  console.log('Seed complete');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
