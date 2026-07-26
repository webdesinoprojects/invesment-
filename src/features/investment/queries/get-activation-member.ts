import "server-only";

import { getPrisma } from "@/lib/db/prisma";

export type ActivationMember = {
  memberId: string;
  fullName: string;
  isBlocked: boolean;
};

export async function getActivationMember(memberId: string): Promise<ActivationMember | null> {
  const member = await getPrisma().userProfile.findUnique({
    where: { memberId },
    select: { memberId: true, fullName: true, status: true },
  });
  if (!member) return null;

  return {
    memberId: member.memberId,
    fullName: member.fullName,
    isBlocked: member.status === "BLOCKED",
  };
}
