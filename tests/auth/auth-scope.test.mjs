import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_AUTH_COOKIE_NAME,
  getAuthScopeForPath,
} from "../../src/lib/supabase/auth-scope.ts";

test("admin routes use an isolated authentication scope", () => {
  assert.equal(getAuthScopeForPath("/admin"), "admin");
  assert.equal(getAuthScopeForPath("/admin/login"), "admin");
  assert.equal(getAuthScopeForPath("/admin/members/123"), "admin");
  assert.equal(ADMIN_AUTH_COOKIE_NAME, "np-admin-auth-token");
});

test("member and public routes retain the default user authentication scope", () => {
  assert.equal(getAuthScopeForPath("/dashboard"), "user");
  assert.equal(getAuthScopeForPath("/profile"), "user");
  assert.equal(getAuthScopeForPath("/auth/confirm"), "user");
  assert.equal(getAuthScopeForPath("/administrator"), "user");
});
