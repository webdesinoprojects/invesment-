import { notFound } from "next/navigation";

import {
  renderIncomeLedgerPage,
  renderInvestmentsPage,
  renderPlatformRevenuePage,
  renderRoiPage,
  renderWalletLedgerPage,
} from "@/features/admin/pages/finance-page";
import { renderMembersPage } from "@/features/admin/pages/members-page";
import {
  renderAdministratorsPage,
  renderAuditPage,
  renderRolesPage,
  renderSettingsPage,
  renderSystemHealthPage,
} from "@/features/admin/pages/operations-page";
import {
  renderDepositsPage,
  renderWithdrawalsPage,
} from "@/features/admin/pages/payments-page";
import type { AdminPageContext } from "@/features/admin/pages/page-context";
import { renderReferralsPage } from "@/features/admin/pages/referrals-page";
import { renderReportsPage } from "@/features/admin/pages/reports-page";
import { requireAdmin } from "@/lib/admin/session";

type SearchParams = {
  q?: string | string[];
  page?: string | string[];
  from?: string | string[];
  to?: string | string[];
  member?: string | string[];
  status?: string | string[];
  transactionType?: string | string[];
};

export default async function AdminModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, rawFilters, session] = await Promise.all([
    params,
    searchParams,
    requireAdmin(),
  ]);
  const key = slug.join("/");
  const query = first(rawFilters.q)?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Number.parseInt(first(rawFilters.page) ?? "1", 10) || 1);
  const pageSize = 25;
  const context: AdminPageContext = {
    slug,
    key,
    query,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    session,
  };

  if (key.startsWith("members")) return renderMembersPage(context);
  if (key.startsWith("deposits")) return renderDepositsPage(context);
  if (key.startsWith("withdrawals")) return renderWithdrawalsPage(context);
  if (key.startsWith("investments")) return renderInvestmentsPage(context);
  if (key === "wallet-ledger") return renderWalletLedgerPage(context);
  if (key === "income-ledger") return renderIncomeLedgerPage(context);
  if (key === "platform-revenue") return renderPlatformRevenuePage(context);
  if (key.startsWith("roi/")) return renderRoiPage(context);
  if (key.startsWith("referrals/")) return renderReferralsPage(context);
  if (key === "audit-logs") return renderAuditPage(context);
  if (key === "settings") return renderSettingsPage(context);
  if (key === "administrators") return renderAdministratorsPage(context);
  if (key === "roles") return renderRolesPage();
  if (key === "system-health") return renderSystemHealthPage();
  if (key === "reports") {
    return renderReportsPage(context, {
      ...(first(rawFilters.from) ? { from: first(rawFilters.from) } : {}),
      ...(first(rawFilters.to) ? { to: first(rawFilters.to) } : {}),
      ...(first(rawFilters.member) ? { member: first(rawFilters.member) } : {}),
      ...(first(rawFilters.status) ? { status: first(rawFilters.status) } : {}),
      ...(first(rawFilters.transactionType)
        ? { transactionType: first(rawFilters.transactionType) }
        : {}),
    });
  }
  notFound();
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
