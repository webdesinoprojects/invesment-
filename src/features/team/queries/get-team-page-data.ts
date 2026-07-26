import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { TeamPageData, TeamTab } from "@/features/team/types/team";
import { getPrisma } from "@/lib/db/prisma";
import { getIndiaBusinessDayBounds } from "@/lib/date/business-day";
import { getServerEnv } from "@/lib/env/server";

const PAGE_SIZE = 20;

export async function getTeamPageData({
  userId,
  memberId,
  tab,
  requestedPage,
}: {
  userId: string;
  memberId: string;
  tab: TeamTab;
  requestedPage: number;
}): Promise<TeamPageData> {
  const db = getPrisma();
  const today = getIndiaBusinessDayBounds();
  const where = buildMemberFilter(userId, tab, today);

  const [directCount, downlineCount, referralLink, totalRows] = await Promise.all([
    db.userProfile.count({ where: { sponsorId: userId } }),
    db.referralClosure.count({ where: { ancestorId: userId, depth: { gt: 0 } } }),
    db.referralLink.findUnique({
      where: { userId },
      select: { code: true, isActive: true },
    }),
    db.userProfile.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const members = await db.userProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      memberId: true,
      fullName: true,
      mobile: true,
      rank: true,
      status: true,
      createdAt: true,
      sponsor: { select: { memberId: true } },
    },
  });

  const investmentFilter =
    tab === "today"
      ? { activatedAt: { gte: today.start, lt: today.end } }
      : {};
  const investments = members.length
    ? await db.investment.groupBy({
        by: ["userId"],
        where: {
          userId: { in: members.map((member) => member.id) },
          status: { not: "CANCELLED" },
          ...investmentFilter,
        },
        _sum: { amount: true },
        _min: { activatedAt: true },
      })
    : [];
  const investmentByUser = new Map(
    investments.map((investment) => [investment.userId, investment]),
  );
  const referralCode = referralLink?.code ?? memberId;

  return {
    directCount,
    downlineCount,
    referralUrl: `${getServerEnv().NEXT_PUBLIC_SITE_URL}/register?ref=${referralCode}`,
    isReferralActive: referralLink?.isActive ?? false,
    rows: members.map((member) => {
      const investment = investmentByUser.get(member.id);
      return {
        id: member.id,
        memberId: member.memberId,
        fullName: member.fullName,
        sponsorMemberId: member.sponsor?.memberId ?? null,
        joinedAt: member.createdAt.toISOString(),
        activatedAt: investment?._min.activatedAt?.toISOString() ?? null,
        mobile: member.mobile,
        rank: member.rank,
        amount: investment?._sum.amount?.toString() ?? "0",
        status: member.status,
      };
    }),
    pagination: { page, totalPages, totalRows },
  };
}

function buildMemberFilter(
  userId: string,
  tab: TeamTab,
  today: { start: Date; end: Date },
): Prisma.UserProfileWhereInput {
  if (tab === "direct") return { sponsorId: userId };

  const downline: Prisma.UserProfileWhereInput = {
    descendantLinks: { some: { ancestorId: userId, depth: { gt: 0 } } },
  };
  if (tab === "topup") {
    return {
      ...downline,
      investments: { some: { status: { not: "CANCELLED" } } },
    };
  }
  if (tab === "today") {
    return {
      ...downline,
      investments: {
        some: {
          status: { not: "CANCELLED" },
          activatedAt: { gte: today.start, lt: today.end },
        },
      },
    };
  }
  return downline;
}
