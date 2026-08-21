"use client";

import { useActionState, useState, useTransition } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";
import type { AdminActionResult } from "../../shared/action-result";
import {
  manualActivationAction,
  searchManualActivationMembersAction,
  type ManualActivationMemberResult,
} from "../actions/manual-activation";

const initialState: AdminActionResult<{ nextRequestToken: string | null }> = {
  ok: true,
  data: { nextRequestToken: null },
  message: "",
};

export function ManualActivationForm() {
  const [state, action, pending] = useActionState(manualActivationAction, initialState);
  const [initialToken] = useState(() => crypto.randomUUID());
  const token = state.ok && state.data.nextRequestToken ? state.data.nextRequestToken : initialToken;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ManualActivationMemberResult[]>([]);
  const [selected, setSelected] = useState<ManualActivationMemberResult | null>(null);
  const [amount, setAmount] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookingUp, startLookup] = useTransition();

  function search() {
    startLookup(async () => {
      const result = await searchManualActivationMembersAction(query);
      if (result.ok) {
        setResults(result.members);
        setSelected(null);
        setLookupMessage(result.members.length ? "" : "No matching members found.");
      } else {
        setResults([]);
        setLookupMessage(result.message);
      }
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Credit member investment</h2>
      <p className="mt-1 text-xs text-slate-500">
        Resolve the exact member, then credit the amount as an active investment.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Member ID, name, email or mobile"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={lookingUp}
          onClick={search}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold"
        >
          {lookingUp ? "Searching..." : "Search"}
        </button>
      </div>
      {lookupMessage ? <p className="mt-2 text-xs text-slate-500">{lookupMessage}</p> : null}

      {results.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">Member</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Active investment</th>
                <th className="p-3">Select</th>
              </tr>
            </thead>
            <tbody>
              {results.map((member) => (
                <tr key={member.userId} className="border-t border-slate-100">
                  <td className="p-3"><strong>{member.fullName}</strong><br />{member.memberId}</td>
                  <td className="p-3">{member.email}</td>
                  <td className="p-3">{member.status}</td>
                  <td className="p-3">{member.totalInvestment} USDT</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setSelected(member)}
                      className="rounded-lg bg-slate-950 px-3 py-2 font-bold text-white"
                    >
                      Choose
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-slate-500">Resolved member</span><br /><strong>{selected.fullName} - {selected.memberId}</strong></p>
            <p><span className="text-slate-500">Current active investment</span><br /><strong>{selected.totalInvestment} USDT</strong></p>
          </div>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            inputMode="decimal"
            placeholder="Amount USDT"
            aria-label="Investment credit amount"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <AdminActionDialog
            triggerLabel="Review credit"
            title="Confirm investment credit"
            description={`${selected.fullName} - ${selected.memberId} - credit ${amount || "not entered"} USDT. This creates an active investment and evaluates referral commissions.`}
          >
            <form action={action} className="space-y-3">
              <input type="hidden" name="requestToken" value={token} />
              <input type="hidden" name="userId" value={selected.userId} />
              <input type="hidden" name="amount" value={amount} />
              <input
                name="reason"
                placeholder="Optional note"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                disabled={pending}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
              >
                {pending ? "Crediting..." : "Credit investment"}
              </button>
            </form>
          </AdminActionDialog>
        </div>
      ) : null}

      {state.message ? (
        <p className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
