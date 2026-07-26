export type DepositHistoryItem = {
  id: string;
  amount: string;
  transactionHash: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export type DepositPageData = {
  wallet: {
    address: string;
    network: string;
    minimumAmount: string;
    qrDataUrl: string;
  } | null;
  history: DepositHistoryItem[];
};
