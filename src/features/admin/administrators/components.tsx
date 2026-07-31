"use client";

import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import {
  inviteAdministratorAction,
  updateAdministratorAction,
} from "./actions";
import { initialAdminActionResult } from "../shared/action-result";

const inputClass = "w-full rounded-lg border border-slate-200 p-2 text-sm";

export function InviteAdministratorForm() {
  const [state, action, pending] = useActionState(
    inviteAdministratorAction,
    initialAdminActionResult,
  );
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold">Invite administrator</h2>
      <p className="mt-1 text-xs text-slate-500">
        Invitation links return only to the configured NEX-GEN POWER admin login URL.
      </p>
      <form action={action} className="mt-4 grid gap-3 md:grid-cols-5">
        <input name="email" type="email" required placeholder="Email" className={inputClass} />
        <input name="displayName" required placeholder="Display name" className={inputClass} />
        <select name="role" className={inputClass}>
          <option>VIEWER</option>
          <option>OPERATOR</option>
          <option>SUPER_ADMIN</option>
        </select>
        <input name="reason" required placeholder="Reason" className={inputClass} />
        <button disabled={pending} className="rounded-xl bg-slate-950 p-2 text-sm font-bold text-white">
          {pending ? "Sending..." : "Send invite"}
        </button>
      </form>
      {state.message ? (
        <p className={`mt-2 text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </p>
      ) : null}
    </section>
  );
}

export function AdministratorControls({
  id,
  name,
  role,
  isActive,
}: {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateAdministratorAction,
    initialAdminActionResult,
  );
  return (
    <AdminActionDialog
      triggerLabel="Manage"
      title="Confirm administrator access change"
      description={`${name} currently has role ${role} and is ${isActive ? "active" : "inactive"}. Role and activation changes take effect on the next protected request.`}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <select name="role" defaultValue={role} className={inputClass}>
          <option>VIEWER</option>
          <option>OPERATOR</option>
          <option>SUPER_ADMIN</option>
        </select>
        <input name="reason" required placeholder="Required reason" className={inputClass} />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
          I confirm the target administrator, role and immediate access consequence.
        </label>
        <div className="flex gap-2">
          <button disabled={pending} name="operation" value="ROLE" className="rounded-lg bg-slate-950 p-2 text-xs text-white">
            Change role
          </button>
          <button disabled={pending} name="operation" value={isActive ? "DEACTIVATE" : "ACTIVATE"} className="rounded-lg bg-amber-100 p-2 text-xs">
            {isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </AdminActionDialog>
  );
}
