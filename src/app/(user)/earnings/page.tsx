import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { EarningsTable } from "@/features/earnings/components/earnings-table";
import { EarningsTabs } from "@/features/earnings/components/earnings-tabs";
import { EarningsTotal } from "@/features/earnings/components/earnings-total";
import { NoIncomeDialog } from "@/features/earnings/components/no-income-dialog";
import { getEarningsPageData } from "@/features/earnings/queries/get-earnings-page-data";
import { parseEarningsPage, parseEarningsTab } from "@/features/earnings/types/earnings";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const tab = parseEarningsTab(query.tab);
  const data = await getEarningsPageData({
    userId: user.id,
    tab,
    requestedPage: parseEarningsPage(query.page),
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="Earnings"
        description="Review ROI, referral commissions, level income, and rank rewards."
      />
      <EarningsTotal amount={data.totalIncome} />
      <EarningsTabs activeTab={tab} />
      <NoIncomeDialog show={tab === "rank" && data.rows.length === 0} />
      <EarningsTable tab={tab} rows={data.rows} pagination={data.pagination} />
    </main>
  );
}
