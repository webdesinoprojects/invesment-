import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";

export const reportTransactionTypes = [
  "ALL",
  "DEPOSIT",
  "WITHDRAWAL",
  "INVESTMENT",
  "WALLET",
  "INCOME",
] as const;

export type ReportTransactionType = (typeof reportTransactionTypes)[number];

export type ReportFilters = {
  from?: string;
  to?: string;
  member?: string;
  status?: string;
  transactionType: ReportTransactionType;
};

export type ReportRow = {
  id: string;
  transactionType: Exclude<ReportTransactionType, "ALL">;
  userId: string;
  memberId: string;
  memberName: string;
  status: string;
  amount: Prisma.Decimal;
  reference: string | null;
  occurredAt: Date;
};

export function parseReportFilters(input: {
  from?: string | undefined;
  to?: string | undefined;
  member?: string | undefined;
  status?: string | undefined;
  transactionType?: string | undefined;
}): ReportFilters {
  const transactionType = reportTransactionTypes.includes(
    input.transactionType as ReportTransactionType,
  )
    ? (input.transactionType as ReportTransactionType)
    : "ALL";
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  return {
    ...(input.from && datePattern.test(input.from) ? { from: input.from } : {}),
    ...(input.to && datePattern.test(input.to) ? { to: input.to } : {}),
    ...(input.member?.trim() ? { member: input.member.trim().slice(0, 100) } : {}),
    ...(input.status?.trim() ? { status: input.status.trim().slice(0, 32) } : {}),
    transactionType,
  };
}

export async function getReportRows(
  filters: ReportFilters,
  page: number,
  pageSize: number,
): Promise<{ rows: ReportRow[]; hasMore: boolean }> {
  const rows = await getPrisma().$queryRaw<ReportRow[]>(
    buildReportQuery(filters, pageSize + 1, (page - 1) * pageSize),
  );
  return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function getReportReconciliation() {
  const prisma = getPrisma();
  const [deposits, withdrawals, investments, income, balances] = await Promise.all([
    prisma.depositRequest.aggregate({
      where: { status: "APPROVED" },
      _sum: { approvedAmount: true },
      _count: true,
    }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "PAID" },
      _sum: { netAmount: true },
      _count: true,
    }),
    prisma.investment.aggregate({
      _sum: { amount: true, paidOutAmount: true, payoutCapAmount: true },
      _count: true,
    }),
    prisma.incomeLedgerEntry.aggregate({
      where: { status: "CREDITED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.walletLedgerEntry.findMany({
      distinct: ["userId"],
      orderBy: [{ userId: "asc" }, { sequence: "desc" }],
      select: { balanceAfter: true },
    }),
  ]);
  const walletLiability = balances.reduce(
    (total, balance) => total.plus(balance.balanceAfter),
    new Prisma.Decimal(0),
  );
  return {
    approvedDeposits: deposits._sum.approvedAmount ?? new Prisma.Decimal(0),
    approvedDepositCount: deposits._count,
    paidWithdrawals: withdrawals._sum.netAmount ?? new Prisma.Decimal(0),
    paidWithdrawalCount: withdrawals._count,
    investmentPrincipal: investments._sum.amount ?? new Prisma.Decimal(0),
    investmentPaidOut: investments._sum.paidOutAmount ?? new Prisma.Decimal(0),
    payoutCap: investments._sum.payoutCapAmount ?? new Prisma.Decimal(0),
    investmentCount: investments._count,
    creditedIncome: income._sum.amount ?? new Prisma.Decimal(0),
    incomeCount: income._count,
    walletLiability,
    walletCount: balances.length,
  };
}

function buildReportQuery(filters: ReportFilters, limit: number, offset: number) {
  const conditions: Prisma.Sql[] = [];
  if (filters.from) {
    conditions.push(
      Prisma.sql`transactions."occurredAt" >= ${new Date(`${filters.from}T00:00:00+05:30`)}`,
    );
  }
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00+05:30`);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(Prisma.sql`transactions."occurredAt" < ${end}`);
  }
  if (filters.member) {
    const member = `%${filters.member}%`;
    conditions.push(
      Prisma.sql`(users."memberId" ILIKE ${member} OR users."fullName" ILIKE ${member})`,
    );
  }
  if (filters.status) {
    conditions.push(Prisma.sql`transactions.status ILIKE ${filters.status}`);
  }
  if (filters.transactionType !== "ALL") {
    conditions.push(
      Prisma.sql`transactions."transactionType" = ${filters.transactionType}`,
    );
  }
  const where = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  return Prisma.sql`
    WITH transactions AS (
      SELECT id, 'DEPOSIT'::text AS "transactionType", "userId",
        status::text AS status, amount, "transactionHash" AS reference,
        "submittedAt" AS "occurredAt"
      FROM "deposit_requests"
      UNION ALL
      SELECT id, 'WITHDRAWAL'::text, "userId", status::text, amount,
        COALESCE("paymentHash", "walletAddress"), "submittedAt"
      FROM "withdrawal_requests"
      UNION ALL
      SELECT id, 'INVESTMENT'::text, "userId", status::text, amount,
        id::text, "createdAt"
      FROM investments
      UNION ALL
      SELECT id, 'WALLET'::text, "userId", direction::text, amount,
        COALESCE("idempotencyKey", id::text), "createdAt"
      FROM "wallet_ledger_entries"
      UNION ALL
      SELECT id, 'INCOME'::text, "userId", status::text, amount,
        "idempotencyKey", "creditedAt"
      FROM "income_ledger_entries"
    )
    SELECT transactions.id, transactions."transactionType", transactions."userId",
      users."memberId", users."fullName" AS "memberName", transactions.status,
      transactions.amount, transactions.reference, transactions."occurredAt"
    FROM transactions
    INNER JOIN "user_profiles" AS users ON users.id = transactions."userId"
    ${where}
    ORDER BY transactions."occurredAt" DESC, transactions.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}
