import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";

const MAX_ATTEMPTS = 5;

function errorProperty(error: unknown, property: string): unknown {
  return typeof error === "object" && error !== null && property in error
    ? error[property as keyof typeof error]
    : undefined;
}

export function hasPrismaCode(error: unknown, code: string): boolean {
  if (errorProperty(error, "code") === code) return true;
  const cause = errorProperty(error, "cause");
  return cause !== undefined && cause !== error && hasPrismaCode(cause, code);
}

function isSerializationConflict(error: unknown): boolean {
  if (hasPrismaCode(error, "P2034")) return true;
  if (
    errorProperty(error, "originalCode") === "40001" ||
    errorProperty(error, "sqlState") === "40001"
  ) {
    return true;
  }
  const cause = errorProperty(error, "cause");
  return cause !== undefined && cause !== error && isSerializationConflict(cause);
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
      if (isSerializationConflict(error) && attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 10));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Serializable transaction retry limit reached.");
}
