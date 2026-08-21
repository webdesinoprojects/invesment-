import { AdminListing as Listing } from "@/components/admin/admin-listing";
import { can } from "@/features/admin/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import { ManualActivationForm } from "../investments/components/manual-activation-form";
import { InvestmentStatusControls } from "../investments/components/investment-status-controls";
import { ManualRoiForm } from "../roi/manual-roi-form";
import { WalletReversalControl } from "../wallet/components/wallet-operation-controls";
import { adminDate, adminMoney } from "./format";
import type { AdminPageContext } from "./page-context";

export async function renderInvestmentsPage(context: AdminPageContext) {
  await requireAdminPermission("investments.view");
  const manual = context.key.endsWith("activate");
  if (manual) await requireAdminPermission("investments.manual");
  const data = await getPrisma().investment.findMany({
    ...(context.query
      ? {
          where: {
            user: {
              is: {
                OR: [
                  { memberId: { contains: context.query, mode: "insensitive" as const } },
                  { fullName: { contains: context.query, mode: "insensitive" as const } },
                ],
              },
            },
          },
        }
      : {}),
    include: { user: { select: { fullName: true, memberId: true } } },
    orderBy: { createdAt: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
  });
  const canManage = can(context.session.role, "investments.manage");
  return (
    <>
      {manual ? <ManualActivationForm /> : null}
      <Listing
        pagination={{
          path: `/admin/${context.key}`,
          query: context.query,
          page: context.page,
          hasMore: data.length > context.pageSize,
        }}
        title={manual ? "Credit investment" : "All investments"}
        description="Monitor and control every active investment contract."
        headers={["Member", "Amount", "ROI", "Duration", "Paid out", "Status", "Activated", "Actions"]}
        rows={data.slice(0, context.pageSize).map((investment) => ({
          id: investment.id,
          cells: [
            `${investment.user.fullName} · ${investment.user.memberId}`,
            adminMoney(investment.amount),
            `${investment.monthlyRoiPercent}%`,
            `${investment.durationMonths} months`,
            adminMoney(investment.paidOutAmount),
            investment.status,
            adminDate(investment.activatedAt),
          ],
          action: canManage ? (
            <InvestmentStatusControls
              id={investment.id}
              status={investment.status}
              member={`${investment.user.fullName} · ${investment.user.memberId}`}
              amount={adminMoney(investment.amount)}
            />
          ) : (
            <span>View only</span>
          ),
        }))}
      />
    </>
  );
}

export async function renderWalletLedgerPage(context: AdminPageContext) {
  await requireAdminPermission("wallet.view");
  const data = await getPrisma().walletLedgerEntry.findMany({
    ...(context.query
      ? {
          where: {
            user: {
              is: {
                OR: [
                  { memberId: { contains: context.query, mode: "insensitive" as const } },
                  { fullName: { contains: context.query, mode: "insensitive" as const } },
                ],
              },
            },
          },
        }
      : {}),
    include: {
      user: { select: { fullName: true, memberId: true } },
      reversedByEntry: { select: { id: true } },
    },
    orderBy: { sequence: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
  });
  const canAdjust = can(context.session.role, "wallet.adjust");
  return (
    <Listing
      pagination={{
        path: `/admin/${context.key}`,
        query: context.query,
        page: context.page,
        hasMore: data.length > context.pageSize,
      }}
      title="Wallet ledger"
      description="Immutable member wallet movements, running balances and adjustment reversals."
      headers={["Sequence", "Member", "Direction", "Category", "Amount", "Balance", "Description", "Date", "Actions"]}
      rows={data.slice(0, context.pageSize).map((entry) => ({
        id: entry.id,
        cells: [
          entry.sequence.toString(),
          `${entry.user.fullName} · ${entry.user.memberId}`,
          entry.direction,
          entry.category,
          adminMoney(entry.amount),
          adminMoney(entry.balanceAfter),
          entry.description,
          adminDate(entry.createdAt),
        ],
        action:
          canAdjust &&
          entry.category === "ADMIN_ADJUSTMENT" &&
          !entry.reversalOfEntryId &&
          !entry.reversedByEntry ? (
            <WalletReversalControl
              entryId={entry.id}
              amount={adminMoney(entry.amount)}
              direction={entry.direction}
            />
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      }))}
    />
  );
}

export async function renderIncomeLedgerPage(context: AdminPageContext) {
  await requireAdminPermission("income.view");
  const data = await getPrisma().incomeLedgerEntry.findMany({
    ...(context.query
      ? {
          where: {
            user: {
              is: {
                OR: [
                  { memberId: { contains: context.query, mode: "insensitive" as const } },
                  { fullName: { contains: context.query, mode: "insensitive" as const } },
                ],
              },
            },
          },
        }
      : {}),
    include: { user: { select: { fullName: true, memberId: true } } },
    orderBy: { creditedAt: "desc" },
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
      title="Income ledger"
      description="ROI, direct, level, rank and salary income records."
      headers={["Member", "Type", "Amount", "Level", "Status", "Description", "Credited"]}
      rows={data.slice(0, context.pageSize).map((entry) => ({
        cells: [
          `${entry.user.fullName} · ${entry.user.memberId}`,
          entry.type,
          adminMoney(entry.amount),
          entry.level ?? "—",
          entry.status,
          entry.description,
          adminDate(entry.creditedAt),
        ],
      }))}
    />
  );
}

export async function renderPlatformRevenuePage(context: AdminPageContext) {
  await requireAdminPermission("income.view");
  const data = await getPrisma().platformRevenueEntry.findMany({
    ...(context.query
      ? {
          where: {
            sourceUser: {
              is: {
                OR: [
                  { memberId: { contains: context.query, mode: "insensitive" as const } },
                  { fullName: { contains: context.query, mode: "insensitive" as const } },
                ],
              },
            },
          },
        }
      : {}),
    include: {
      sourceUser: { select: { fullName: true, memberId: true } },
      withdrawalRequest: {
        select: { amount: true, netAmount: true, paymentHash: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
  });
  return (
    <Listing
      pagination={{
        path: "/admin/platform-revenue",
        query: context.query,
        page: context.page,
        hasMore: data.length > context.pageSize,
      }}
      title="Platform revenue"
      description="Auditable fees retained by the platform from completed financial operations."
      headers={["Source member", "Category", "Gross withdrawal", "Platform fee", "Paid to member", "Payment reference", "Recorded"]}
      rows={data.slice(0, context.pageSize).map((entry) => ({
        id: entry.id,
        cells: [
          `${entry.sourceUser.fullName} - ${entry.sourceUser.memberId}`,
          entry.category,
          adminMoney(entry.withdrawalRequest.amount),
          adminMoney(entry.amount),
          adminMoney(entry.withdrawalRequest.netAmount ?? 0),
          entry.withdrawalRequest.paymentHash ?? "-",
          adminDate(entry.createdAt),
        ],
      }))}
    />
  );
}

export async function renderRoiPage(context: AdminPageContext) {
  await requireAdminPermission("roi.view");
  const manual = context.key.endsWith("runs");
  const data = await getPrisma().roiRun.findMany({
    orderBy: { startedAt: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
  });
  return (
    <>
      {manual && can(context.session.role, "roi.run") ? <ManualRoiForm /> : null}
      <Listing
        pagination={{
          path: `/admin/${context.key}`,
          query: context.query,
          page: context.page,
          hasMore: data.length > context.pageSize,
        }}
        title={manual ? "ROI runs" : "ROI run history"}
        description="Review scheduled and manual return distribution batches."
        headers={["Run date", "Trigger", "Processed", "Credited", "Failed", "Status", "Started", "Completed", "Failure detail"]}
        rows={data.slice(0, context.pageSize).map((run) => ({
          cells: [
            new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata" }).format(run.runDate),
            run.trigger,
            run.processed,
            run.credited,
            run.failed,
            run.status,
            adminDate(run.startedAt),
            run.completedAt ? adminDate(run.completedAt) : "—",
            run.errorDetail ?? "—",
          ],
        }))}
      />
    </>
  );
}
