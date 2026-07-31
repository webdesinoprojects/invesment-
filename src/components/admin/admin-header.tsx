"use client";
import { Menu, Shield } from "lucide-react";
import type { AdminSession } from "@/lib/admin/session";
import { AdminNotifications } from "./admin-notifications";
export function AdminHeader({ session, pendingActions, onMenuOpen }: { session: AdminSession; pendingActions: number; onMenuOpen: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:h-20 lg:px-7">
      <button aria-label="Open navigation" onClick={onMenuOpen} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"><Menu className="size-5" /></button>
      <div className="hidden lg:block"><p className="text-sm font-bold text-slate-800">NEX-GEN POWER</p></div>
      <span className="ml-auto hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex"><span className="size-2 rounded-full bg-emerald-500" />Database connected</span>
      <div className="ml-auto sm:ml-0"><AdminNotifications initialCount={pendingActions} /></div>
      <div className="text-right leading-tight lg:hidden"><p className="text-xs font-bold text-slate-800">NEX-GEN POWER</p><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Admin</p></div>
      <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:gap-3 sm:pl-3">
        <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white sm:size-10"><Shield className="size-4" /></span>
        <div className="hidden sm:block"><p className="max-w-40 truncate text-sm font-semibold">{session.email}</p><p className="text-[10px] font-bold tracking-wider text-emerald-600">{session.role.replace("_", " ")}</p></div>
      </div>
    </header>
  );
}
