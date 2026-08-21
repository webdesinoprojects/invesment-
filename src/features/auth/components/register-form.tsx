"use client";

import { useActionState, useState } from "react";

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
import type {
  RegistrationReceiptData,
  RegistrationSecrets,
} from "@/features/auth/types/registration";
import type { ActionResult } from "@/types/action-result";

import { ActionFeedback } from "./action-feedback";
import { FormFieldError } from "./field-error";
import { PasswordInput } from "./password-input";
import { RegistrationReceipt } from "./registration-receipt";
import { SubmitButton } from "./submit-button";

const initialRegisterState: ActionResult<RegistrationReceiptData> = {
  ok: false,
  code: "IDLE",
  message: "",
};

type RegisterFormValues = {
  inviteId: string;
  fullName: string;
  email: string;
  countryCode: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  securityPin: string;
};

export function RegisterForm({
  initialInviteId,
  initialReferrerName,
}: {
  initialInviteId: string;
  initialReferrerName: string;
}) {
  const [state, action] = useActionState(registerAction, initialRegisterState);
  const [submittedSecrets, setSubmittedSecrets] =
    useState<RegistrationSecrets | null>(null);
  const [values, setValues] = useState<RegisterFormValues>({
    inviteId: initialInviteId,
    fullName: "",
    email: "",
    countryCode: "IN",
    mobile: "",
    password: "",
    confirmPassword: "",
    securityPin: "",
  });

  function updateValue(
    field: keyof RegisterFormValues,
    value: RegisterFormValues[typeof field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  if (state.ok && submittedSecrets) {
    return (
      <RegistrationReceipt details={state.data} secrets={submittedSecrets} />
    );
  }

  return (
    <form
      action={action}
      className="space-y-4"
      noValidate
      onSubmit={() => {
        setSubmittedSecrets({
          password: values.password,
          securityPin: values.securityPin,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inviteId">Invite ID (optional)</Label>
          <Input
            id="inviteId"
            name="inviteId"
            value={values.inviteId}
            onChange={(event) => updateValue("inviteId", event.target.value)}
            readOnly={Boolean(initialInviteId)}
            placeholder="Leave blank without a sponsor"
            aria-invalid={Boolean(state.fieldErrors?.inviteId)}
            className="h-11 uppercase"
          />
          <FormFieldError errors={state.fieldErrors?.inviteId} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="referrerName">Referrer name</Label>
          <Input
            id="referrerName"
            value={initialReferrerName}
            readOnly
            placeholder="No sponsor selected"
            className="h-11"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          value={values.fullName}
          onChange={(event) => updateValue("fullName", event.target.value)}
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
            value={values.email}
            onChange={(event) => updateValue("email", event.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
            aria-invalid={Boolean(state.fieldErrors?.email)}
            className="h-11"
          />
          <FormFieldError errors={state.fieldErrors?.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="countryCode">Country</Label>
          <Select
            name="countryCode"
            value={values.countryCode}
            onValueChange={(value) => updateValue("countryCode", value)}
          >
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
          value={values.mobile}
          onChange={(event) => updateValue("mobile", event.target.value)}
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
            placeholder="6 or more characters"
            autoComplete="new-password"
            minLength={6}
            maxLength={64}
            value={values.password}
            onChange={(event) => updateValue("password", event.target.value)}
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
            minLength={6}
            maxLength={64}
            value={values.confirmPassword}
            onChange={(event) =>
              updateValue("confirmPassword", event.target.value)
            }
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
          value={values.securityPin}
          onChange={(event) => updateValue("securityPin", event.target.value)}
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
