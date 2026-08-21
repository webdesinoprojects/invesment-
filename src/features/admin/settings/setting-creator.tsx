"use client";

import { useActionState } from "react";

import { AdminActionDialog } from "@/components/admin/admin-action-dialog";

import { initialAdminActionResult } from "../shared/action-result";
import { createSettingAction } from "./create-setting";

const templates = {
  investment_configuration: {
    minimumAmount: "10",
    monthlyRoiPercent: "8",
    durationMonths: 25,
    directBonusPercent: "5",
    directMonthlyPercent: "1",
    levelMonthlyPercent: "0.25",
    directQualificationCount: 5,
    branchQualificationCount: 5,
  },
  withdrawal_configuration: {
    minimumAmount: "10",
    allowedDays: [1, 16],
    feePercent: "10",
  },
  deposit_configuration: {
    walletAddress: "",
    network: "BSC (BEP-20)",
    minimumAmount: "10",
  },
} as const;

export type RequiredSettingKey = keyof typeof templates;

export function SettingCreator({ settingKey }: { settingKey: RequiredSettingKey }) {
  const [state, action, pending] = useActionState(
    createSettingAction,
    initialAdminActionResult,
  );
  return (
    <AdminActionDialog
      triggerLabel={`Configure ${settingKey}`}
      title={`Initialize ${settingKey}`}
      description="This setting is required on a fresh database. Review every value before enabling live operations."
      triggerClassName="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900"
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="key" value={settingKey} />
        <textarea
          name="value"
          defaultValue={JSON.stringify(templates[settingKey], null, 2)}
          rows={10}
          className="w-full rounded-lg border border-slate-200 p-3 font-mono text-[11px] text-slate-950"
        />
        {settingKey === "deposit_configuration" ? (
          <p className="text-xs font-semibold text-red-700">
            Replace the empty wallet address with the company&apos;s verified BEP-20 address.
          </p>
        ) : null}
        <input
          name="reason"
          required
          placeholder="Reason for initialization"
          className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-950"
        />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="confirmed" value="true" required className="mt-0.5" />
          I confirm this exact JSON value and understand that it controls live financial rules.
        </label>
        <button
          disabled={pending}
          className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
        >
          {pending ? "Initializing..." : "Initialize setting"}
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
