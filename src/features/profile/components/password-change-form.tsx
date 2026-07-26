"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/features/auth/components/action-feedback";
import { FormFieldError } from "@/features/auth/components/field-error";
import { PasswordInput } from "@/features/auth/components/password-input";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { updatePasswordAction } from "@/features/profile/actions/update-password";
import { initialActionResult } from "@/types/action-result";

export function PasswordChangeForm() {
  const [state, action] = useActionState(updatePasswordAction, initialActionResult);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <CredentialField label="Current password" name="currentPassword" autoComplete="current-password" state={state} />
      <CredentialField label="New password" name="newPassword" autoComplete="new-password" state={state} />
      <CredentialField label="Confirm new password" name="confirmPassword" autoComplete="new-password" state={state} />
      <ActionFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="reset" variant="outline" size="lg" className="h-11">Clear</Button>
        <SubmitButton idleLabel="Update password" pendingLabel="Updating..." />
      </div>
    </form>
  );
}

function CredentialField({
  label,
  name,
  autoComplete,
  state,
}: {
  label: string;
  name: "currentPassword" | "newPassword" | "confirmPassword";
  autoComplete: string;
  state: typeof initialActionResult;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <PasswordInput
        id={name}
        name={name}
        placeholder={`Enter ${label.toLowerCase()}`}
        autoComplete={autoComplete}
        invalid={Boolean(state.fieldErrors?.[name])}
        minLength={name === "currentPassword" ? undefined : 8}
        maxLength={64}
      />
      <FormFieldError errors={state.fieldErrors?.[name]} />
    </div>
  );
}
