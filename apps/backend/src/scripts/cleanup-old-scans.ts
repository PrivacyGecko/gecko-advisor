#!/usr/bin/env tsx
/**
 * Cleanup script to delete scans with incorrect scores from old algorithm
 * Run with: npx tsx apps/backend/src/scripts/cleanup-old-scans.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOldScans() {
  console.log('🧹 Starting cleanup of old scans with incorrect scores...\n');

  // Option 1: Delete specific scans by slug
  const slugsToDelete = ['g8b7fYfR', '1gKJj_']; // Old GitHub and X.com scans

  console.log(`Deleting scans with slugs: ${slugsToDelete.join(', ')}`);

  const deleteResult = await prisma.scan.deleteMany({
    where: {
      slug: {
        in: slugsToDelete
      }
    }
  });

  console.log(`✅ Deleted ${deleteResult.count} scans\n`);

  // Option 2: Delete all scans before the scoring algorithm fix
  // Uncomment to use this instead:
  /*
  const cutoffDate = new Date('2025-10-06T08:40:00Z'); // Before new algorithm deployment

  console.log(`Deleting scans created before: ${cutoffDate.toISOString()}`);

  const deleteResult = await prisma.scan.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });

  console.log(`✅ Deleted ${deleteResult.count} scans\n`);
  */

  // Show remaining scans
  const remainingScans = await prisma.scan.findMany({
    select: {
      slug: true,
      input: true,
      score: true,
      label: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log('📊 Remaining recent scans:');
  console.table(remainingScans.map(s => ({
    slug: s.slug,
    url: s.input,
    score: s.score,
    label: s.label,
    created: s.createdAt.toISOString()
  })));

  await prisma.$disconnect();
}

cleanupOldScans()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  });
