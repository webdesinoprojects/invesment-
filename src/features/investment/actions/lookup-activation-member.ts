"use server";

import { getActivationMember } from "@/features/investment/queries/get-activation-member";
import { memberIdSchema } from "@/features/investment/schemas/activation";
import { requireUser } from "@/lib/auth/require-user";

export type MemberLookupResult =
  | { ok: true; memberId: string; fullName: string }
  | { ok: false; message: string };

export async function lookupActivationMemberAction(
  rawMemberId: string,
): Promise<MemberLookupResult> {
  const parsed = memberIdSchema.safeParse(rawMemberId);
  if (!parsed.success) return { ok: false, message: "Enter a valid member ID." };

  await requireUser();
  const member = await getActivationMember(parsed.data);
  if (!member) return { ok: false, message: "Member does not exist." };
  if (member.isBlocked) return { ok: false, message: "This member cannot be activated." };

  return { ok: true, memberId: member.memberId, fullName: member.fullName };
}
