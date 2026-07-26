import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";

const globalForPrisma = globalThis as typeof globalThis & {
  naturePowerPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.naturePowerPrisma) {
    return globalForPrisma.naturePowerPrisma;
  }

  const adapter = new PrismaPg({
    connectionString: getServerEnv().DATABASE_URL,
  });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.naturePowerPrisma = client;
  }

  return client;
}
