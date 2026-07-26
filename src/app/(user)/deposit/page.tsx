import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { CopyButton } from "@/components/feedback/copy-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DepositHistoryTable } from "@/features/wallet/components/deposit-history-table";
import { DepositRequestForm } from "@/features/wallet/components/deposit-request-form";
import { getDepositPageData } from "@/features/wallet/queries/get-deposit-page-data";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Deposit USDT" };

export default async function DepositPage() {
  const user = await requireUser();
  const data = await getDepositPageData(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="Deposit USDT"
        description="Send funds on the configured BEP-20 network and submit the transaction for verification."
        badge={
          data.wallet ? (
            <Badge variant="outline" className="hidden border-amber-500/30 text-amber-300 sm:inline-flex">
              {data.wallet.network}
            </Badge>
          ) : undefined
        }
      />

      {!data.wallet ? (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Deposit wallet is not configured</h2>
              <p className="mt-1 text-sm text-amber-200/80">
                An administrator must set the receiving address before deposits can be submitted.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
          <section className="rounded-lg border border-border bg-card p-5 text-center">
            <h2 className="font-semibold">Scan to pay</h2>
            <Image
              src={data.wallet.qrDataUrl}
              alt="QR code for the configured BEP-20 deposit address"
              width={320}
              height={320}
              unoptimized
              className="mx-auto mt-4 aspect-square w-full max-w-64 rounded-md bg-white"
            />
          </section>
          <div className="space-y-5">
            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold">Deposit wallet</h2>
                  <p className="text-sm text-muted-foreground">
                    Confirm the network and address before sending.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={data.wallet.address}
                  readOnly
                  aria-label="BEP-20 recipient address"
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-mono text-xs"
                />
                <CopyButton value={data.wallet.address} label="Copy address" />
              </div>
              <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                Send only USDT on {data.wallet.network}. A deposit is credited only after admin verification.
              </p>
            </section>
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold">Submit payment details</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Minimum deposit: {data.wallet.minimumAmount} USDT.
              </p>
              <DepositRequestForm minimumAmount={data.wallet.minimumAmount} />
            </section>
          </div>
        </div>
      )}
      <DepositHistoryTable history={data.history} />
    </main>
  );
}
