import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";

const MAX_ATTEMPTS = 3;

export function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function runSerializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const prisma = getPrisma();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (hasPrismaCode(error, "P2034") && attempt < MAX_ATTEMPTS) continue;
      throw error;
    }
  }
  throw new Error("Serializable transaction retry limit reached.");
}
