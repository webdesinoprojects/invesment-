import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusClass = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  PROCESSING: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  PAID: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-300",
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  BLOCKED: "border-red-500/30 bg-red-500/10 text-red-300",
  ARCHIVED: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  COMPLETED: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  CANCELLED: "border-red-500/30 bg-red-500/10 text-red-300",
  FAILED: "border-red-500/30 bg-red-500/10 text-red-300",
  PAUSED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusClass }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusClass[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
