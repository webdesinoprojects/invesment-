import { can } from "@/features/admin/permissions";
import {
  getReportRows,
  parseReportFilters,
} from "@/features/admin/reports/report-query";
import { getAdminSession } from "@/lib/admin/session";

const EXPORT_PAGE_SIZE = 1000;
const MAX_EXPORT_ROWS = 100_000;

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return new Response(null, { status: 401 });
  if (!can(session.role, "reports.export")) return new Response(null, { status: 403 });

  const url = new URL(request.url);
  const filters = parseReportFilters({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    member: url.searchParams.get("member") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    transactionType: url.searchParams.get("transactionType") ?? undefined,
  });
  const lines = [
    ["Date (IST)", "Member ID", "Member name", "Type", "Status", "Amount (USDT)", "Reference"],
  ];
  for (let page = 1; lines.length <= MAX_EXPORT_ROWS; page += 1) {
    const result = await getReportRows(filters, page, EXPORT_PAGE_SIZE);
    for (const row of result.rows) {
      lines.push([
        formatIndiaCsvDate(row.occurredAt),
        row.memberId,
        row.memberName,
        row.transactionType,
        row.status,
        row.amount.toFixed(6),
        row.reference ?? "",
      ]);
    }
    if (!result.hasMore) break;
  }
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="naturepower-report-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function formatIndiaCsvDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function csvCell(value: string) {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}
