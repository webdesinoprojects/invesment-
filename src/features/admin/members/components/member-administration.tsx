"use client";

import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import { initialAdminActionResult } from "../../shared/action-result";
import {
  createMemberNoteAction,
  replaceMemberPinAction,
  requestMemberPasswordResetAction,
  updateMemberProfileAction,
} from "../actions/member-administration";
import { DeleteMemberControl } from "./delete-member-control";

type MemberAdministrationProps = {
  member: {
    id: string;
    memberId: string;
    fullName: string;
    mobile: string;
    countryCode: string;
    bep20WalletAddress: string | null;
  };
  canManage: boolean;
  canManageCredentials: boolean;
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export function MemberAdministration({
  member,
  canManage,
  canManageCredentials,
}: MemberAdministrationProps) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateMemberProfileAction,
    initialAdminActionResult,
  );
  const [noteState, noteAction, notePending] = useActionState(
    createMemberNoteAction,
    initialAdminActionResult,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    requestMemberPasswordResetAction,
    initialAdminActionResult,
  );
  const [pinState, pinAction, pinPending] = useActionState(
    replaceMemberPinAction,
    initialAdminActionResult,
  );

  if (!canManage) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Member administration</h2>
      <p className="mt-1 text-xs text-slate-500">
        Only allowlisted profile fields are editable. Every sensitive change requires a reason
        and creates an audit record.
      </p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">Approved profile fields</h3>
          <p className="mt-1 text-xs text-slate-500">
            Edit only the allowlisted identity and payout-detail fields.
          </p>
          <div className="mt-4">
            <AdminActionDialog
              triggerLabel="Edit approved fields"
              title={`Edit ${member.fullName}`}
              description="Review the exact member identity and payout changes. Saving replaces the listed profile values and records the required reason in the audit log."
            >
              <form action={profileAction} className="space-y-3">
                <input type="hidden" name="id" value={member.id} />
                <input name="fullName" defaultValue={member.fullName} className={inputClass} required />
                <input name="mobile" defaultValue={member.mobile} className={inputClass} required />
                <input
                  name="countryCode"
                  defaultValue={member.countryCode}
                  className={inputClass}
                  required
                />
                <input
                  name="bep20WalletAddress"
                  defaultValue={member.bep20WalletAddress ?? ""}
                  placeholder="Optional UPI ID or payout detail"
                  className={inputClass}
                />
                <input name="reason" placeholder="Required edit reason" className={inputClass} required />
                <label className="flex items-start gap-2 text-xs text-slate-600">
                  <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
                  Confirm these exact profile changes.
                </label>
                <button disabled={profilePending} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                  {profilePending ? "Saving..." : "Save profile"}
                </button>
                <Feedback state={profileState} />
              </form>
            </AdminActionDialog>
          </div>
          <Feedback state={profileState} />
        </div>

        <form action={noteAction} className="space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">Administrator note</h3>
          <input type="hidden" name="id" value={member.id} />
          <textarea name="note" required rows={5} className={inputClass} placeholder="Internal investigation note" />
          <button disabled={notePending} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            {notePending ? "Adding..." : "Add note"}
          </button>
          <Feedback state={noteState} />
        </form>

        {canManageCredentials ? (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <h3 className="font-semibold">Password recovery</h3>
              <p className="text-xs text-slate-600">
                Sends the existing Supabase recovery flow. No password is generated or exposed.
              </p>
              <div className="mt-4">
                <AdminActionDialog
                  triggerLabel="Review recovery request"
                  title={`Send recovery to ${member.fullName}`}
                  description="This sends Supabase's recovery email to the member account. It does not reveal or generate a password."
                  triggerClassName="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white"
                >
                  <form action={passwordAction} className="space-y-3">
                    <input type="hidden" name="id" value={member.id} />
                    <input name="reason" placeholder="Required recovery reason" className={inputClass} required />
                    <label className="flex items-start gap-2 text-xs text-slate-600">
                      <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
                      Confirm sending a password recovery email.
                    </label>
                    <button disabled={passwordPending} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white">
                      {passwordPending ? "Requesting..." : "Send recovery"}
                    </button>
                    <Feedback state={passwordState} />
                  </form>
                </AdminActionDialog>
              </div>
              <Feedback state={passwordState} />
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
              <h3 className="font-semibold">Replace MPIN</h3>
              <p className="text-xs text-slate-600">
                Replaces the hash and clears lockout counters. The existing MPIN is never read.
              </p>
              <div className="mt-4">
                <AdminActionDialog
                  triggerLabel="Review MPIN replacement"
                  title={`Replace ${member.fullName}'s MPIN`}
                  description="This permanently replaces the stored MPIN hash and clears lockout counters. The existing MPIN cannot be viewed or recovered."
                  triggerClassName="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white"
                >
                  <form action={pinAction} className="space-y-3">
                    <input type="hidden" name="id" value={member.id} />
                    <input name="newPin" type="password" inputMode="numeric" maxLength={6} placeholder="New temporary MPIN" className={inputClass} required />
                    <input name="confirmPin" type="password" inputMode="numeric" maxLength={6} placeholder="Confirm temporary MPIN" className={inputClass} required />
                    <input name="reason" placeholder="Required replacement reason" className={inputClass} required />
                    <label className="flex items-start gap-2 text-xs text-slate-600">
                      <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
                      Confirm replacing the MPIN. Deliver the temporary value through an approved
                      private support channel.
                    </label>
                    <button disabled={pinPending} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white">
                      {pinPending ? "Replacing..." : "Replace MPIN"}
                    </button>
                    <Feedback state={pinState} />
                  </form>
                </AdminActionDialog>
              </div>
              <Feedback state={pinState} />
            </div>
            <DeleteMemberControl
              id={member.id}
              memberId={member.memberId}
              fullName={member.fullName}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

function Feedback({ state }: { state: typeof initialAdminActionResult }) {
  return state.message ? (
    <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
      {state.message}
    </p>
  ) : null;
}
