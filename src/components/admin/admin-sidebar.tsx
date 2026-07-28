"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, BadgeDollarSign, ChartNoAxesCombined, ChevronDown, CircleDollarSign,
  ClipboardList, CreditCard, Gauge, HeartPulse, Landmark, LogOut, Network,
  ReceiptText, Settings, ShieldCheck, Users, WalletCards, X,
} from "lucide-react";
import type { AdminRole } from "@/generated/prisma/client";
import { adminLogoutAction } from "@/features/admin/auth/actions";

const items = [
  { label: "Dashboard", href: "/admin", icon: Gauge },
  { label: "Members", icon: Users, children: [["All Members","/admin/members"],["Pending Members","/admin/members/pending"],["Blocked Members","/admin/members/blocked"]] },
  { label: "Deposits", icon: CreditCard, children: [["Pending Deposits","/admin/deposits/pending"],["Deposit History","/admin/deposits/history"]] },
  { label: "Withdrawals", icon: Landmark, children: [["Pending Withdrawals","/admin/withdrawals/pending"],["Processing","/admin/withdrawals/processing"],["Withdrawal History","/admin/withdrawals/history"]] },
  { label: "Investments", icon: ChartNoAxesCombined, children: [["All Investments","/admin/investments"],["Manual Activation","/admin/investments/activate"]] },
  { label: "ROI Management", icon: CircleDollarSign, children: [["ROI Runs","/admin/roi/runs"],["Run History","/admin/roi/history"]] },
  { label: "Referral Network", icon: Network, children: [["Referral Tree","/admin/referrals/tree"],["Team Analytics","/admin/referrals/analytics"]] },
  { label: "Wallet Ledger", href: "/admin/wallet-ledger", icon: WalletCards },
  { label: "Income Ledger", href: "/admin/income-ledger", icon: BadgeDollarSign },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList },
  { label: "System Settings", href: "/admin/settings", icon: Settings, superOnly: true },
  { label: "Admin Management", icon: ShieldCheck, superOnly: true, children: [["Administrators","/admin/administrators"],["Roles & Permissions","/admin/roles"]] },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ReceiptText },
  { label: "System Health", href: "/admin/system-health", icon: HeartPulse },
] as const;

export function AdminSidebar({ role, mobileOpen = false, onMobileClose }: { role: AdminRole; mobileOpen?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,280px)] flex-col border-r border-slate-800 bg-[#0b1220] text-slate-300 shadow-2xl transition-transform duration-300 lg:z-40 lg:w-64 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4 lg:h-20 lg:px-6">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Activity className="size-5" /></span>
        <div><p className="font-bold text-white">NaturePower</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-400">Admin Console</p></div>
        <button aria-label="Close navigation" onClick={onMobileClose} className="ml-auto grid size-9 place-items-center rounded-lg border border-slate-700 lg:hidden"><X className="size-4" /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.filter((item) => !("superOnly" in item) || !item.superOnly || role === "SUPER_ADMIN").map((item) => {
          const active = "href" in item ? pathname === item.href : item.children.some((child) => pathname.startsWith(child[1]));
          const Icon = item.icon;
          if ("href" in item) return <Link key={item.label} href={item.href} onClick={() => onMobileClose?.()} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-emerald-400 font-semibold text-slate-950" : "hover:bg-slate-800 hover:text-white"}`}><Icon className="size-[18px]" />{item.label}</Link>;
          const expanded = open[item.label] ?? active;
          return <div key={item.label}><button onClick={() => setOpen((value) => ({ ...value, [item.label]: !expanded }))} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "text-white" : "hover:bg-slate-800"}`}><Icon className="size-[18px]" /><span className="flex-1 text-left">{item.label}</span><ChevronDown className={`size-4 transition ${expanded ? "rotate-180" : ""}`} /></button>{expanded && <div className="ml-6 mt-1 space-y-1 border-l border-slate-700 pl-3">{item.children.map(([label, href]) => <Link key={href} href={href} onClick={() => onMobileClose?.()} className={`block rounded-lg px-3 py-2 text-xs ${pathname === href ? "bg-slate-800 text-emerald-400" : "hover:text-white"}`}>{label}</Link>)}</div>}</div>;
        })}
      </nav>
      <form action={adminLogoutAction} className="border-t border-slate-800 p-3"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-red-500/10 hover:text-red-300"><LogOut className="size-[18px]" />Logout</button></form>
    </aside>
  );
}
