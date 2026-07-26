import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import type { ProfileData } from "@/features/profile/types/profile";

export async function getProfileData(userId: string): Promise<ProfileData> {
  const profile = await getPrisma().userProfile.findUniqueOrThrow({
    where: { id: userId },
    select: {
      memberId: true,
      fullName: true,
      email: true,
      mobile: true,
      countryCode: true,
      bep20WalletAddress: true,
      sponsor: { select: { memberId: true, fullName: true } },
    },
  });

  return {
    memberId: profile.memberId,
    fullName: profile.fullName,
    email: profile.email,
    mobile: profile.mobile,
    countryCode: profile.countryCode,
    walletAddress: profile.bep20WalletAddress ?? "",
    sponsorMemberId: profile.sponsor?.memberId ?? "Direct registration",
    sponsorName: profile.sponsor?.fullName ?? "NaturePower",
  };
}
