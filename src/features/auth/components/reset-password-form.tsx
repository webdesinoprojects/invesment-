"use client";

import { useActionState, useEffect, useRef } from "react";

import { resetPasswordAction } from "@/features/auth/actions/reset-password";
import { initialActionResult } from "@/types/action-result";

import { ActionFeedback } from "./action-feedback";
import { FormFieldError } from "./field-error";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initialActionResult);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <PasswordInput
          id="password"
          name="password"
          placeholder="New password"
          autoComplete="new-password"
          minLength={6}
          maxLength={64}
          invalid={Boolean(state.fieldErrors?.password)}
        />
        <FormFieldError errors={state.fieldErrors?.password} />
      </div>
      <div className="space-y-1.5">
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Confirm new password"
          autoComplete="new-password"
          minLength={6}
          maxLength={64}
          invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
        <FormFieldError errors={state.fieldErrors?.confirmPassword} />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Reset password" pendingLabel="Resetting..." />
    </form>
  );
}
