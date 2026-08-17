"use client";

import { useActionState, useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { createSupabaseAdminBrowserClient } from "@/lib/supabase/browser";

import {
  acceptAdminInvitationAction,
  type AdminInviteAcceptanceState,
} from "./actions";

const initialState: AdminInviteAcceptanceState = {};

type InviteSessionState = "loading" | "ready" | "invalid";

export function AcceptAdminInviteForm() {
  const [inviteSession, setInviteSession] = useState<InviteSessionState>("loading");
  const [state, action, pending] = useActionState(
    acceptAdminInvitationAction,
    initialState,
  );

  useEffect(() => {
    let active = true;

    async function establishInviteSession() {
      try {
        const supabase = createSupabaseAdminBrowserClient();
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        const isInviteCallback = fragment.get("type") === "invite";

        if (!accessToken || !refreshToken || !isInviteCallback) {
          if (active) setInviteSession("invalid");
          return;
        }

        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (window.location.hash) {
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        }

        if (!active) return;
        setInviteSession(result.error || !result.data.session ? "invalid" : "ready");
      } catch {
        if (active) setInviteSession("invalid");
      }
    }

    void establishInviteSession();
    return () => {
      active = false;
    };
  }, []);

  if (inviteSession === "loading") {
    return (
      <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        <LoaderCircle className="size-4 animate-spin" />
        Verifying invitation...
      </div>
    );
  }

  if (inviteSession === "invalid") {
    return (
      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
        This invitation is invalid or has expired. Ask a super administrator to send a new invitation.
        <Link href="/admin/login" className="mt-3 block font-semibold underline underline-offset-4">
          Return to admin sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-5">
      <PasswordField
        name="password"
        label="Create password"
        error={state.fieldErrors?.password?.[0]}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        error={state.fieldErrors?.confirmPassword?.[0]}
      />
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : "Set password and continue"}
      </button>
    </form>
  );
}

function PasswordField({
  name,
  label,
  error,
}: {
  name: "password" | "confirmPassword";
  label: string;
  error: string | undefined;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      {label}
      <span className="relative block">
        <LockKeyhole className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          name={name}
          type="password"
          required
          minLength={6}
          maxLength={64}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 aria-invalid:border-red-400"
        />
      </span>
      {error ? <span className="block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
