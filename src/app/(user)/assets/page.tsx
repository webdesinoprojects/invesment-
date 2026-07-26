import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { AssetsOverview } from "@/features/assets/components/assets-overview";
import { getAssetsData } from "@/features/assets/queries/get-assets-data";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const user = await requireUser();
  const data = await getAssetsData(user.id);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="Assets"
        description="A consolidated view of your wallet, investments, income, and withdrawals."
      />
      <AssetsOverview data={data} />
    </main>
  );
}
