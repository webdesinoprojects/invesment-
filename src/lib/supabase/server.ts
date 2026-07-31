import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env/server";
import {
  applySessionPersistence,
  parseSessionPersistence,
  PERSISTENT_SESSION_MAX_AGE,
  SESSION_PERSISTENCE_COOKIE,
  type SessionPersistence,
} from "@/lib/auth/session-persistence";

export async function createSupabaseServerClient(
  persistenceOverride?: SessionPersistence,
) {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const persistence =
    persistenceOverride ??
    parseSessionPersistence(
      cookieStore.get(SESSION_PERSISTENCE_COOKIE)?.value,
    );

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(
                name,
                value,
                applySessionPersistence(options, value, persistence),
              );
            });
          } catch {
            // Server Components cannot write cookies; proxy.ts handles refreshes.
          }
        },
      },
    },
  );
}

export async function setSessionPersistencePreference(
  persistence: SessionPersistence,
) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_PERSISTENCE_COOKIE, persistence, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(persistence === "persistent"
      ? { maxAge: PERSISTENT_SESSION_MAX_AGE }
      : {}),
  });
}

export async function clearSessionPersistencePreference() {
  (await cookies()).delete(SESSION_PERSISTENCE_COOKIE);
}
