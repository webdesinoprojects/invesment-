import { StatusBadge } from "@/components/data-display/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamPagination } from "@/features/team/components/team-pagination";
import type { TeamMemberRow, TeamPageData, TeamTab } from "@/features/team/types/team";
import { formatUsd } from "@/lib/money/format-money";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Not activated";
}

export function TeamMembersTable({
  tab,
  rows,
  pagination,
}: {
  tab: TeamTab;
  rows: TeamMemberRow[];
  pagination: TeamPageData["pagination"];
}) {
  const isDirect = tab === "direct";

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-semibold">{tableTitle(tab)}</h2>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No members found in this view.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                {!isDirect ? <TableHead>Sponsor</TableHead> : null}
                <TableHead>Joining date</TableHead>
                <TableHead>Activation date</TableHead>
                {!isDirect ? <TableHead>Amount</TableHead> : null}
                <TableHead>Mobile</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.fullName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.memberId}</p>
                  </TableCell>
                  {!isDirect ? (
                    <TableCell className="font-mono text-xs">{row.sponsorMemberId ?? "-"}</TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap">{formatDate(row.joinedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(row.activatedAt)}</TableCell>
                  {!isDirect ? (
                    <TableCell className="font-semibold tabular-nums">{formatUsd(row.amount)}</TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap">{row.mobile}</TableCell>
                  <TableCell>Rank {row.rank}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <TeamPagination tab={tab} {...pagination} />
    </section>
  );
}

function tableTitle(tab: TeamTab): string {
  if (tab === "direct") return "Direct members";
  if (tab === "topup") return "Topup members";
  if (tab === "today") return "Today topup members";
  return "All team members";
}
