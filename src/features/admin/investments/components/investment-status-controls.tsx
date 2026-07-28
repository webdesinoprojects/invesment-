"use client";

import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import { initialAdminActionResult } from "../../shared/action-result";
import { transitionInvestmentAction } from "../actions/transition-investment";

export function InvestmentStatusControls({
  id,
  status,
  member,
  amount,
}: {
  id: string;
  status: string;
  member: string;
  amount: string;
}) {
  const [state, action, pending] = useActionState(
    transitionInvestmentAction,
    initialAdminActionResult,
  );
  if (status === "COMPLETED" || status === "CANCELLED") {
    return <span className="text-xs text-slate-500">Terminal</span>;
  }
  return (
    <AdminActionDialog
      triggerLabel="Manage"
      title="Confirm investment lifecycle change"
      description={`${member} · ${amount} · current status ${status}. Pause stops ROI eligibility until resumed; cancellation is terminal.`}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <select
          name="status"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          defaultValue={status === "PAUSED" ? "ACTIVE" : "PAUSED"}
        >
          {status === "PAUSED" ? <option value="ACTIVE">Resume</option> : null}
          {status === "ACTIVE" ? <option value="PAUSED">Pause</option> : null}
          <option value="CANCELLED">Cancel permanently</option>
        </select>
        <input name="reason" placeholder="Required for pause or cancellation" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
          I confirm the target investment, current status and lifecycle consequence.
        </label>
        <button disabled={pending} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">
          {pending ? "Saving..." : "Confirm change"}
        </button>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </AdminActionDialog>
  );
}
