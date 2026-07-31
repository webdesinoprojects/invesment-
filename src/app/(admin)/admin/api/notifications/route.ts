import { NextResponse } from "next/server";
import { adminNotificationResponseSchema } from "@/features/admin/notifications/schema";
import { getTodayRoiStatus } from "@/features/admin/roi/get-today-roi-status";
import { formatDecimalCurrency } from "@/features/admin/shared/format-decimal";
import { getAdminSession } from "@/lib/admin/session";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const now = new Date();
  const [
    members,
    deposits,
    withdrawals,
    memberCount,
    depositCount,
    withdrawalCount,
    roiStatus,
  ] = await Promise.all([
    prisma.userProfile.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        fullName: true,
        memberId: true,
        createdAt: true,
      },
    }),
    prisma.depositRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        submittedAt: true,
        user: { select: { fullName: true, memberId: true } },
      },
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        status: true,
        submittedAt: true,
        user: { select: { fullName: true, memberId: true } },
      },
    }),
    prisma.userProfile.count({ where: { status: "PENDING" } }),
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawalRequest.count({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
    }),
    getTodayRoiStatus(now),
  ]);

  const roiItem = getRoiNotification(roiStatus, now);
  const items = [
    ...members.map((member) => ({
      id: `member-${member.id}`,
      type: "MEMBER" as const,
      title: "New member awaiting approval",
      detail: `${member.fullName} | ${member.memberId}`,
      href: "/admin/members/pending",
      createdAt: member.createdAt.toISOString(),
    })),
    ...deposits.map((deposit) => ({
      id: `deposit-${deposit.id}`,
      type: "DEPOSIT" as const,
      title: "New deposit request",
      detail: `${deposit.user.fullName} | ${formatDecimalCurrency(deposit.amount)}`,
      href: "/admin/deposits/pending",
      createdAt: deposit.submittedAt.toISOString(),
    })),
    ...withdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      type: "WITHDRAWAL" as const,
      title: `${withdrawal.status === "PROCESSING" ? "Processing" : "New"} withdrawal request`,
      detail: `${withdrawal.user.fullName} | ${formatDecimalCurrency(withdrawal.amount)}`,
      href:
        withdrawal.status === "PROCESSING"
          ? "/admin/withdrawals/processing"
          : "/admin/withdrawals/pending",
      createdAt: withdrawal.submittedAt.toISOString(),
    })),
    ...(roiItem ? [roiItem] : []),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 15);

  const response = adminNotificationResponseSchema.parse({
    count:
      memberCount +
      depositCount +
      withdrawalCount +
      (roiStatus.requiresAttention ? 1 : 0),
    items,
  });
  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}

function getRoiNotification(
  status: Awaited<ReturnType<typeof getTodayRoiStatus>>,
  now: Date,
) {
  const run = status.run;
  const base = {
    id: `roi-${run?.id ?? "today"}`,
    type: "ROI" as const,
    href: "/admin/roi/history",
    createdAt: (run?.completedAt ?? run?.startedAt ?? now).toISOString(),
  };

  if (!run && status.expected) {
    return {
      ...base,
      title: "Today's ROI run is missing",
      detail: "No run was recorded by 2:00 AM IST.",
    };
  }
  if (run?.status === "FAILED") {
    return {
      ...base,
      title: "Today's ROI requires attention",
      detail: `${run.credited} credited | ${run.failed} failed`,
    };
  }
  if (run?.status === "RUNNING") {
    return {
      ...base,
      title: status.stalled
        ? "Today's ROI run may be stalled"
        : "Today's ROI is processing",
      detail: `${run.processed} investments recorded`,
    };
  }
  if (run?.status === "COMPLETED") {
    return {
      ...base,
      title: "Today's ROI completed",
      detail: `${run.credited} of ${run.processed} investments credited`,
    };
  }
  return null;
}
