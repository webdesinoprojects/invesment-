"use client";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { adminLoginAction, type AdminLoginState } from "./actions";
const initialState: AdminLoginState = {};
export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, initialState);
  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block space-y-2 text-sm font-medium text-slate-700">Administrator email
        <span className="relative block"><Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="email" type="email" required autoComplete="username" placeholder="admin@company.com" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></span>
      </label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">Password
        <span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="password" type="password" required autoComplete="current-password" placeholder="Enter your password" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></span>
      </label>
      {state.error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-emerald-600 disabled:opacity-60">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <>Sign in securely <ArrowRight className="size-4" /></>}
      </button>
    </form>
  );
}
