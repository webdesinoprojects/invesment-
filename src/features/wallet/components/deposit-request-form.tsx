"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDepositRequestAction } from "@/features/wallet/actions/create-deposit-request";
import { ActionFeedback } from "@/features/auth/components/action-feedback";
import { FormFieldError } from "@/features/auth/components/field-error";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { initialActionResult } from "@/types/action-result";

export function DepositRequestForm({ minimumAmount }: { minimumAmount: string }) {
  const [state, action] = useActionState(
    createDepositRequestAction,
    initialActionResult,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (USDT)</Label>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder={`Minimum ${minimumAmount}`}
          aria-invalid={Boolean(state.fieldErrors?.amount)}
          className="h-11"
        />
        <FormFieldError errors={state.fieldErrors?.amount} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="transactionHash">BSC transaction hash</Label>
        <Input
          id="transactionHash"
          name="transactionHash"
          autoComplete="off"
          placeholder="0x..."
          aria-invalid={Boolean(state.fieldErrors?.transactionHash)}
          className="h-11 font-mono text-xs"
        />
        <FormFieldError errors={state.fieldErrors?.transactionHash} />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Submit for verification" pendingLabel="Submitting..." />
    </form>
  );
}
