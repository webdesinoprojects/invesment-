"use client";
import { useActionState } from "react";
import { transitionInvestmentAction } from "../actions/transition-investment";
import { initialAdminActionResult } from "../../shared/action-result";

export function InvestmentStatusControls({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(transitionInvestmentAction, initialAdminActionResult);
  if (status === "COMPLETED" || status === "CANCELLED") return <span className="text-xs text-slate-500">Terminal</span>;
  return <form action={action} className="flex min-w-80 items-center gap-2"><input type="hidden" name="id" value={id}/><select name="status" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" defaultValue={status==="PAUSED"?"ACTIVE":"PAUSED"}>{status==="PAUSED"&&<option value="ACTIVE">Resume</option>}{status==="ACTIVE"&&<option value="PAUSED">Pause</option>}<option value="CANCELLED">Cancel</option></select><input name="reason" placeholder="Reason" className="min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"/><button disabled={pending} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white">Save</button>{state.message&&<span className={`text-[10px] ${state.ok?"text-emerald-700":"text-red-600"}`}>{state.message}</span>}</form>;
}
