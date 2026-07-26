export const earningsTabs = ["roi", "referral", "level", "rank"] as const;

export type EarningsTab = (typeof earningsTabs)[number];

export type EarningsRow = {
  id: string;
  creditedAt: string;
  description: string;
  amount: string;
  sourceMemberId: string | null;
  level: number | null;
  percent: string | null;
};

export type EarningsPageData = {
  totalIncome: string;
  rows: EarningsRow[];
  pagination: {
    page: number;
    totalPages: number;
    totalRows: number;
  };
};

export function parseEarningsTab(value: string | string[] | undefined): EarningsTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return earningsTabs.find((tab) => tab === candidate) ?? "roi";
}

export function parseEarningsPage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
