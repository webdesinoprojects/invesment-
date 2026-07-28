import "server-only";

import { createHash } from "node:crypto";

import { getPrisma } from "@/lib/db/prisma";

import { runSerializable } from "../shared/transaction";
import {
  ADMIN_LOGIN_BLOCK_MS,
  ADMIN_LOGIN_MAX_FAILURES,
  ADMIN_LOGIN_WINDOW_MS,
  evaluateLoginRateLimit,
} from "./login-rate-limit-policy";

export {
  ADMIN_LOGIN_BLOCK_MS,
  ADMIN_LOGIN_MAX_FAILURES,
  ADMIN_LOGIN_WINDOW_MS,
  evaluateLoginRateLimit,
};

export function createLoginThrottleKey(normalizedEmail: string, ipAddress: string) {
  return createHash("sha256")
    .update(`${normalizedEmail}\u0000${ipAddress}`)
    .digest("hex");
}

export async function isAdminLoginAllowed(key: string, now = new Date()) {
  const throttle = await getPrisma().adminLoginThrottle.findUnique({
    where: { key },
    select: { failureCount: true, windowStartedAt: true, blockedUntil: true },
  });
  return evaluateLoginRateLimit(throttle, now).allowed;
}

export async function recordAdminLoginFailure({
  key,
  ipAddress,
  now = new Date(),
}: {
  key: string;
  ipAddress: string;
  now?: Date;
}) {
  await runSerializable(async (tx) => {
    const current = await tx.adminLoginThrottle.findUnique({ where: { key } });
    const expired =
      !current ||
      now.getTime() - current.windowStartedAt.getTime() >= ADMIN_LOGIN_WINDOW_MS;
    const failureCount = expired ? 1 : current.failureCount + 1;
    const blockedUntil =
      failureCount >= ADMIN_LOGIN_MAX_FAILURES
        ? new Date(now.getTime() + ADMIN_LOGIN_BLOCK_MS)
        : null;
    await tx.adminLoginThrottle.upsert({
      where: { key },
      create: {
        key,
        failureCount,
        windowStartedAt: now,
        blockedUntil,
      },
      update: {
        failureCount,
        windowStartedAt: expired ? now : current.windowStartedAt,
        blockedUntil,
      },
    });
    await tx.auditLog.create({
      data: {
        actorType: "SYSTEM",
        action: "ADMIN_LOGIN_FAILURE",
        entityType: "AdminLoginThrottle",
        entityId: key,
        outcome: "DENIED",
        errorCode: blockedUntil ? "RATE_LIMITED" : "INVALID_CREDENTIALS",
        ipAddress: ipAddress === "unknown" ? null : ipAddress.slice(0, 64),
        metadata: { failureCount, blocked: Boolean(blockedUntil) },
      },
    });
  });
}

export async function clearAdminLoginThrottle(key: string) {
  await getPrisma().adminLoginThrottle.deleteMany({ where: { key } });
}
