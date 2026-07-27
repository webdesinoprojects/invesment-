export type ActivationHistoryItem = {
  id: string;
  amount: string;
  memberId: string;
  memberName: string;
  fundedByMemberId: string | null;
  source: "WALLET" | "OFFLINE" | "ADMIN";
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  activatedAt: string;
};

export type InvestmentPageData = {
  availableBalance: string;
  minimumAmount: string | null;
  monthlyRoiPercent: string | null;
  durationMonths: number | null;
  history: ActivationHistoryItem[];
};

export type ActivateInvestmentResult =
  | { ok: true; investmentId: string }
  | {
      ok: false;
      code:
        | "DUPLICATE_REQUEST"
        | "INSUFFICIENT_FUNDS"
        | "MEMBER_NOT_FOUND"
        | "MEMBER_BLOCKED";
    };
