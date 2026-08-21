import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { isAuthConfigured } from "@/lib/env/server";

export type SponsorPreview =
  | { state: "none" }
  | { state: "unavailable"; memberId: string }
  | { state: "not-found"; memberId: string }
  | {
      state: "found";
      memberId: string;
      fullName: string;
      isEligible: boolean;
    };

export async function getSponsorPreview(
  rawMemberId: string | undefined,
): Promise<SponsorPreview> {
  const memberId = rawMemberId?.trim().toUpperCase();
  if (!memberId || !/^NP\d{6,10}$/.test(memberId)) {
    return { state: "none" };
  }
  if (!isAuthConfigured()) {
    return { state: "unavailable", memberId };
  }

  try {
    const sponsor = await getPrisma().userProfile.findUnique({
      where: { memberId },
      select: {
        fullName: true,
        status: true,
      },
    });
    if (!sponsor) {
      return { state: "not-found", memberId };
    }
    return {
      state: "found",
      memberId,
      fullName: sponsor.fullName,
      isEligible: sponsor.status !== "BLOCKED" && sponsor.status !== "ARCHIVED",
    };
  } catch {
    return { state: "unavailable", memberId };
  }
}
