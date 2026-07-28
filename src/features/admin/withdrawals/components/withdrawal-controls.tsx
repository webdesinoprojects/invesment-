"use client";

import { useActionState } from "react";
import { transitionWithdrawalAction } from "../actions/transition-withdrawal";
import { initialAdminActionResult } from "../../shared/action-result";

export function WithdrawalControls({ id, status, member, amount }: { id: string; status: string; member: string; amount: string }) {
  const [state, action, pending] = useActionState(transitionWithdrawalAction, initialAdminActionResult);
  return <details className="relative">
    <summary className="cursor-pointer list-none rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Manage</summary>
    <form action={action} className="absolute right-0 z-20 mt-2 w-80 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <input type="hidden" name="id" value={id} />
      <p className="whitespace-normal text-xs text-slate-600"><strong>{member}</strong> · <strong>{amount}</strong>. Sending funds occurs outside this form; select Pay only after the external transfer succeeds.</p>
      {status === "PROCESSING" && <input name="paymentHash" placeholder="0x… BSC payment hash (required for Pay)" className="w-full rounded-lg border border-slate-200 p-2 text-xs" />}
      <textarea name="reason" rows={2} placeholder="Reason or payment note" className="w-full rounded-lg border border-slate-200 p-2 text-xs" />
      {state.message && <p className={`whitespace-normal text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      <div className="grid grid-cols-2 gap-2">
        {status === "PENDING" && <button disabled={pending} name="transition" value="PROCESS" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Start processing</button>}
        {status === "PROCESSING" && <button disabled={pending} name="transition" value="PAY" className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold">Record paid</button>}
        <button disabled={pending} name="transition" value="REJECT" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Reject & release</button>
        {status === "PROCESSING" && <button disabled={pending} name="transition" value="FAIL" className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Fail & release</button>}
      </div>
    </form>
  </details>;
}
