import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  TrendingUp,
} from "lucide-react";
import type { TodayRoiStatus } from "@/features/admin/roi/get-today-roi-status";

function completionTime(value: Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function TodayRoiStatusCard({
  status,
}: {
  status: TodayRoiStatus;
}) {
  const run = status.run;
  let Icon = Clock3;
  let title = "Today's ROI is scheduled";
  let detail = "The automatic run starts daily at 12:30 AM IST.";
  let tone = "border-sky-200 bg-sky-50 text-sky-800";

  if (!run && status.expected) {
    Icon = AlertTriangle;
    title = "Today's ROI run is missing";
    detail = "No run was recorded by the 2:00 AM IST alert threshold.";
    tone = "border-red-200 bg-red-50 text-red-800";
  } else if (run?.status === "COMPLETED") {
    Icon = CheckCircle2;
    title = "Today's ROI completed";
    detail = `${run.credited} credited from ${run.processed} active investments at ${completionTime(run.completedAt)} IST.`;
    tone = "border-emerald-200 bg-emerald-50 text-emerald-800";
  } else if (run?.status === "FAILED") {
    Icon = AlertTriangle;
    title = "Today's ROI requires attention";
    detail = `${run.credited} credited, ${run.failed} failed. ${run.errorDetail ?? "Review the run history."}`;
    tone = "border-red-200 bg-red-50 text-red-800";
  } else if (run?.status === "RUNNING") {
    Icon = status.stalled ? AlertTriangle : LoaderCircle;
    title = status.stalled
      ? "Today's ROI run may be stalled"
      : "Today's ROI is processing";
    detail = `${run.processed} investments recorded so far.`;
    tone = status.stalled
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-sky-200 bg-sky-50 text-sky-800";
  }

  return (
    <Link
      href="/admin/roi/history"
      className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:brightness-[.98] ${tone}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/70">
        <Icon
          className={`size-5 ${run?.status === "RUNNING" && !status.stalled ? "animate-spin" : ""}`}
        />
      </span>
      <span className="min-w-0">
        <strong className="block text-sm">{title}</strong>
        <span className="mt-0.5 block text-xs opacity-80">{detail}</span>
      </span>
      <TrendingUp className="ml-auto hidden size-5 shrink-0 sm:block" />
    </Link>
  );
}
