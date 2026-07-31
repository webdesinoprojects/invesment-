"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BadgeDollarSign, ChartNoAxesCombined, ChevronDown, CircleDollarSign,
  ClipboardList, CreditCard, Gauge, HeartPulse, Landmark, LogOut, Network,
  ChevronsLeft, ChevronsRight, ReceiptText, Settings, ShieldCheck, Users,
  WalletCards, X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import type { AdminRole } from "@/generated/prisma/client";
import { adminLogoutAction } from "@/features/admin/auth/actions";
import { can, type AdminPermission } from "@/features/admin/permissions";

const items = [
  { label: "Dashboard", href: "/admin", icon: Gauge, permission: "admin.view" },
  { label: "Members", icon: Users, permission: "members.view", children: [["All Members","/admin/members","members.view"],["Pending Members","/admin/members/pending","members.view"],["Blocked Members","/admin/members/blocked","members.view"]] },
  { label: "Deposits", icon: CreditCard, permission: "deposits.view", children: [["Pending Deposits","/admin/deposits/pending","deposits.view"],["Deposit History","/admin/deposits/history","deposits.view"]] },
  { label: "Withdrawals", icon: Landmark, permission: "withdrawals.view", children: [["Pending Withdrawals","/admin/withdrawals/pending","withdrawals.view"],["Processing","/admin/withdrawals/processing","withdrawals.view"],["Withdrawal History","/admin/withdrawals/history","withdrawals.view"]] },
  { label: "Investments", icon: ChartNoAxesCombined, permission: "investments.view", children: [["All Investments","/admin/investments","investments.view"],["Manual Activation","/admin/investments/activate","investments.manual"]] },
  { label: "ROI Management", icon: CircleDollarSign, permission: "roi.view", children: [["ROI Runs","/admin/roi/runs","roi.view"],["Run History","/admin/roi/history","roi.view"]] },
  { label: "Referral Network", icon: Network, permission: "referrals.view", children: [["Referral Tree","/admin/referrals/tree","referrals.view"],["Team Analytics","/admin/referrals/analytics","referrals.view"]] },
  { label: "Wallet Ledger", href: "/admin/wallet-ledger", icon: WalletCards, permission: "wallet.view" },
  { label: "Income Ledger", href: "/admin/income-ledger", icon: BadgeDollarSign, permission: "income.view" },
  { label: "Reports", href: "/admin/reports", icon: ClipboardList, permission: "reports.view" },
  { label: "System Settings", href: "/admin/settings", icon: Settings, permission: "settings.view" },
  { label: "Admin Management", icon: ShieldCheck, permission: "administrators.view", children: [["Administrators","/admin/administrators","administrators.view"],["Roles & Permissions","/admin/roles","administrators.view"]] },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ReceiptText, permission: "audit.view" },
  { label: "System Health", href: "/admin/system-health", icon: HeartPulse, permission: "health.view" },
] as const;

type AdminSidebarProps = {
  role: AdminRole;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  desktopCollapsed: boolean;
  onDesktopCollapsedChange: (collapsed: boolean) => void;
};

export function AdminSidebar({
  role,
  mobileOpen = false,
  onMobileClose,
  desktopCollapsed,
  onDesktopCollapsedChange,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,280px)] flex-col border-r border-slate-800 bg-[#0b1220] text-slate-300 shadow-2xl transition-[width,transform] duration-300 lg:z-40 lg:translate-x-0 lg:shadow-none ${desktopCollapsed ? "lg:w-20" : "lg:w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <button
        type="button"
        aria-label={desktopCollapsed ? "Expand navigation" : "Collapse navigation"}
        title={desktopCollapsed ? "Expand navigation" : "Collapse navigation"}
        onClick={() => onDesktopCollapsedChange(!desktopCollapsed)}
        className="absolute -right-7 top-24 z-10 hidden size-9 place-items-center text-slate-700 transition hover:text-emerald-600 lg:grid"
      >
        {desktopCollapsed ? <ChevronsRight className="size-5" /> : <ChevronsLeft className="size-5" />}
      </button>
      <div className={`flex h-16 items-center gap-3 border-b border-slate-800 px-4 lg:h-20 ${desktopCollapsed ? "lg:justify-center lg:px-3" : "lg:px-6"}`}>
        <BrandMark className="size-11" priority />
        <div className={desktopCollapsed ? "lg:hidden" : ""}><p className="text-sm font-bold text-white">NEX-GEN POWER</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-400">Admin Console</p></div>
        <button aria-label="Close navigation" onClick={onMobileClose} className="ml-auto grid size-9 place-items-center rounded-lg border border-slate-700 lg:hidden"><X className="size-4" /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.filter((item) => can(role, item.permission as AdminPermission)).map((item) => {
          const children = "children" in item
            ? item.children.filter((child) => can(role, child[2] as AdminPermission))
            : [];
          const active = "href" in item ? pathname === item.href : children.some((child) => pathname.startsWith(child[1]));
          const Icon = item.icon;
          if ("href" in item) return <Link key={item.label} href={item.href} title={desktopCollapsed ? item.label : undefined} onClick={() => onMobileClose?.()} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${desktopCollapsed ? "lg:justify-center" : ""} ${active ? "bg-emerald-400 font-semibold text-slate-950" : "hover:bg-slate-800 hover:text-white"} ${desktopCollapsed && active ? "lg:bg-transparent lg:text-emerald-400" : ""}`}><Icon className="size-[18px] shrink-0" /><span className={desktopCollapsed ? "lg:hidden" : ""}>{item.label}</span></Link>;
          const expanded = open[item.label] ?? active;
          return <div key={item.label}><button title={desktopCollapsed ? item.label : undefined} onClick={() => { if (desktopCollapsed) { onDesktopCollapsedChange(false); setOpen((value) => ({ ...value, [item.label]: true })); return; } setOpen((value) => ({ ...value, [item.label]: !expanded })); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${desktopCollapsed ? "lg:justify-center" : ""} ${active ? "text-white" : "hover:bg-slate-800"} ${desktopCollapsed && active ? "lg:text-emerald-400" : ""}`}><Icon className="size-[18px] shrink-0" /><span className={`flex-1 text-left ${desktopCollapsed ? "lg:hidden" : ""}`}>{item.label}</span><ChevronDown className={`size-4 transition ${desktopCollapsed ? "lg:hidden" : ""} ${expanded ? "rotate-180" : ""}`} /></button>{expanded && <div className={`ml-6 mt-1 space-y-1 border-l border-slate-700 pl-3 ${desktopCollapsed ? "lg:hidden" : ""}`}>{children.map(([label, href]) => <Link key={href} href={href} onClick={() => onMobileClose?.()} className={`block rounded-lg px-3 py-2 text-xs ${pathname === href ? "bg-slate-800 text-emerald-400" : "hover:text-white"}`}>{label}</Link>)}</div>}</div>;
        })}
      </nav>
      <form action={adminLogoutAction} className="border-t border-slate-800 p-3"><button title={desktopCollapsed ? "Logout" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-red-500/10 hover:text-red-300 ${desktopCollapsed ? "lg:justify-center" : ""}`}><LogOut className="size-[18px] shrink-0" /><span className={desktopCollapsed ? "lg:hidden" : ""}>Logout</span></button></form>
    </aside>
  );
}
