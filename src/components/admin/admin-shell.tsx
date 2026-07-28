"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import type { AdminSession } from "@/lib/admin/session";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ session, pendingActions, children }: { session: AdminSession; pendingActions: number; children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return <div className="min-h-screen bg-[#f3f6f5] text-slate-950">
    <AdminSidebar role={session.role} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
    {mobileMenuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
    <div className="lg:pl-64"><AdminHeader session={session} pendingActions={pendingActions} onMenuOpen={() => setMobileMenuOpen(true)} /><main className="p-3 sm:p-4 md:p-7">{children}</main></div>
  </div>;
}
