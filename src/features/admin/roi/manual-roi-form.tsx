"use client";

import { useActionState } from "react";

import { initialAdminActionResult } from "../shared/action-result";
import { runManualRoiAction } from "./manual-roi";

export function ManualRoiForm() {
  const [state, action, pending] = useActionState(
    runManualRoiAction,
    initialAdminActionResult,
  );
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Run ROI for business date</h2>
      <p className="mt-1 text-xs text-slate-500">
        The idempotent ROI engine preserves successful credits and prevents duplicate
        investment/date credits.
      </p>
      <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          name="date"
          type="date"
          required
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="confirmed" value="true" required />
          Confirm this ROI business-date run
        </label>
        <button
          disabled={pending}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
        >
          {pending ? "Running..." : "Run ROI"}
        </button>
      </form>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
