"use client";
import { useActionState,useState } from "react";
import { manualActivationAction } from "../actions/manual-activation";
import { initialAdminActionResult } from "../../shared/action-result";

export function ManualActivationForm(){
 const[state,action,pending]=useActionState(manualActivationAction,initialAdminActionResult);
 const[token]=useState(()=>crypto.randomUUID());
 return <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Manual wallet activation</h2><p className="mt-1 text-xs text-slate-500">Uses the same minimum, wallet debit, payout cap, referral activation and commission service as user activation.</p><form action={action} className="mt-4 grid gap-3 md:grid-cols-4"><input type="hidden" name="requestToken" value={token}/><input name="memberQuery" required placeholder="Member ID, name, email or mobile" className="rounded-xl border border-slate-200 px-3 py-2 text-sm"/><input name="amount" required inputMode="decimal" placeholder="Amount USDT" className="rounded-xl border border-slate-200 px-3 py-2 text-sm"/><input name="reason" required placeholder="Activation reason" className="rounded-xl border border-slate-200 px-3 py-2 text-sm"/><button disabled={pending} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">{pending?"Activating…":"Activate investment"}</button></form>{state.message&&<p className={`mt-3 text-sm ${state.ok?"text-emerald-700":"text-red-600"}`}>{state.message}</p>}</section>;
}
