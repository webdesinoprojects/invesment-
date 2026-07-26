import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { WithdrawalAvailabilityDialog } from "@/features/wallet/components/withdrawal-availability-dialog";
import { WithdrawalHistoryTable } from "@/features/wallet/components/withdrawal-history-table";
import { WithdrawalPanel } from "@/features/wallet/components/withdrawal-panel";
import { getWithdrawalPageData } from "@/features/wallet/queries/get-withdrawal-page-data";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Withdrawal" };

export default async function WithdrawalPage() {
  const user = await requireUser();
  const data = await getWithdrawalPageData(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="Withdrawal"
        description="Request a USDT payout to your saved BEP-20 wallet."
        badge={
          <Badge
            variant="outline"
            className={
              data.isOpen
                ? "hidden border-emerald-500/30 text-emerald-300 sm:inline-flex"
                : "hidden border-amber-500/30 text-amber-300 sm:inline-flex"
            }
          >
            {data.isOpen ? "Window open" : "Window closed"}
          </Badge>
        }
      />
      <WithdrawalAvailabilityDialog
        show={!data.isOpen && data.allowedDays.length > 0}
        allowedDays={data.allowedDays}
      />
      <WithdrawalPanel
        availableBalance={data.availableBalance}
        walletAddress={data.walletAddress}
        minimumAmount={data.minimumAmount}
        isOpen={data.isOpen}
        requestToken={randomUUID()}
      />
      <WithdrawalHistoryTable history={data.history} />
    </main>
  );
}
