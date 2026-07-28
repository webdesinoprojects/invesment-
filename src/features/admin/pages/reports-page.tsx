import Link from "next/link";

import { AdminListing as Listing } from "@/components/admin/admin-listing";
import {
  getReportReconciliation,
  getReportRows,
  parseReportFilters,
  reportTransactionTypes,
} from "@/features/admin/reports/report-query";
import { can } from "@/features/admin/permissions";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import { adminDate, adminMoney } from "./format";
import type { AdminPageContext } from "./page-context";

export async function renderReportsPage(
  context: AdminPageContext,
  rawFilters: {
    from?: string | undefined;
    to?: string | undefined;
    member?: string | undefined;
    status?: string | undefined;
    transactionType?: string | undefined;
  },
) {
  await requireAdminPermission("reports.view");
  const filters = parseReportFilters(rawFilters);
  const [{ rows, hasMore }, reconciliation] = await Promise.all([
    getReportRows(filters, context.page, context.pageSize),
    getReportReconciliation(),
  ]);
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.member) query.set("member", filters.member);
  if (filters.status) query.set("status", filters.status);
  query.set("transactionType", filters.transactionType);
  const pageLink = (page: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `/admin/reports?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Listing
        title="Financial reconciliation"
        description="Live Decimal-safe totals from persisted financial records."
        headers={["Metric", "Records", "Amount", "Related amount"]}
        rows={[
          {
            cells: [
              "Approved deposits",
              reconciliation.approvedDepositCount,
              adminMoney(reconciliation.approvedDeposits),
              "—",
            ],
          },
          {
            cells: [
              "Paid withdrawals",
              reconciliation.paidWithdrawalCount,
              adminMoney(reconciliation.paidWithdrawals),
              "—",
            ],
          },
          {
            cells: [
              "Investments",
              reconciliation.investmentCount,
              adminMoney(reconciliation.investmentPrincipal),
              `${adminMoney(reconciliation.investmentPaidOut)} paid / ${adminMoney(reconciliation.payoutCap)} cap`,
            ],
          },
          {
            cells: [
              "Credited income",
              reconciliation.incomeCount,
              adminMoney(reconciliation.creditedIncome),
              "—",
            ],
          },
          {
            cells: [
              "Wallet liability",
              reconciliation.walletCount,
              adminMoney(reconciliation.walletLiability),
              "Latest balance per member",
            ],
          },
        ]}
      />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">Reports</p>
          <h2 className="mt-1 text-2xl font-bold">Filtered transactions</h2>
          <form method="get" className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <input type="date" name="from" defaultValue={filters.from} aria-label="From date" className="rounded-xl border px-3 py-2 text-sm" />
            <input type="date" name="to" defaultValue={filters.to} aria-label="To date" className="rounded-xl border px-3 py-2 text-sm" />
            <input name="member" defaultValue={filters.member} placeholder="Member ID or name" className="rounded-xl border px-3 py-2 text-sm" />
            <input name="status" defaultValue={filters.status} placeholder="Exact status" className="rounded-xl border px-3 py-2 text-sm" />
            <select name="transactionType" defaultValue={filters.transactionType} className="rounded-xl border px-3 py-2 text-sm">
              {reportTransactionTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Apply filters</button>
          </form>
          {can(context.session.role, "reports.export") ? (
            <a href={`/admin/api/reports/export?${query.toString()}`} className="mt-3 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">
              Export CSV · India time
            </a>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>{["Date (IST)", "Member", "Type", "Status", "Amount", "Reference"].map((header) => <th key={header} className="whitespace-nowrap px-5 py-3">{header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={`${row.transactionType}:${row.id}`} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-5 py-3">{adminDate(row.occurredAt)}</td>
                  <td className="whitespace-nowrap px-5 py-3">{row.memberName} · {row.memberId}</td>
                  <td className="whitespace-nowrap px-5 py-3">{row.transactionType}</td>
                  <td className="whitespace-nowrap px-5 py-3">{row.status}</td>
                  <td className="whitespace-nowrap px-5 py-3">{adminMoney(row.amount)}</td>
                  <td className="max-w-80 truncate px-5 py-3">{row.reference ?? "—"}</td>
                </tr>
              )) : <tr><td colSpan={6} className="p-12 text-center text-slate-400">No matching records</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs">
          <span>Page {context.page}</span>
          <div className="flex gap-2">
            {context.page > 1 ? <Link href={pageLink(context.page - 1)} className="rounded-lg border px-3 py-2">Previous</Link> : null}
            {hasMore ? <Link href={pageLink(context.page + 1)} className="rounded-lg border px-3 py-2">Next</Link> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
