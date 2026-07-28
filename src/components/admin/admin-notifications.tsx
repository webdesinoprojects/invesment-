"use client";
import Link from "next/link";
import { Bell, CircleDollarSign, LoaderCircle, UserRoundPlus, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Notification = { id: string; type: "MEMBER" | "DEPOSIT" | "WITHDRAWAL"; title: string; detail: string; href: string; createdAt: string };

export function AdminNotifications({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/admin/api/notifications", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json() as { count: number; items: Notification[] };
        setCount(data.count); setItems(data.items);
      }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => void load(), 15000);
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const icon = (type: Notification["type"]) => type === "MEMBER" ? <UserRoundPlus className="size-4" /> : type === "DEPOSIT" ? <CircleDollarSign className="size-4" /> : <WalletCards className="size-4" />;
  return <div ref={root} className="relative">
    <button aria-label="Open notifications" onClick={() => { setOpen((value) => !value); void load(); }} className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700"><Bell className="size-4" />{count > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950">{count > 99 ? "99+" : count}</span>}</button>
    {open && <div className="fixed inset-x-3 top-[74px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px]">
      <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><p className="font-bold">Pending notifications</p><p className="text-xs text-slate-500">{count} requests require attention</p></div><button aria-label="Close notifications" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"><X className="size-4" /></button></div>
      <div className="max-h-[min(65vh,520px)] overflow-y-auto">{loading && items.length === 0 ? <div className="grid h-32 place-items-center"><LoaderCircle className="size-5 animate-spin text-emerald-500" /></div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No pending requests in the database.</p> : items.map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="flex gap-3 border-b border-slate-100 p-4 transition last:border-0 hover:bg-emerald-50/50"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">{icon(item.type)}</span><span className="min-w-0"><strong className="block text-sm">{item.title}</strong><span className="block truncate text-xs text-slate-500">{item.detail}</span><span className="mt-1 block text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span></span></Link>)}</div>
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-[11px] text-slate-500">Automatically refreshes every 15 seconds</div>
    </div>}
  </div>;
}
