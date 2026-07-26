import { StatusBadge } from "@/components/data-display/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WithdrawalHistoryItem } from "@/features/wallet/types/withdrawal";
import { formatUsd } from "@/lib/money/format-money";

function shortValue(value: string): string {
  if (value.length <= 22) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function WithdrawalHistoryTable({ history }: { history: WithdrawalHistoryItem[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-semibold">Withdrawal requests</h2>
      {history.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No withdrawal requests found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.submittedAt))}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{shortValue(item.walletAddress)}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatUsd(item.amount)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <StatusBadge status={item.status} />
                      {item.status === "REJECTED" && item.rejectionReason ? (
                        <p className="max-w-64 text-xs text-red-300">{item.rejectionReason}</p>
                      ) : null}
                      {item.status === "APPROVED" && item.paymentHash ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          {shortValue(item.paymentHash)}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
