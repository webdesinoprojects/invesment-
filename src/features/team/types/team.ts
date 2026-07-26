export const teamTabs = ["all", "topup", "today", "direct"] as const;

export type TeamTab = (typeof teamTabs)[number];

export type TeamMemberRow = {
  id: string;
  memberId: string;
  fullName: string;
  sponsorMemberId: string | null;
  joinedAt: string;
  activatedAt: string | null;
  mobile: string;
  rank: number;
  amount: string;
  status: "PENDING" | "ACTIVE" | "BLOCKED";
};

export type TeamPageData = {
  directCount: number;
  downlineCount: number;
  referralUrl: string;
  isReferralActive: boolean;
  rows: TeamMemberRow[];
  pagination: {
    page: number;
    totalPages: number;
    totalRows: number;
  };
};

export function parseTeamTab(value: string | string[] | undefined): TeamTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return teamTabs.find((tab) => tab === candidate) ?? "all";
}

export function parsePage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
