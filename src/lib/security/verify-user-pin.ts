import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { verifySecurityPin } from "@/lib/security/pin";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export type UserPinVerification =
  | { status: "VALID" }
  | { status: "INVALID"; remainingAttempts: number }
  | { status: "LOCKED"; lockedUntil: Date };

export async function verifyUserSecurityPin(
  userId: string,
  pin: string,
): Promise<UserPinVerification> {
  const db = getPrisma();
  const now = new Date();
  const profile = await db.userProfile.findUnique({
    where: { id: userId },
    select: {
      securityPinHash: true,
      securityPinFailedAttempts: true,
      securityPinLockedUntil: true,
    },
  });

  if (!profile) {
    return { status: "INVALID", remainingAttempts: 0 };
  }

  if (profile.securityPinLockedUntil && profile.securityPinLockedUntil > now) {
    return { status: "LOCKED", lockedUntil: profile.securityPinLockedUntil };
  }

  const lockExpired = Boolean(profile.securityPinLockedUntil);
  const isValid = await verifySecurityPin(pin, profile.securityPinHash);

  if (isValid) {
    if (profile.securityPinFailedAttempts > 0 || profile.securityPinLockedUntil) {
      await db.userProfile.update({
        where: { id: userId },
        data: {
          securityPinFailedAttempts: 0,
          securityPinLockedUntil: null,
        },
      });
    }
    return { status: "VALID" };
  }

  if (lockExpired) {
    await db.userProfile.update({
      where: { id: userId },
      data: {
        securityPinFailedAttempts: 0,
        securityPinLockedUntil: null,
      },
    });
  }

  const updated = await db.userProfile.update({
    where: { id: userId },
    data: { securityPinFailedAttempts: { increment: 1 } },
    select: { securityPinFailedAttempts: true },
  });

  if (updated.securityPinFailedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
    await db.userProfile.update({
      where: { id: userId },
      data: { securityPinLockedUntil: lockedUntil },
    });
    return { status: "LOCKED", lockedUntil };
  }

  return {
    status: "INVALID",
    remainingAttempts: MAX_FAILED_ATTEMPTS - updated.securityPinFailedAttempts,
  };
}
