import { Share2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TeamMembersTable } from "@/features/team/components/team-members-table";
import { TeamReferralCard } from "@/features/team/components/team-referral-card";
import { TeamSummary } from "@/features/team/components/team-summary";
import { TeamTabs } from "@/features/team/components/team-tabs";
import { getTeamPageData } from "@/features/team/queries/get-team-page-data";
import { parsePage, parseTeamTab } from "@/features/team/types/team";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "My Team" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const tab = parseTeamTab(query.tab);
  const data = await getTeamPageData({
    userId: user.id,
    memberId: user.memberId,
    tab,
    requestedPage: parsePage(query.page),
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <PageHeader
        title="My team"
        description="View and manage your referral network."
        badge={
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="#refer">
              <Share2 aria-hidden="true" />
              Refer and earn
            </Link>
          </Button>
        }
      />
      <TeamSummary directCount={data.directCount} downlineCount={data.downlineCount} />
      <TeamReferralCard referralUrl={data.referralUrl} isActive={data.isReferralActive} />
      <TeamTabs activeTab={tab} />
      <TeamMembersTable tab={tab} rows={data.rows} pagination={data.pagination} />
    </main>
  );
}
