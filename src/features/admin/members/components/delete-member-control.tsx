"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import { initialAdminActionResult } from "../../shared/action-result";
import { deleteMemberAction } from "../actions/delete-member";

const inputClass =
  "w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

export function DeleteMemberControl({
  id,
  memberId,
  fullName,
}: {
  id: string;
  memberId: string;
  fullName: string;
}) {
  const [state, action, pending] = useActionState(
    deleteMemberAction,
    initialAdminActionResult,
  );

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 xl:col-span-2">
      <h3 className="font-semibold text-red-900">Delete member</h3>
      <p className="mt-1 text-xs leading-5 text-red-800/80">
        Permanently removes unused registrations from the member database and Supabase Auth.
        Financial records or downstream referrals prevent deletion.
      </p>
      <div className="mt-4">
        <AdminActionDialog
          triggerLabel="Delete member permanently"
          title={`Delete ${fullName}`}
          description={`This cannot be undone. Type ${memberId} exactly. Members with financial, income, investment or referral activity must be blocked instead.`}
          triggerClassName="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
        >
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="memberId" value={memberId} />
            <label className="block text-xs font-semibold text-slate-700">
              Confirm member ID
              <input
                name="confirmation"
                autoComplete="off"
                placeholder={memberId}
                className={`mt-1 ${inputClass}`}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Deletion reason
              <textarea
                name="reason"
                rows={3}
                placeholder="Required permanent-deletion reason"
                className={`mt-1 resize-y ${inputClass}`}
                required
              />
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <input
                type="checkbox"
                name="confirmed"
                value="true"
                required
                className="mt-1"
              />
              I understand this permanently removes the member login and unused profile.
            </label>
            <button
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
            >
              <Trash2 className="size-4" />
              {pending ? "Deleting..." : "Delete permanently"}
            </button>
            {state.message ? (
              <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
                {state.message}
              </p>
            ) : null}
          </form>
        </AdminActionDialog>
      </div>
      {state.message ? (
        <p className={`mt-3 text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
