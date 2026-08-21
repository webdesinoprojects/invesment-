import { AdminListing as Listing } from "@/components/admin/admin-listing";
import { can } from "@/features/admin/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/server/permissions/admin-permissions";

import { DepositReviewControls } from "../deposits/components/deposit-review-controls";
import { WithdrawalControls } from "../withdrawals/components/withdrawal-controls";
import { adminDate, adminMoney } from "./format";
import type { AdminPageContext } from "./page-context";

export async function renderDepositsPage(context: AdminPageContext) {
  await requireAdminPermission("deposits.view");
  const pending = context.key.endsWith("pending");
  const data = await getPrisma().depositRequest.findMany({
    where: {
      ...(pending ? { status: "PENDING" as const } : {}),
      ...(context.query
        ? {
            OR: [
              { transactionHash: { contains: context.query, mode: "insensitive" as const } },
              {
                user: {
                  is: {
                    OR: [
                      { memberId: { contains: context.query, mode: "insensitive" as const } },
                      { fullName: { contains: context.query, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: { user: { select: { fullName: true, memberId: true } } },
    orderBy: { submittedAt: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
  });
  const canReview = can(context.session.role, "deposits.review");
  return (
    <Listing
      pagination={{
        path: `/admin/${context.key}`,
        query: context.query,
        page: context.page,
        hasMore: data.length > context.pageSize,
      }}
      title={pending ? "Pending deposits" : "Deposit history"}
      description="Verify QR payments and credit approved member wallets."
      headers={["Member", "Amount", "Network", "Transaction", "Status", "Submitted", "Actions"]}
      rows={data.slice(0, context.pageSize).map((request) => ({
        id: request.id,
        cells: [
          `${request.user.fullName} · ${request.user.memberId}`,
          adminMoney(request.amount),
          request.network,
          request.transactionHash ?? "Not supplied",
          request.status,
          adminDate(request.submittedAt),
        ],
        action:
          request.status === "PENDING" && canReview ? (
            <DepositReviewControls
              id={request.id}
              member={`${request.user.fullName} · ${request.user.memberId}`}
              amount={adminMoney(request.amount)}
            />
          ) : (
            <span>{request.status === "PENDING" ? "View only" : "Reviewed"}</span>
          ),
      }))}
    />
  );
}

export async function renderWithdrawalsPage(context: AdminPageContext) {
  await requireAdminPermission("withdrawals.view");
  const status = context.key.endsWith("pending")
    ? "PENDING"
    : context.key.endsWith("processing")
      ? "PROCESSING"
      : undefined;
  const data = await getPrisma().withdrawalRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(context.query
        ? {
            OR: [
              { walletAddress: { contains: context.query, mode: "insensitive" as const } },
              { paymentHash: { contains: context.query, mode: "insensitive" as const } },
              {
                user: {
                  is: {
                    OR: [
                      { memberId: { contains: context.query, mode: "insensitive" as const } },
                      { fullName: { contains: context.query, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: { user: { select: { fullName: true, memberId: true } } },
    orderBy: { submittedAt: "desc" },
    skip: context.skip,
    take: context.pageSize + 1,
  });
  const canProcess = can(context.session.role, "withdrawals.process");
  return (
    <Listing
      pagination={{
        path: `/admin/${context.key}`,
        query: context.query,
        page: context.page,
        hasMore: data.length > context.pageSize,
      }}
      title={
        status === "PENDING"
          ? "Pending withdrawals"
          : status === "PROCESSING"
            ? "Processing withdrawals"
            : "Withdrawal history"
      }
      description="Manage the payout queue and manual payment lifecycle."
      headers={["Member", "Gross", "Fee", "Member payout", "Payout details", "Status", "Submitted", "Actions"]}
      rows={data.slice(0, context.pageSize).map((request) => ({
        id: request.id,
        cells: [
          `${request.user.fullName} · ${request.user.memberId}`,
          adminMoney(request.amount),
          adminMoney(request.feeAmount),
          adminMoney(request.netAmount),
          request.walletAddress,
          request.status,
          adminDate(request.submittedAt),
        ],
        action:
          canProcess && ["PENDING", "PROCESSING"].includes(request.status) ? (
            <WithdrawalControls
              id={request.id}
              status={request.status}
              member={`${request.user.fullName} · ${request.user.memberId}`}
              amount={adminMoney(request.amount)}
            />
          ) : (
            <span>{["PENDING", "PROCESSING"].includes(request.status) ? "View only" : "Closed"}</span>
          ),
      }))}
    />
  );
}
