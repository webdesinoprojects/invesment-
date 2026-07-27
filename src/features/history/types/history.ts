export const historyTabs = ["main", "withdraw", "deposit"] as const;

export type HistoryTab = (typeof historyTabs)[number];

export type HistoryPagination = {
  page: number;
  totalPages: number;
  totalRows: number;
};

export type MainWalletRow = {
  id: string;
  date: string;
  credit: string;
  debit: string;
  deduction: string;
  description: string;
};

export type RequestHistoryRow = {
  id: string;
  date: string;
  amount: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "PAID"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "FAILED";
  reference: string | null;
  rejectionReason: string | null;
};

export type HistoryPageData =
  | { tab: "main"; rows: MainWalletRow[]; pagination: HistoryPagination }
  | { tab: "withdraw"; rows: RequestHistoryRow[]; pagination: HistoryPagination }
  | { tab: "deposit"; rows: RequestHistoryRow[]; pagination: HistoryPagination };

export function parseHistoryTab(value: string | string[] | undefined): HistoryTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return historyTabs.find((tab) => tab === candidate) ?? "main";
}

export function parseHistoryPage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
