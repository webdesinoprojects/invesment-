import { NextResponse } from "next/server";

import { isAuthConfigured } from "@/lib/env/server";
import { createPasswordRecoveryToken } from "@/lib/security/password-recovery-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/dashboard";

  if (!code || !isAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?authError=1", requestUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?authError=1", requestUrl));
  }

  const response = NextResponse.redirect(new URL(next, requestUrl));
  if (next === "/reset-password") {
    const token = createPasswordRecoveryToken(data.user.id);
    if (!token) return NextResponse.redirect(new URL("/login?authError=1", requestUrl));
    response.cookies.set("np_password_recovery", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  return response;
}
