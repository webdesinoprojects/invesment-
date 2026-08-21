"use client";

import { useActionState, useState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import type { AdminActionResult } from "../../shared/action-result";
import { reverseWalletEntryAction } from "../actions/wallet-operation";

type WalletState = AdminActionResult<{ nextIdempotencyKey: string | null }>;

const initialWalletState: WalletState = {
  ok: true,
  data: { nextIdempotencyKey: null },
  message: "",
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export function WalletReversalControl({
  entryId,
  amount,
  direction,
}: {
  entryId: string;
  amount: string;
  direction: string;
}) {
  const [state, action, pending] = useActionState(
    reverseWalletEntryAction,
    initialWalletState,
  );
  const [initialKey] = useState(() => crypto.randomUUID());
  const idempotencyKey =
    state.ok && state.data.nextIdempotencyKey
      ? state.data.nextIdempotencyKey
      : initialKey;

  return (
    <AdminActionDialog
      triggerLabel="Reverse"
      title="Confirm earnings adjustment reversal"
      description={`This creates an immutable compensating entry for the ${direction.toLowerCase()} adjustment of ${amount}. The original entry remains unchanged.`}
      triggerClassName="text-xs font-bold text-red-700"
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="entryId" value={entryId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <p className="text-xs text-slate-600">
          Reverse {direction.toLowerCase()} adjustment of {amount}.
        </p>
        <input
          name="reason"
          className={inputClass}
          placeholder="Required reversal reason"
          required
        />
        <label className="flex items-start gap-2 text-[11px] text-slate-600">
          <input
            type="checkbox"
            name="confirmed"
            value="true"
            required
            className="mt-0.5"
          />
          Confirm an immutable compensating entry.
        </label>
        <button
          disabled={pending}
          className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white"
        >
          {pending ? "Reversing..." : "Confirm reversal"}
        </button>
        <Feedback state={state} />
      </form>
    </AdminActionDialog>
  );
}

function Feedback({ state }: { state: WalletState }) {
  return state.message ? (
    <p
      className={`mt-2 text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}
    >
      {state.message}
    </p>
  ) : null;
}
