"use client";

import { useActionState, useState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import type { AdminActionResult } from "../../shared/action-result";
import { manualActivationAction } from "../actions/manual-activation";

type InvestmentCreditState = AdminActionResult<{
  nextRequestToken: string | null;
}>;

const initialState: InvestmentCreditState = {
  ok: true,
  data: { nextRequestToken: null },
  message: "",
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export function MemberInvestmentCreditForm({
  userId,
  member,
  activeInvestment,
  initialRequestToken,
}: {
  userId: string;
  member: string;
  activeInvestment: string;
  initialRequestToken: string;
}) {
  const [state, action, pending] = useActionState(
    manualActivationAction,
    initialState,
  );
  const [amount, setAmount] = useState("");
  const requestToken =
    state.ok && state.data.nextRequestToken
      ? state.data.nextRequestToken
      : initialRequestToken;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Credit active investment</h2>
      <p className="mt-1 text-xs text-slate-500">
        {member} - Current active investment {activeInvestment} USDT. A credit
        starts an investment and evaluates all referral commissions.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="Investment amount (USDT)"
          className={inputClass}
          required
        />
        <AdminActionDialog
          triggerLabel="Review investment credit"
          title="Confirm active investment credit"
          description={`${member} - credit ${amount || "not entered"} USDT as active investment. Eligible referral income is credited in the same transaction.`}
        >
          <form action={action} className="space-y-3">
            <input type="hidden" name="requestToken" value={requestToken} />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="amount" value={amount} />
            <input
              name="reason"
              placeholder="Optional note"
              className={inputClass}
            />
            <button
              disabled={pending}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"
            >
              {pending ? "Crediting..." : "Credit active investment"}
            </button>
          </form>
        </AdminActionDialog>
      </div>
      {state.message ? (
        <p
          className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
