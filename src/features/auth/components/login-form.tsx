"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/features/auth/actions/login";
import { initialActionResult } from "@/types/action-result";

import { ActionFeedback } from "./action-feedback";
import { FormFieldError } from "./field-error";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialActionResult);

  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1.5">
        <Label htmlFor="loginId">Login ID</Label>
        <Input
          id="loginId"
          name="loginId"
          autoComplete="username"
          placeholder="Email or NP member ID"
          aria-invalid={Boolean(state.fieldErrors?.loginId)}
          className="h-11"
        />
        <FormFieldError errors={state.fieldErrors?.loginId} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          invalid={Boolean(state.fieldErrors?.password)}
        />
        <FormFieldError errors={state.fieldErrors?.password} />
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <Checkbox name="rememberMe" />
          Keep me signed in
        </label>
        <Link className="text-primary hover:underline" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Login" pendingLabel="Signing in..." />
    </form>
  );
}
