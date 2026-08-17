"use client";

import { createBrowserClient } from "@supabase/ssr";

import { ADMIN_AUTH_COOKIE_NAME } from "@/lib/supabase/auth-scope";

export function createSupabaseBrowserClient() {
  return createConfiguredSupabaseBrowserClient();
}

export function createSupabaseAdminBrowserClient() {
  return createConfiguredSupabaseBrowserClient(ADMIN_AUTH_COOKIE_NAME);
}

function createConfiguredSupabaseBrowserClient(cookieName?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase browser authentication is not configured.");
  }

  return cookieName
    ? createBrowserClient(supabaseUrl, publishableKey, {
        cookieOptions: { name: cookieName },
      })
    : createBrowserClient(supabaseUrl, publishableKey);
}
