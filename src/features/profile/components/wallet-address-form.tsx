"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/features/auth/components/action-feedback";
import { FormFieldError } from "@/features/auth/components/field-error";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { updateWalletAddressAction } from "@/features/profile/actions/update-wallet-address";
import { initialActionResult } from "@/types/action-result";

export function WalletAddressForm({ walletAddress }: { walletAddress: string }) {
  const [state, action] = useActionState(updateWalletAddressAction, initialActionResult);

  return (
    <form action={action} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="walletAddress">USDT (BEP-20) address</Label>
        <Input
          id="walletAddress"
          name="walletAddress"
          defaultValue={walletAddress}
          placeholder="0x... wallet address"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(state.fieldErrors?.walletAddress)}
          className="h-11 font-mono text-xs"
        />
        <FormFieldError errors={state.fieldErrors?.walletAddress} />
        <p className="text-xs text-muted-foreground">
          Approved withdrawals are sent to this address. Leave it blank to remove it.
        </p>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Save wallet address" pendingLabel="Saving..." />
    </form>
  );
}
