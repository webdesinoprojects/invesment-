import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  applySessionPersistence,
  parseSessionPersistence,
  SESSION_PERSISTENCE_COOKIE,
} from "@/lib/auth/session-persistence";

const protectedPrefixes = [
  "/dashboard",
  "/deposit",
  "/withdraw",
  "/invest",
  "/team",
  "/earnings",
  "/history",
  "/assets",
  "/profile",
  "/security",
  "/admin",
] as const;

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/admin/login") return false;
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const persistence = parseSessionPersistence(
    request.cookies.get(SESSION_PERSISTENCE_COOKIE)?.value,
  );
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(
            name,
            value,
            applySessionPersistence(options, value, persistence),
          );
        });
        Object.entries(headersToSet).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = new URL(request.nextUrl.pathname.startsWith("/admin") ? "/admin/login" : "/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
