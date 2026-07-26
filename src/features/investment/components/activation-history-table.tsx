import { StatusBadge } from "@/components/data-display/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivationHistoryItem } from "@/features/investment/types/investment";
import { formatUsd } from "@/lib/money/format-money";

export function ActivationHistoryTable({ history }: { history: ActivationHistoryItem[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-semibold">Activation ledger</h2>
      {history.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No investments found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Funded by</TableHead>
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
                    }).format(new Date(item.activatedAt))}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.memberName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.memberId}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.fundedByMemberId ?? item.source}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatUsd(item.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
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
