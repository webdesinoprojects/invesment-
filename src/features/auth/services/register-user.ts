import "server-only";

import { randomInt } from "node:crypto";

import { getPrisma } from "@/lib/db/prisma";
import { hashSecurityPin } from "@/lib/security/pin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RegisterInput } from "@/features/auth/schemas/auth";

export type RegisterUserResult =
  | { ok: true; memberId: string; joinedAt: string }
  | { ok: false; code: string; message: string };

async function createMemberId(): Promise<string> {
  const db = getPrisma();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const memberId = `NP${randomInt(100000, 1000000)}`;
    const exists = await db.userProfile.findUnique({
      where: { memberId },
      select: { id: true },
    });
    if (!exists) {
      return memberId;
    }
  }

  throw new Error("MEMBER_ID_ALLOCATION_FAILED");
}

export async function registerUser(
  input: RegisterInput,
): Promise<RegisterUserResult> {
  const db = getPrisma();
  const sponsor = input.inviteId
    ? await db.userProfile.findUnique({
        where: { memberId: input.inviteId },
        select: {
          id: true,
          status: true,
          isReferralActive: true,
        },
      })
    : null;

  if (input.inviteId && !sponsor) {
    return {
      ok: false,
      code: "SPONSOR_NOT_FOUND",
      message: "The invite ID does not belong to a registered partner.",
    };
  }
  if (
    sponsor &&
    (sponsor.status !== "ACTIVE" || !sponsor.isReferralActive)
  ) {
    return {
      ok: false,
      code: "SPONSOR_NOT_ELIGIBLE",
      message:
        "Referral privileges are available only to activated partners.",
    };
  }

  const existingProfile = await db.userProfile.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existingProfile) {
    return {
      ok: false,
      code: "EMAIL_EXISTS",
      message: "An account already exists for this email address.",
    };
  }

  const adminAuth = createSupabaseAdminClient();
  const { data, error } = await adminAuth.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (error || !data.user) {
    return {
      ok: false,
      code: "AUTH_CREATE_FAILED",
      message:
        error?.code === "email_exists"
          ? "An account already exists for this email address."
          : "The account could not be created. Please try again.",
    };
  }

  try {
    const [memberId, securityPinHash, sponsorAncestors] = await Promise.all([
      createMemberId(),
      hashSecurityPin(input.securityPin),
      sponsor
        ? db.referralClosure.findMany({
            where: { descendantId: sponsor.id },
            select: { ancestorId: true, depth: true },
          })
        : Promise.resolve<Array<{ ancestorId: string; depth: number }>>([]),
    ]);

    if (
      sponsor &&
      !sponsorAncestors.some((ancestor) => ancestor.ancestorId === sponsor.id)
    ) {
      sponsorAncestors.push({ ancestorId: sponsor.id, depth: 0 });
    }

    const profile = await db.$transaction(async (transaction) => {
      const profile = await transaction.userProfile.create({
        data: {
          authUserId: data.user.id,
          memberId,
          fullName: input.fullName,
          email: input.email,
          mobile: input.mobile,
          countryCode: input.countryCode,
          securityPinHash,
          sponsorId: sponsor?.id ?? null,
        },
      });

      await transaction.referralLink.create({
        data: {
          userId: profile.id,
          code: memberId,
          isActive: false,
        },
      });

      await transaction.referralClosure.createMany({
        data: [
          {
            ancestorId: profile.id,
            descendantId: profile.id,
            depth: 0,
          },
          ...sponsorAncestors.map((ancestor) => ({
            ancestorId: ancestor.ancestorId,
            descendantId: profile.id,
            depth: ancestor.depth + 1,
          })),
        ],
        skipDuplicates: true,
      });

      return profile;
    });

    return {
      ok: true,
      memberId,
      joinedAt: profile.createdAt.toISOString(),
    };
  } catch {
    await adminAuth.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return {
      ok: false,
      code: "PROFILE_CREATE_FAILED",
      message: "The account could not be completed. Please try again.",
    };
  }
}
