"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { changeMemberStatusAction } from "../actions/change-member-status";
import { initialAdminActionResult } from "../../shared/action-result";

export function MemberStatusControls({ id, status, member }: { id: string; status: string; member: string }) {
  const [state, action, pending] = useActionState(changeMemberStatusAction, initialAdminActionResult);
  const [popover, setPopover] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!popover) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [popover]);

  function openPopover() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(346, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const estimatedHeight = status === "ACTIVE" ? 260 : 270;
    const top = rect.bottom + estimatedHeight + 12 <= window.innerHeight
      ? rect.bottom + 8
      : Math.max(12, rect.top - estimatedHeight - 8);
    setPopover({ top, left, width });
  }

  return <>
    <button ref={buttonRef} type="button" onClick={openPopover} className="min-w-28 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800">Manage</button>
    {popover && createPortal(
      <div className="fixed inset-0 z-[100]">
        <button type="button" aria-label="Close member management" onClick={() => setPopover(null)} className="absolute inset-0 cursor-default bg-transparent" />
        <form action={action} style={popover} className="fixed space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.2)]">
          <button type="button" aria-label="Close" onClick={() => setPopover(null)} className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="size-4" /></button>
          <input type="hidden" name="id" value={id}/>
          <p className="max-w-[260px] whitespace-normal pr-7 text-sm leading-5 text-slate-600">Change account access for <strong className="text-slate-800">{member}</strong>.</p>
          <textarea
            name="reason"
            rows={2}
            aria-label="Member status reason"
            placeholder="Reason (required for block or archive)"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 caret-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          {state.message&&<p className={`whitespace-normal text-xs ${state.ok?"text-emerald-700":"text-red-600"}`}>{state.message}</p>}
          <div className="grid grid-cols-2 gap-2">
            {status!=="ACTIVE"&&<button disabled={pending} name="status" value="ACTIVE" className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">Activate</button>}
            {status!=="BLOCKED"&&status!=="ARCHIVED"&&<button disabled={pending} name="status" value="BLOCKED" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 disabled:opacity-60">Block</button>}
            {status!=="ARCHIVED"&&<button disabled={pending} name="status" value="ARCHIVED" className="rounded-xl bg-slate-200 px-3 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-60">Archive</button>}
          </div>
        </form>
      </div>,
      document.body,
    )}
  </>;
}
