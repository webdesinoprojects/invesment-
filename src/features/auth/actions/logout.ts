"use server";

import { redirect } from "next/navigation";

import { isAuthConfigured } from "@/lib/env/server";
import {
  clearSessionPersistencePreference,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export async function logoutAction(): Promise<never> {
  if (isAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    await clearSessionPersistencePreference();
  }

  redirect("/");
}
