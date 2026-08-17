export const ADMIN_AUTH_COOKIE_NAME = "np-admin-auth-token";

export type SupabaseAuthScope = "user" | "admin";

export function getAuthScopeForPath(pathname: string): SupabaseAuthScope {
  return pathname === "/admin" || pathname.startsWith("/admin/")
    ? "admin"
    : "user";
}
