import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminListing as Listing } from "@/components/admin/admin-listing";
import { can } from "@/features/admin/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import { MemberAdministration } from "../members/components/member-administration";
import { MemberStatusControls } from "../members/components/member-status-controls";
import { WalletAdjustmentForm } from "../wallet/components/wallet-operation-controls";
import { adminDate, adminMoney } from "./format";
import type { AdminPageContext } from "./page-context";

export async function renderMembersPage(context: AdminPageContext) {
  await requireAdminPermission("members.view");
  const prisma = getPrisma();
  const detailId =
    context.slug.length === 2 &&
    context.slug[1] !== "pending" &&
    context.slug[1] !== "blocked"
      ? context.slug[1]
      : null;

  if (detailId) {
    const member = await prisma.userProfile.findUnique({
      where: { id: detailId },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        email: true,
        mobile: true,
        countryCode: true,
        bep20WalletAddress: true,
        status: true,
        rank: true,
        isReferralActive: true,
        createdAt: true,
        sponsor: { select: { memberId: true, fullName: true } },
        _count: {
          select: {
            directReferrals: true,
            descendantLinks: true,
            investments: true,
            depositRequests: true,
            withdrawalRequests: true,
          },
        },
      },
    });
    if (!member) notFound();

    const canManage = can(context.session.role, "members.manage");
    const canManageCredentials = can(context.session.role, "members.sensitive");
    const canViewAudit = can(context.session.role, "audit.view");
    const [wallet, investments, incomes, deposits, withdrawals, audits, notes] =
      await Promise.all([
        prisma.walletLedgerEntry.findMany({
          where: { userId: member.id },
          orderBy: { sequence: "desc" },
          take: 10,
        }),
        prisma.investment.findMany({
          where: { userId: member.id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.incomeLedgerEntry.groupBy({
          by: ["type", "status"],
          where: { userId: member.id },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.depositRequest.findMany({
          where: { userId: member.id },
          orderBy: { submittedAt: "desc" },
          take: 10,
        }),
        prisma.withdrawalRequest.findMany({
          where: { userId: member.id },
          orderBy: { submittedAt: "desc" },
          take: 10,
        }),
        canViewAudit
          ? prisma.auditLog.findMany({
              where: { targetUserId: member.id },
              orderBy: { createdAt: "desc" },
              take: 10,
            })
          : Promise.resolve([]),
        canManage
          ? prisma.adminUserNote.findMany({
              where: { userId: member.id },
              include: { authorAdmin: { select: { displayName: true } } },
              orderBy: { createdAt: "desc" },
              take: 10,
            })
          : Promise.resolve([]),
      ]);
    const balance = wallet[0]?.balanceAfter.toFixed(6) ?? "0.000000";

    return (
      <div className="space-y-6">
        <Listing
          title={`${member.fullName} · ${member.memberId}`}
          description="Complete member investigation view from persisted records."
          headers={["Email", "Mobile", "Country", "Status", "Rank", "Sponsor", "Direct", "Downline"]}
          rows={[
            {
              cells: [
                member.email,
                member.mobile,
                member.countryCode,
                member.status,
                member.rank,
                member.sponsor
                  ? `${member.sponsor.fullName} · ${member.sponsor.memberId}`
                  : "—",
                member._count.directReferrals,
                Math.max(0, member._count.descendantLinks - 1),
              ],
            },
          ]}
        />
        <MemberAdministration
          member={member}
          canManage={canManage}
          canManageCredentials={canManageCredentials}
        />
        {can(context.session.role, "wallet.adjust") ? (
          <WalletAdjustmentForm
            userId={member.id}
            member={`${member.fullName} · ${member.memberId}`}
            balance={balance}
          />
        ) : null}
        <Listing
          title="Wallet ledger"
          description="Latest immutable balance movements."
          headers={["Direction", "Category", "Amount", "Balance", "Description", "Date"]}
          rows={wallet.map((entry) => ({
            cells: [
              entry.direction,
              entry.category,
              adminMoney(entry.amount),
              adminMoney(entry.balanceAfter),
              entry.description,
              adminDate(entry.createdAt),
            ],
          }))}
        />
        <Listing
          title="Investments and ROI progress"
          description="All member investment contracts."
          headers={["Amount", "Paid out", "Cap", "ROI", "Status", "Activated"]}
          rows={investments.map((investment) => ({
            cells: [
              adminMoney(investment.amount),
              adminMoney(investment.paidOutAmount),
              adminMoney(investment.payoutCapAmount),
              `${investment.monthlyRoiPercent}%`,
              investment.status,
              adminDate(investment.activatedAt),
            ],
          }))}
        />
        <Listing
          title="Income totals"
          description="Persisted income ledger totals."
          headers={["Type", "Status", "Records", "Amount"]}
          rows={incomes.map((income) => ({
            cells: [income.type, income.status, income._count, adminMoney(income._sum.amount)],
          }))}
        />
        <Listing
          title="Payment requests"
          description="Latest deposits and withdrawals."
          headers={["Type", "Amount", "Status", "Reference", "Date"]}
          rows={[
            ...deposits.map((deposit) => ({
              cells: [
                "Deposit",
                adminMoney(deposit.amount),
                deposit.status,
                deposit.transactionHash ?? "—",
                adminDate(deposit.submittedAt),
              ],
            })),
            ...withdrawals.map((withdrawal) => ({
              cells: [
                "Withdrawal",
                adminMoney(withdrawal.amount),
                withdrawal.status,
                withdrawal.paymentHash ?? withdrawal.walletAddress,
                adminDate(withdrawal.submittedAt),
              ],
            })),
          ]}
        />
        {canViewAudit || canManage ? (
          <Listing
            title="Audit and administrator notes"
            description="Authorized administrative traceability for this member."
            headers={["Type", "Actor / action", "Detail", "Date"]}
            rows={[
              ...audits.map((audit) => ({
                cells: [
                  "Audit",
                  audit.action,
                  audit.reason ?? audit.outcome,
                  adminDate(audit.createdAt),
                ],
              })),
              ...notes.map((note) => ({
                cells: [
                  "Note",
                  note.authorAdmin.displayName,
                  note.note,
                  adminDate(note.createdAt),
                ],
              })),
            ]}
          />
        ) : null}
      </div>
    );
  }

  const status = context.key.endsWith("pending")
    ? "PENDING"
    : context.key.endsWith("blocked")
      ? "BLOCKED"
      : undefined;
  const data = await prisma.userProfile.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(context.query
        ? {
            OR: [
              { memberId: { contains: context.query, mode: "insensitive" as const } },
              { fullName: { contains: context.query, mode: "insensitive" as const } },
              { email: { contains: context.query, mode: "insensitive" as const } },
              { mobile: { contains: context.query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
    include: { _count: { select: { directReferrals: true, investments: true } } },
  });
  const hasMore = data.length > context.pageSize;
  const rows = data.slice(0, context.pageSize);
  const canManage = can(context.session.role, "members.manage");
  return (
    <Listing
      pagination={{
        path: `/admin/${context.key}`,
        query: context.query,
        page: context.page,
        hasMore,
      }}
      title={status ? `${status[0]}${status.slice(1).toLowerCase()} members` : "All members"}
      description="Review identities, account status and network activity."
      headers={["Member", "Contact", "Country", "Team", "Investments", "Status", "Joined", "Actions"]}
      rows={rows.map((member) => ({
        id: member.id,
        cells: [
          <Link
            key={member.id}
            href={`/admin/members/${member.id}`}
            className="font-semibold text-emerald-700 hover:underline"
          >
            {member.fullName} · {member.memberId}
          </Link>,
          member.email,
          member.countryCode,
          member._count.directReferrals,
          member._count.investments,
          member.status,
          adminDate(member.createdAt),
        ],
        action: canManage ? (
          <MemberStatusControls
            id={member.id}
            status={member.status}
            member={`${member.fullName} · ${member.memberId}`}
          />
        ) : (
          <span>View only</span>
        ),
      }))}
    />
  );
}
