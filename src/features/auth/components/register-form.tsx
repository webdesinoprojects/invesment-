"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerAction } from "@/features/auth/actions/register";
import { countries } from "@/features/auth/constants/countries";
import type { SponsorPreview } from "@/features/auth/queries/get-sponsor-preview";
import { initialActionResult } from "@/types/action-result";

import { ActionFeedback } from "./action-feedback";
import { FormFieldError } from "./field-error";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

export function RegisterForm({ sponsor }: { sponsor: SponsorPreview }) {
  const [state, action] = useActionState(registerAction, initialActionResult);
  const inviteId = sponsor.state === "none" ? "" : sponsor.memberId;
  const referrerName = sponsor.state === "found" ? sponsor.fullName : "";

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inviteId">Invite ID</Label>
          <Input
            id="inviteId"
            name="inviteId"
            defaultValue={inviteId}
            readOnly={Boolean(inviteId)}
            placeholder="NP member ID"
            aria-invalid={Boolean(state.fieldErrors?.inviteId)}
            className="h-11 uppercase"
          />
          <FormFieldError errors={state.fieldErrors?.inviteId} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="referrerName">Referrer name</Label>
          <Input
            id="referrerName"
            value={referrerName}
            readOnly
            placeholder="Verified from invite ID"
            className="h-11"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Enter your full name"
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          className="h-11"
        />
        <FormFieldError errors={state.fieldErrors?.fullName} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
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
        <div className="space-y-1.5">
          <Label htmlFor="countryCode">Country</Label>
          <Select name="countryCode" defaultValue="IN">
            <SelectTrigger id="countryCode" className="h-11 w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldError errors={state.fieldErrors?.countryCode} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mobile">Mobile number</Label>
        <Input
          id="mobile"
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Include country code when needed"
          aria-invalid={Boolean(state.fieldErrors?.mobile)}
          className="h-11"
        />
        <FormFieldError errors={state.fieldErrors?.mobile} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="register-password">Password</Label>
          <PasswordInput
            id="register-password"
            name="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            invalid={Boolean(state.fieldErrors?.password)}
          />
          <FormFieldError errors={state.fieldErrors?.password} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Repeat password"
            autoComplete="new-password"
            invalid={Boolean(state.fieldErrors?.confirmPassword)}
          />
          <FormFieldError errors={state.fieldErrors?.confirmPassword} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="securityPin">Security PIN</Label>
        <Input
          id="securityPin"
          name="securityPin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          minLength={4}
          maxLength={6}
          placeholder="4 to 6 digits"
          aria-invalid={Boolean(state.fieldErrors?.securityPin)}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Used to authorize investments and withdrawals. It is never stored as plain text.
        </p>
        <FormFieldError errors={state.fieldErrors?.securityPin} />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton idleLabel="Create account" pendingLabel="Creating account..." />
    </form>
  );
}
