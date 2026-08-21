"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getInvestmentSettings } from "@/features/investment/queries/get-investment-settings";
import { activateInvestment } from "@/features/investment/services/activate-investment";
import { getPrisma } from "@/lib/db/prisma";
import { compareDecimalStrings } from "@/lib/money/compare-decimal";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import type { AdminActionResult } from "../../shared/action-result";
import {
  manualActivationSchema,
  manualActivationSearchSchema,
} from "../schemas/manual-activation";

export type ManualActivationMemberResult = {
  userId: string;
  memberId: string;
  fullName: string;
  email: string;
  status: string;
  totalInvestment: string;
};

export async function searchManualActivationMembersAction(
  rawQuery: string,
): Promise<
  { ok: true; members: ManualActivationMemberResult[] } | { ok: false; message: string }
> {
  const query = manualActivationSearchSchema.safeParse(rawQuery);
  if (!query.success) {
    return { ok: false, message: "Enter at least two search characters." };
  }

  await requireAdminPermission("investments.manual");
  const normalized = query.data.trim();
  const members = await getPrisma().userProfile.findMany({
    where: {
      OR: [
        { memberId: { contains: normalized.toUpperCase(), mode: "insensitive" } },
        { email: { contains: normalized.toLowerCase(), mode: "insensitive" } },
        { mobile: { contains: normalized } },
        { fullName: { contains: normalized, mode: "insensitive" } },
      ],
    },
    orderBy: { memberId: "asc" },
    take: 10,
    select: {
      id: true,
      memberId: true,
      fullName: true,
      email: true,
      status: true,
    },
  });

  const resolved = await Promise.all(
    members.map(async (member) => {
      const total = await getPrisma().investment.aggregate({
        where: { userId: member.id, status: { in: ["ACTIVE", "PAUSED"] } },
        _sum: { amount: true },
      });
      return {
        userId: member.id,
        memberId: member.memberId,
        fullName: member.fullName,
        email: member.email,
        status: member.status,
        totalInvestment: (total._sum.amount ?? 0).toString(),
      };
    }),
  );

  return { ok: true, members: resolved };
}

export async function manualActivationAction(
  _state: AdminActionResult<{ nextRequestToken: string | null }>,
  formData: FormData,
): Promise<AdminActionResult<{ nextRequestToken: string | null }>> {
  const parsed = manualActivationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Check the investment credit details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = await requireAdminPermission("investments.manual");
  const [member, settings] = await Promise.all([
    getPrisma().userProfile.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, memberId: true },
    }),
    getInvestmentSettings(),
  ]);

  if (!member) return { ok: false, code: "NOT_FOUND", message: "Member not found." };
  if (!settings) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Investment settings are not configured.",
    };
  }
  if (compareDecimalStrings(parsed.data.amount, settings.minimumAmount) < 0) {
    return {
      ok: false,
      code: "AMOUNT_TOO_LOW",
      message: `Minimum investment is ${settings.minimumAmount} USDT.`,
    };
  }

  try {
    const result = await activateInvestment({
      targetUserId: member.id,
      amount: parsed.data.amount,
      requestToken: parsed.data.requestToken,
      settings,
      adminId: admin.adminId,
      reason: parsed.data.reason,
    });
    if (!result.ok) {
      return {
        ok: false,
        code: result.code,
        message:
          result.code === "DUPLICATE_REQUEST"
              ? "This investment credit was already submitted."
              : "Investment credit could not be completed.",
      };
    }
    revalidatePath("/admin");
    return {
      ok: true,
      data: { nextRequestToken: randomUUID() },
      message: "Admin-funded investment credited and commission rules evaluated.",
    };
  } catch {
    return { ok: false, code: "FAILED", message: "Investment credit failed." };
  }
}
