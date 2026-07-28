import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminListing as Listing } from "@/components/admin/admin-listing";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import { adminDate, adminMoney } from "./format";
import type { AdminPageContext } from "./page-context";

export async function renderReferralsPage(context: AdminPageContext) {
  await requireAdminPermission("referrals.view");
  if (context.key.startsWith("referrals/member/")) {
    const memberId = context.slug[2];
    if (!memberId) notFound();
    return renderMemberReferralInvestigation(memberId);
  }
  if (context.key === "referrals/analytics") return renderAnalytics();

  const data = await getPrisma().referralClosure.findMany({
    where: {
      depth: { gt: 0 },
      ...(context.query
        ? {
            OR: [
              {
                ancestor: {
                  is: {
                    OR: [
                      { memberId: { contains: context.query, mode: "insensitive" as const } },
                      { fullName: { contains: context.query, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
              {
                descendant: {
                  is: {
                    OR: [
                      { memberId: { contains: context.query, mode: "insensitive" as const } },
                      { fullName: { contains: context.query, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      ancestor: { select: { id: true, memberId: true, fullName: true, isReferralActive: true } },
      descendant: { select: { id: true, memberId: true, fullName: true, isReferralActive: true } },
    },
    orderBy: [{ ancestorId: "asc" }, { depth: "asc" }],
    skip: context.skip,
    take: context.pageSize + 1,
  });
  return (
    <Listing
      pagination={{
        path: `/admin/${context.key}`,
        query: context.query,
        page: context.page,
        hasMore: data.length > context.pageSize,
      }}
      title="Referral tree"
      description="Persisted ancestor-to-descendant closure relationships by depth."
      headers={["Sponsor / ancestor", "Member / descendant", "Depth", "Ancestor eligible", "Member eligible"]}
      rows={data.slice(0, context.pageSize).map((link) => ({
        cells: [
          <Link key={link.ancestor.id} href={`/admin/referrals/member/${link.ancestor.id}`} className="font-semibold text-emerald-700 hover:underline">
            {link.ancestor.fullName} · {link.ancestor.memberId}
          </Link>,
          <Link key={link.descendant.id} href={`/admin/referrals/member/${link.descendant.id}`} className="font-semibold text-emerald-700 hover:underline">
            {link.descendant.fullName} · {link.descendant.memberId}
          </Link>,
          link.depth,
          link.ancestor.isReferralActive ? "Yes" : "No",
          link.descendant.isReferralActive ? "Yes" : "No",
        ],
      }))}
    />
  );
}

async function renderMemberReferralInvestigation(userId: string) {
  const prisma = getPrisma();
  const member = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      memberId: true,
      fullName: true,
      status: true,
      isReferralActive: true,
    },
  });
  if (!member) notFound();
  const [directs, depthCounts, totalDownline, ancestorLinks, commissions] = await Promise.all([
    prisma.userProfile.findMany({
      where: { sponsorId: member.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        status: true,
        isReferralActive: true,
        createdAt: true,
      },
    }),
    prisma.referralClosure.groupBy({
      by: ["depth"],
      where: { ancestorId: member.id, depth: { gte: 1, lte: 5 } },
      _count: true,
      orderBy: { depth: "asc" },
    }),
    prisma.referralClosure.count({
      where: { ancestorId: member.id, depth: { gt: 0 } },
    }),
    prisma.referralClosure.findMany({
      where: { descendantId: member.id, depth: { gt: 0 } },
      orderBy: { depth: "asc" },
      include: {
        ancestor: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            status: true,
            isReferralActive: true,
          },
        },
      },
    }),
    prisma.incomeLedgerEntry.findMany({
      where: {
        sourceUserId: member.id,
        type: { in: ["DIRECT_REFERRAL", "LEVEL_INCOME"] },
      },
      orderBy: { creditedAt: "asc" },
      include: {
        user: { select: { id: true, memberId: true, fullName: true } },
        investment: { select: { id: true, amount: true } },
      },
    }),
  ]);
  const commissionByAncestor = new Map(commissions.map((entry) => [entry.userId, entry]));
  const progress = await Promise.all(
    ancestorLinks.map(async (link) => {
      const counts = await prisma.referralClosure.groupBy({
        by: ["depth"],
        where: { ancestorId: link.ancestorId, depth: { gte: 1, lte: 5 } },
        _count: true,
        orderBy: { depth: "asc" },
      });
      return { ...link, counts };
    }),
  );

  return (
    <div className="space-y-6">
      <Listing
        title={`${member.fullName} · ${member.memberId} referral investigation`}
        description="Financial eligibility is read from persisted account and commission records, never inferred from display counts."
        headers={["Status", "Referral eligible", "Direct referrals", "Total downline", "Depth 1", "Depth 2", "Depth 3", "Depth 4", "Depth 5"]}
        rows={[
          {
            cells: [
              member.status,
              member.isReferralActive ? "Yes" : "No",
              directs.length,
              totalDownline,
              ...[1, 2, 3, 4, 5].map(
                (depth) => depthCounts.find((item) => item.depth === depth)?._count ?? 0,
              ),
            ],
          },
        ]}
      />
      <Listing
        title="Direct referrals"
        description="Members whose direct sponsor is this member."
        headers={["Member", "Status", "Referral eligible", "Joined"]}
        rows={directs.map((direct) => ({
          cells: [
            <Link key={direct.id} href={`/admin/referrals/member/${direct.id}`} className="font-semibold text-emerald-700 hover:underline">
              {direct.fullName} · {direct.memberId}
            </Link>,
            direct.status,
            direct.isReferralActive ? "Yes" : "No",
            adminDate(direct.createdAt),
          ],
        }))}
      />
      <Listing
        title="Ancestor eligibility and independent five-level progress"
        description="Each ancestor has an independent depth 1–5 window. Rows beyond depth 5 are explicitly outside this source member’s payable window."
        headers={["Ancestor", "Source depth", "Eligible account", "Commission result", "Ancestor depth 1–5 counts"]}
        rows={progress.map((link) => {
          const commission = commissionByAncestor.get(link.ancestorId);
          const withinWindow = link.depth <= 5;
          const eligibility =
            link.ancestor.status === "ACTIVE" && link.ancestor.isReferralActive;
          return {
            cells: [
              `${link.ancestor.fullName} · ${link.ancestor.memberId}`,
              link.depth,
              eligibility ? "Yes" : "No",
              commission
                ? `${commission.type} · ${adminMoney(commission.amount)} · ${commission.percent ?? "—"}%`
                : !withinWindow
                  ? "Stopped: beyond the five-level limit"
                  : eligibility
                    ? "No persisted commission for this source"
                    : "Not financially eligible at credit time",
              [1, 2, 3, 4, 5]
                .map((depth) => link.counts.find((item) => item.depth === depth)?._count ?? 0)
                .join(" / "),
            ],
          };
        })}
      />
      <Listing
        title="Persisted referral commission entries"
        description="Every commission is tied to its source member, investment and paid level."
        headers={["Recipient", "Investment", "Type", "Level", "Percent", "Base", "Amount", "Status", "Credited"]}
        rows={commissions.map((entry) => ({
          cells: [
            `${entry.user.fullName} · ${entry.user.memberId}`,
            entry.investment?.id ?? "—",
            entry.type,
            entry.level ?? 1,
            entry.percent ? `${entry.percent}%` : "—",
            adminMoney(entry.baseAmount),
            adminMoney(entry.amount),
            entry.status,
            adminDate(entry.creditedAt),
          ],
        }))}
      />
    </div>
  );
}

async function renderAnalytics() {
  const prisma = getPrisma();
  const [depths, incomes] = await Promise.all([
    prisma.referralClosure.groupBy({
      by: ["depth"],
      where: { depth: { gt: 0 } },
      _count: true,
      orderBy: { depth: "asc" },
    }),
    prisma.incomeLedgerEntry.groupBy({
      by: ["type", "level"],
      where: {
        type: { in: ["DIRECT_REFERRAL", "LEVEL_INCOME"] },
        status: "CREDITED",
      },
      _count: true,
      _sum: { amount: true },
      orderBy: { level: "asc" },
    }),
  ]);
  return (
    <Listing
      title="Team analytics"
      description="Persisted closure depth and paid commission records; eligibility is never inferred from display counts."
      headers={["Metric", "Level", "Records", "Amount"]}
      rows={[
        ...depths.map((depth) => ({
          cells: ["Referral closure", depth.depth, depth._count, "—"],
        })),
        ...incomes.map((income) => ({
          cells: [income.type, income.level ?? 1, income._count, adminMoney(income._sum.amount)],
        })),
      ]}
    />
  );
}
