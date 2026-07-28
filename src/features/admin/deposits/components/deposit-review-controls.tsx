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
      title="Confirm deposit decision"
      description={`${member} submitted ${amount}. Approval creates one immutable wallet credit; rejection closes the request without crediting funds.`}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <textarea
          name="reason"
          rows={3}
          placeholder="Reason required when rejecting"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
          I verified the target member, amount and payment evidence and confirm this final decision.
        </label>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button disabled={pending} name="decision" value="APPROVE" className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold">
            Approve and credit
          </button>
          <button disabled={pending} name="decision" value="REJECT" className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            Reject
          </button>
        </div>
      </form>
    </AdminActionDialog>
  );
}
