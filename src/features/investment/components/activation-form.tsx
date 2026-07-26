"use client";

import { Search } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/features/auth/components/action-feedback";
import { FormFieldError } from "@/features/auth/components/field-error";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { activateInvestmentAction } from "@/features/investment/actions/activate-investment";
import { lookupActivationMemberAction } from "@/features/investment/actions/lookup-activation-member";
import { initialActionResult } from "@/types/action-result";

export function ActivationForm({
  defaultMemberId,
  defaultMemberName,
  minimumAmount,
  requestToken,
}: {
  defaultMemberId: string;
  defaultMemberName: string;
  minimumAmount: string;
  requestToken: string;
}) {
  const [state, action] = useActionState(activateInvestmentAction, initialActionResult);
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [memberName, setMemberName] = useState(defaultMemberName);
  const [lookupMessage, setLookupMessage] = useState("");
  const [isLookingUp, startLookup] = useTransition();

  function lookupMember() {
    startLookup(async () => {
      const result = await lookupActivationMemberAction(memberId);
      if (result.ok) {
        setMemberId(result.memberId);
        setMemberName(result.fullName);
        setLookupMessage("");
      } else {
        setMemberName("");
        setLookupMessage(result.message);
      }
    });
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="requestToken" value={requestToken} />
      <div className="space-y-1.5">
        <Label htmlFor="memberId">Activation member ID</Label>
        <div className="flex gap-2">
          <Input
            id="memberId"
            name="memberId"
            value={memberId}
            onChange={(event) => {
              setMemberId(event.target.value.toUpperCase());
              setMemberName("");
              setLookupMessage("");
            }}
            autoComplete="off"
            aria-invalid={Boolean(state.fieldErrors?.memberId || lookupMessage)}
            className="h-11"
          />
          <Button type="button" variant="outline" onClick={lookupMember} disabled={isLookingUp} className="h-11">
            <Search aria-hidden="true" />
            {isLookingUp ? "Checking..." : "Verify"}
          </Button>
        </div>
        <FormFieldError errors={state.fieldErrors?.memberId} />
        {lookupMessage ? <p className="text-sm text-destructive">{lookupMessage}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="memberName">Member name</Label>
        <Input
          id="memberName"
          value={memberName}
          readOnly
          placeholder="Verify the member ID"
          className="h-11"
        />
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
      <SubmitButton idleLabel="Activate investment" pendingLabel="Activating..." />
    </form>
  );
}
