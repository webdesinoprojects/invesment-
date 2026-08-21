import { QueryPagination } from "@/components/data-display/query-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HistoryPagination, MainWalletRow } from "@/features/history/types/history";
import { formatUsd } from "@/lib/money/format-money";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function MainWalletTable({
  rows,
  pagination,
}: {
  rows: MainWalletRow[];
  pagination: HistoryPagination;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-semibold">Earnings ledger</h2>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No data found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Deduction</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{dateFormatter.format(new Date(row.date))}</TableCell>
                  <TableCell className="font-semibold tabular-nums text-emerald-300">
                    {row.credit === "0" ? "-" : `+${formatUsd(row.credit)}`}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {row.debit === "0" ? "-" : `-${formatUsd(row.debit)}`}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums text-amber-300">
                    {row.deduction === "0" ? "-" : `-${formatUsd(row.deduction)}`}
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <QueryPagination basePath="/history" query={{ tab: "main" }} rowLabel="entries" {...pagination} />
    </section>
  );
}
