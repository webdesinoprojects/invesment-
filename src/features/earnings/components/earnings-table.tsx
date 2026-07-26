import { QueryPagination } from "@/components/data-display/query-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EarningsPageData, EarningsRow, EarningsTab } from "@/features/earnings/types/earnings";
import { formatUsd } from "@/lib/money/format-money";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function EarningsTable({
  tab,
  rows,
  pagination,
}: {
  tab: EarningsTab;
  rows: EarningsRow[];
  pagination: EarningsPageData["pagination"];
}) {
  const hasSource = tab === "referral" || tab === "level";

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-semibold">{tableTitle(tab)}</h2>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No income records found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                {hasSource ? <TableHead>Source member</TableHead> : null}
                {tab === "level" ? <TableHead>Level</TableHead> : null}
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {(pagination.page - 1) * 20 + index + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {dateFormatter.format(new Date(row.creditedAt))}
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  {hasSource ? (
                    <TableCell className="font-mono text-xs">{row.sourceMemberId ?? "-"}</TableCell>
                  ) : null}
                  {tab === "level" ? <TableCell>Level {row.level ?? "-"}</TableCell> : null}
                  <TableCell className="font-semibold tabular-nums text-emerald-300">
                    +{formatUsd(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <QueryPagination
        basePath="/earnings"
        query={{ tab }}
        rowLabel="records"
        {...pagination}
      />
    </section>
  );
}

function tableTitle(tab: EarningsTab): string {
  if (tab === "referral") return "Referral income details";
  if (tab === "level") return "Level income details";
  if (tab === "rank") return "Rank reward details";
  return "ROI income details";
}
