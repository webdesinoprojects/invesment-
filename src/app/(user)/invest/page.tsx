import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ActivationHistoryTable } from "@/features/investment/components/activation-history-table";
import { InvestmentPanel } from "@/features/investment/components/investment-panel";
import { getInvestmentPageData } from "@/features/investment/queries/get-investment-page-data";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Investment Activation" };

export default async function InvestPage() {
  const user = await requireUser();
  const data = await getInvestmentPageData(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="Investment activation"
        description="Fund an activation from your available wallet balance."
        badge={
          data.monthlyRoiPercent ? (
            <Badge variant="outline" className="hidden border-emerald-500/30 text-emerald-300 sm:inline-flex">
              {data.monthlyRoiPercent}% monthly ROI
            </Badge>
          ) : undefined
        }
      />
      <InvestmentPanel
        availableBalance={data.availableBalance}
        minimumAmount={data.minimumAmount}
        monthlyRoiPercent={data.monthlyRoiPercent}
        durationMonths={data.durationMonths}
        memberId={user.memberId}
        memberName={user.fullName}
        requestToken={randomUUID()}
      />
      <ActivationHistoryTable history={data.history} />
    </main>
  );
}
