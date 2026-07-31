import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";

const globalForPrisma = globalThis as typeof globalThis & {
  nexGenPowerPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.nexGenPowerPrisma) {
    return globalForPrisma.nexGenPowerPrisma;
  }

  const adapter = new PrismaPg({
    connectionString: getServerEnv().DATABASE_URL,
  });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.nexGenPowerPrisma = client;
  }

  return client;
}
