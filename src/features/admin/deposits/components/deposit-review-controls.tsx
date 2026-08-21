"use client";

import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import { initialAdminActionResult } from "../../shared/action-result";
import { reviewDepositAction } from "../actions/review-deposit";

export function DepositReviewControls({
  id,
  member,
  amount,
}: {
  id: string;
  member: string;
  amount: string;
}) {
  const [state, action, pending] = useActionState(
    reviewDepositAction,
    initialAdminActionResult,
  );
  return (
    <AdminActionDialog
      triggerLabel="Review"
      title="Reject legacy deposit request"
      description={`${member} submitted ${amount}. Principal funding is now handled only through an active investment credit.`}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <textarea
          name="reason"
          rows={3}
          placeholder="Rejection reason"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
          I confirm this legacy request must be closed without crediting earnings.
        </label>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        ) : null}
        <button disabled={pending} name="decision" value="REJECT" className="w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          Reject request
        </button>
      </form>
    </AdminActionDialog>
  );
}
