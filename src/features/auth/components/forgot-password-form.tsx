"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/features/auth/actions/forgot-password";
import { initialActionResult } from "@/types/action-result";

import { ActionFeedback } from "./action-feedback";
import { FormFieldError } from "./field-error";
import { SubmitButton } from "./submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(
    forgotPasswordAction,
    initialActionResult,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          className="h-11"
        />
        <FormFieldError errors={state.fieldErrors?.email} />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Send reset link" pendingLabel="Sending..." />
    </form>
  );
}
