import type { Metadata } from "next";

import { PortfolioOverview } from "@/features/user-dashboard/components/portfolio-overview";
import { ReferralCard } from "@/features/user-dashboard/components/referral-card";
import { ShortcutGrid } from "@/features/user-dashboard/components/shortcut-grid";
import { WalletBalanceCard } from "@/features/user-dashboard/components/wallet-balance-card";
import { getDashboardData } from "@/features/user-dashboard/queries/get-dashboard-data";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const dashboard = await getDashboardData(user.id, user.memberId);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-5 sm:px-6 sm:py-7">
      <WalletBalanceCard balance={dashboard.walletBalance} />
      <ReferralCard
        directTeamCount={dashboard.directTeamCount}
        totalDownlineCount={dashboard.totalDownlineCount}
        directIncome={dashboard.income.directReferral}
        levelIncome={dashboard.income.levelIncome}
        rankRewards={dashboard.income.rankRewards}
        referralUrl={dashboard.referralUrl}
        isReferralActive={dashboard.isReferralActive}
      />
      <ShortcutGrid />
      <PortfolioOverview
        activeInvestment={dashboard.activeInvestment}
        dailyRoi={dashboard.income.dailyRoi}
        todayBusiness={dashboard.todayBusiness}
        totalBusiness={dashboard.totalBusiness}
        totalIncome={dashboard.income.total}
      />
    </main>
  );
}
