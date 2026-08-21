"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/features/auth/components/action-feedback";
import { FormFieldError } from "@/features/auth/components/field-error";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { createWithdrawalRequestAction } from "@/features/wallet/actions/create-withdrawal-request";
import { initialActionResult } from "@/types/action-result";

export function WithdrawalRequestForm({
  walletAddress,
  minimumAmount,
  feePercent,
  requestToken,
}: {
  walletAddress: string;
  minimumAmount: string;
  feePercent: string;
  requestToken: string;
}) {
  const [state, action] = useActionState(createWithdrawalRequestAction, initialActionResult);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="requestToken" value={requestToken} />
      <div className="space-y-1.5">
        <Label htmlFor="withdrawalWallet">UPI ID / payout details</Label>
        <Input id="withdrawalWallet" value={walletAddress} readOnly className="h-11 font-mono text-xs" />
        <p className="text-xs text-muted-foreground">Change these details from your Profile.</p>
      </div>
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
        <Label htmlFor="securityPin">Security PIN</Label>
        <Input
          id="securityPin"
          name="securityPin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          aria-invalid={Boolean(state.fieldErrors?.securityPin)}
          className="h-11"
        />
        <FormFieldError errors={state.fieldErrors?.securityPin} />
      </div>
      <ActionFeedback state={state} />
      <p className="text-xs text-muted-foreground">
        A {feePercent}% processing fee is deducted from every paid withdrawal.
      </p>
      <SubmitButton idleLabel="Request withdrawal" pendingLabel="Submitting..." />
    </form>
  );
}
