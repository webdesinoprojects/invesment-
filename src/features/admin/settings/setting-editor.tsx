"use client";

import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import { initialAdminActionResult } from "../shared/action-result";
import { updateSettingAction } from "./update-setting";

export function SettingEditor({
  settingKey,
  value,
  version,
}: {
  settingKey: string;
  value: string;
  version: number;
}) {
  const [state, action, pending] = useActionState(
    updateSettingAction,
    initialAdminActionResult,
  );
  return (
    <AdminActionDialog
      triggerLabel="Edit"
      title={`Confirm ${settingKey} update`}
      description={`This changes runtime financial rules from version ${version} to version ${version + 1}. Invalid or stale values are rejected.`}
      triggerClassName="text-xs font-bold text-emerald-700"
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="key" value={settingKey} />
        <input type="hidden" name="version" value={version} />
        <textarea
          name="value"
          defaultValue={value}
          rows={10}
          className="w-full rounded-lg border border-slate-200 p-3 font-mono text-[11px]"
        />
        <input name="reason" required placeholder="Reason for change" className="w-full rounded-lg border border-slate-200 p-2 text-xs" />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
          I confirm this exact JSON value and understand that it changes live runtime validation.
        </label>
        <button disabled={pending} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">
          {pending ? "Saving..." : `Save version ${version + 1}`}
        </button>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </AdminActionDialog>
  );
}
