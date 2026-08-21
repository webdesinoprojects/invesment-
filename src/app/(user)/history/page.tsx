import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { HistoryTabs } from "@/features/history/components/history-tabs";
import { MainWalletTable } from "@/features/history/components/main-wallet-table";
import { RequestHistoryTable } from "@/features/history/components/request-history-table";
import { getHistoryPageData } from "@/features/history/queries/get-history-page-data";
import { parseHistoryPage, parseHistoryTab } from "@/features/history/types/history";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Wallet History" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const tab = parseHistoryTab(query.tab);
  const data = await getHistoryPageData({
    userId: user.id,
    tab,
    requestedPage: parseHistoryPage(query.page),
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="Wallet history"
        description="Track earnings, withdrawals, and historical deposit requests."
      />
      <HistoryTabs activeTab={tab} />
      {data.tab === "main" ? (
        <MainWalletTable rows={data.rows} pagination={data.pagination} />
      ) : (
        <RequestHistoryTable tab={data.tab} rows={data.rows} pagination={data.pagination} />
      )}
    </main>
  );
}
