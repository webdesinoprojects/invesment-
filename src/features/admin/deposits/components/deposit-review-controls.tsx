"use client";

import { useActionState } from "react";
import { reviewDepositAction } from "../actions/review-deposit";
import { initialAdminActionResult } from "../../shared/action-result";

export function DepositReviewControls({ id, member, amount }: { id: string; member: string; amount: string }) {
  const [state, action, pending] = useActionState(reviewDepositAction, initialAdminActionResult);
  return <details className="relative">
    <summary className="cursor-pointer list-none rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Review</summary>
    <form action={action} className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <input type="hidden" name="id" value={id} />
      <p className="whitespace-normal text-xs text-slate-600">Review <strong>{amount}</strong> from <strong>{member}</strong>. Approval credits the wallet exactly once.</p>
      <textarea name="reason" rows={2} placeholder="Reason required when rejecting" className="w-full rounded-lg border border-slate-200 p-2 text-xs" />
      {state.message && <p className={`whitespace-normal text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      <div className="flex gap-2">
        <button disabled={pending} name="decision" value="APPROVE" className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold">Approve</button>
        <button disabled={pending} name="decision" value="REJECT" className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Reject</button>
      </div>
    </form>
  </details>;
}
