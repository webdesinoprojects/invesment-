import { QueryPagination } from "@/components/data-display/query-pagination";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HistoryPagination, HistoryTab, RequestHistoryRow } from "@/features/history/types/history";
import { formatUsd } from "@/lib/money/format-money";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function shortReference(value: string | null): string {
  if (!value) return "-";
  return value.length > 24 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

export function RequestHistoryTable({
  tab,
  rows,
  pagination,
}: {
  tab: Extract<HistoryTab, "withdraw" | "deposit">;
  rows: RequestHistoryRow[];
  pagination: HistoryPagination;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-semibold">{tab === "deposit" ? "Deposit requests log" : "Withdrawal requests log"}</h2>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No data found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>{tab === "deposit" ? "Transaction" : "Payout details / reference"}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{dateFormatter.format(new Date(row.date))}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatUsd(row.amount)}</TableCell>
                  <TableCell className="font-mono text-xs">{shortReference(row.reference)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <StatusBadge status={row.status} />
                      {row.status === "REJECTED" && row.rejectionReason ? (
                        <p className="max-w-64 text-xs text-red-300">{row.rejectionReason}</p>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <QueryPagination basePath="/history" query={{ tab }} rowLabel="requests" {...pagination} />
    </section>
  );
}
