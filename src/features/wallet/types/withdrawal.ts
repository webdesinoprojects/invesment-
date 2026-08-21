export type WithdrawalHistoryItem = {
  id: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  walletAddress: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "REJECTED" | "CANCELLED" | "FAILED";
  submittedAt: string;
  reviewedAt: string | null;
  paymentHash: string | null;
  rejectionReason: string | null;
};

export type WithdrawalPageData = {
  availableBalance: string;
  walletAddress: string | null;
  minimumAmount: string | null;
  feePercent: string | null;
  allowedDays: number[];
  isOpen: boolean;
  history: WithdrawalHistoryItem[];
};

export type CreateWithdrawalResult =
  | { ok: true }
  | {
      ok: false;
      code: "DUPLICATE_REQUEST" | "INSUFFICIENT_FUNDS" | "WALLET_NOT_CONFIGURED";
    };
