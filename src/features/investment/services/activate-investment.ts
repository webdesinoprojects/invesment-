import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { InvestmentSettings } from "@/features/investment/queries/get-investment-settings";
import type { ActivateInvestmentResult } from "@/features/investment/types/investment";
import {
  creditDirectActivationBonus,
  evaluateCommissionQualifications,
} from "@/features/referral/services/commission-schedules";
import { getPrisma } from "@/lib/db/prisma";

const MAX_TRANSACTION_ATTEMPTS = 3;
const ACTIVATION_TRANSACTION_MAX_WAIT_MS = 10_000;
const ACTIVATION_TRANSACTION_TIMEOUT_MS = 30_000;

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function activateInvestment({
  targetMemberId,
  targetUserId,
  amount,
  requestToken,
  settings,
  adminId,
  reason,
}: {
  payerUserId?: string;
  targetMemberId?: string;
  targetUserId?: string;
  amount: string;
  requestToken: string;
  settings: InvestmentSettings;
  adminId?: string;
  reason?: string;
}): Promise<ActivateInvestmentResult> {
  if ((!targetMemberId && !targetUserId) || (targetMemberId && targetUserId)) {
    throw new Error("Exactly one investment target identifier is required.");
  }
  if (!adminId) return { ok: false, code: "ADMIN_REQUIRED" };

  const db = getPrisma();
  const activationKey = `investment-activation:${requestToken}`;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const duplicate = await tx.investment.findUnique({
            where: { activationKey },
            select: { id: true },
          });
          if (duplicate) return { ok: false as const, code: "DUPLICATE_REQUEST" as const };

          const target = await tx.userProfile.findUnique({
            where: targetUserId ? { id: targetUserId } : { memberId: targetMemberId as string },
            select: { id: true, memberId: true, status: true },
          });
          if (!target) return { ok: false as const, code: "MEMBER_NOT_FOUND" as const };
          if (target.status === "BLOCKED" || target.status === "ARCHIVED") {
            return { ok: false as const, code: "MEMBER_BLOCKED" as const };
          }

          const investmentAmount = new Prisma.Decimal(amount);
          const investment = await tx.investment.create({
            data: {
              userId: target.id,
              amount: investmentAmount,
              payoutCapAmount: investmentAmount.mul(2).toDecimalPlaces(6),
              monthlyRoiPercent: settings.monthlyRoiPercent,
              durationMonths: settings.durationMonths,
              source: "ADMIN",
              activationKey,
              activatedById: adminId,
            },
            select: { id: true },
          });

          await Promise.all([
            tx.userProfile.update({
              where: { id: target.id },
              data: { status: "ACTIVE", isReferralActive: true },
            }),
            tx.referralLink.updateMany({
              where: { userId: target.id },
              data: { isActive: true },
            }),
          ]);

          await creditDirectActivationBonus(tx, {
            sourceUserId: target.id,
            investmentId: investment.id,
            baseAmount: investmentAmount,
            percent: settings.directBonusPercent,
          });
          await evaluateCommissionQualifications(tx, {
            activatedUserId: target.id,
            settings,
          });

          await tx.auditLog.create({
            data: {
              actorAdminId: adminId,
              targetUserId: target.id,
              action: "ADMIN_INVESTMENT_CREDIT",
              entityType: "Investment",
              entityId: investment.id,
              reason: reason || null,
              after: {
                amount: investmentAmount.toFixed(6),
                source: "ADMIN",
                memberId: target.memberId,
              },
            },
          });

          return { ok: true as const, investmentId: investment.id };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: ACTIVATION_TRANSACTION_MAX_WAIT_MS,
          timeout: ACTIVATION_TRANSACTION_TIMEOUT_MS,
        },
      );
    } catch (error) {
      if (hasPrismaCode(error, "P2002")) return { ok: false, code: "DUPLICATE_REQUEST" };
      if (hasPrismaCode(error, "P2034") && attempt < MAX_TRANSACTION_ATTEMPTS) continue;
      throw error;
    }
  }

  throw new Error("Investment transaction retry limit reached.");
}
