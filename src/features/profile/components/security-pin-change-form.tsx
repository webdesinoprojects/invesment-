"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/features/auth/components/action-feedback";
import { FormFieldError } from "@/features/auth/components/field-error";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { updateSecurityPinAction } from "@/features/profile/actions/update-security-pin";
import { initialActionResult } from "@/types/action-result";

export function SecurityPinChangeForm() {
  const [state, action] = useActionState(updateSecurityPinAction, initialActionResult);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <PinField label="Current MPIN" name="currentSecurityPin" state={state} />
      <PinField label="New MPIN" name="newSecurityPin" state={state} />
      <PinField label="Confirm new MPIN" name="confirmSecurityPin" state={state} />
      <ActionFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="reset" variant="outline" size="lg" className="h-11">Clear</Button>
        <SubmitButton idleLabel="Update MPIN" pendingLabel="Updating..." />
      </div>
    </form>
  );
}

function PinField({
  label,
  name,
  state,
}: {
  label: string;
  name: "currentSecurityPin" | "newSecurityPin" | "confirmSecurityPin";
  state: typeof initialActionResult;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        minLength={4}
        maxLength={6}
        aria-invalid={Boolean(state.fieldErrors?.[name])}
        className="h-11"
      />
      <FormFieldError errors={state.fieldErrors?.[name]} />
    </div>
  );
}
