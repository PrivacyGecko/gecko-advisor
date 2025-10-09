import type { Prisma, PrismaClient } from "@prisma/client";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const generate = customAlphabet(alphabet, 8);

export async function createScanWithSlug(
  prisma: PrismaClient,
  data: Omit<Prisma.ScanCreateInput, 'slug'>,
  maxAttempts = 5
) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    const slug = generate();
    try {
      return await prisma.scan.create({
        data: {
          ...data,
          slug,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Unable to generate unique slug for scan');
}

