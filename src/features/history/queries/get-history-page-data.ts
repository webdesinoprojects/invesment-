import "server-only";

import type {
  HistoryPageData,
  HistoryPagination,
  HistoryTab,
  MainWalletRow,
} from "@/features/history/types/history";
import { getPrisma } from "@/lib/db/prisma";

const PAGE_SIZE = 20;

export async function getHistoryPageData({
  userId,
  tab,
  requestedPage,
}: {
  userId: string;
  tab: HistoryTab;
  requestedPage: number;
}): Promise<HistoryPageData> {
  if (tab === "withdraw") return getWithdrawalHistory(userId, requestedPage);
  if (tab === "deposit") return getDepositHistory(userId, requestedPage);
  return getMainWalletHistory(userId, requestedPage);
}

async function getMainWalletHistory(userId: string, requestedPage: number): Promise<HistoryPageData> {
  const db = getPrisma();
  const totalRows = await db.walletLedgerEntry.count({ where: { userId } });
  const pagination = createPagination(totalRows, requestedPage);
  const entries = await db.walletLedgerEntry.findMany({
    where: { userId },
    orderBy: { sequence: "desc" },
    skip: (pagination.page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      direction: true,
      amount: true,
      description: true,
      createdAt: true,
    },
  });

  return {
    tab: "main",
    rows: entries.map((entry) => mapWalletEntry(entry)),
    pagination,
  };
}

async function getWithdrawalHistory(userId: string, requestedPage: number): Promise<HistoryPageData> {
  const db = getPrisma();
  const totalRows = await db.withdrawalRequest.count({ where: { userId } });
  const pagination = createPagination(totalRows, requestedPage);
  const entries = await db.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    skip: (pagination.page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      amount: true,
      status: true,
      walletAddress: true,
      paymentHash: true,
      rejectionReason: true,
      submittedAt: true,
    },
  });

  return {
    tab: "withdraw",
    rows: entries.map((entry) => ({
      id: entry.id,
      date: entry.submittedAt.toISOString(),
      amount: entry.amount.toString(),
      status: entry.status,
      reference: entry.paymentHash ?? entry.walletAddress,
      rejectionReason: entry.rejectionReason,
    })),
    pagination,
  };
}

async function getDepositHistory(userId: string, requestedPage: number): Promise<HistoryPageData> {
  const db = getPrisma();
  const totalRows = await db.depositRequest.count({ where: { userId } });
  const pagination = createPagination(totalRows, requestedPage);
  const entries = await db.depositRequest.findMany({
    where: { userId },
    orderBy: { submittedAt: "desc" },
    skip: (pagination.page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      amount: true,
      status: true,
      transactionHash: true,
      rejectionReason: true,
      submittedAt: true,
    },
  });

  return {
    tab: "deposit",
    rows: entries.map((entry) => ({
      id: entry.id,
      date: entry.submittedAt.toISOString(),
      amount: entry.amount.toString(),
      status: entry.status,
      reference: entry.transactionHash,
      rejectionReason: entry.rejectionReason,
    })),
    pagination,
  };
}

function createPagination(totalRows: number, requestedPage: number): HistoryPagination {
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  return { page: Math.min(requestedPage, totalPages), totalPages, totalRows };
}

function mapWalletEntry(entry: {
  id: string;
  direction: "CREDIT" | "DEBIT" | "DEDUCTION" | "HOLD" | "RELEASE" | "SETTLE";
  amount: { toString(): string };
  description: string;
  createdAt: Date;
}): MainWalletRow {
  const amount = entry.amount.toString();
  return {
    id: entry.id,
    date: entry.createdAt.toISOString(),
    credit: entry.direction === "CREDIT" || entry.direction === "RELEASE" ? amount : "0",
    debit: entry.direction === "DEBIT" ? amount : "0",
    deduction: entry.direction === "DEDUCTION" || entry.direction === "HOLD" ? amount : "0",
    description: entry.description,
  };
}
