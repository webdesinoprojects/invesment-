"use client";

import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import { initialAdminActionResult } from "../../shared/action-result";
import { transitionWithdrawalAction } from "../actions/transition-withdrawal";

export function WithdrawalControls({
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
    transitionWithdrawalAction,
    initialAdminActionResult,
  );
  return (
    <AdminActionDialog
      triggerLabel="Manage"
      title="Confirm withdrawal transition"
      description={`${member} requested ${amount}. Recording payment settles the existing hold; rejection or failure releases it exactly once.`}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <p className="text-xs text-amber-700">
          Sending funds occurs outside this form. Select Record paid only after the external
          transfer succeeds.
        </p>
        {status === "PROCESSING" ? (
          <input
            name="paymentHash"
            placeholder="UPI or bank payment reference (required)"
            className="w-full rounded-lg border border-slate-200 p-2 text-xs"
          />
        ) : null}
        <textarea
          name="reason"
          rows={3}
          placeholder="Reason or payment note"
          className="w-full rounded-lg border border-slate-200 p-2 text-xs"
        />
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          {status === "PENDING" ? (
            <button disabled={pending} name="transition" value="PROCESS" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">
              Start processing
            </button>
          ) : null}
          {status === "PROCESSING" ? (
            <button disabled={pending} name="transition" value="PAY" className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold">
              Record paid
            </button>
          ) : null}
          <button disabled={pending} name="transition" value="REJECT" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            Reject and release
          </button>
          {status === "PROCESSING" ? (
            <button disabled={pending} name="transition" value="FAIL" className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
              Fail and release
            </button>
          ) : null}
        </div>
      </form>
    </AdminActionDialog>
  );
}
