import assert from "node:assert/strict";
import test from "node:test";

import { loginSchema } from "../../src/features/auth/schemas/auth.ts";
import {
  applySessionPersistence,
  parseSessionPersistence,
} from "../../src/lib/auth/session-persistence.ts";

const login = {
  loginId: "NP123456",
  password: "Password1",
};

test("remember-me input is normalized to a boolean", () => {
  const unchecked = loginSchema.parse(login);
  const checked = loginSchema.parse({ ...login, rememberMe: "true" });

  assert.equal(unchecked.rememberMe, false);
  assert.equal(checked.rememberMe, true);
});

test("session mode removes persistence from active auth cookies", () => {
  const expires = new Date("2030-01-01T00:00:00.000Z");
  const options = {
    path: "/",
    sameSite: "lax",
    maxAge: 3600,
    expires,
  };
  const sessionOptions = applySessionPersistence(
    options,
    "token",
    "session",
  );

  assert.equal("maxAge" in sessionOptions, false);
  assert.equal("expires" in sessionOptions, false);
  assert.equal(sessionOptions.path, "/");
});

test("persistent and deletion cookies retain their expiry options", () => {
  const options = { path: "/", maxAge: 3600 };

  assert.equal(
    applySessionPersistence(options, "token", "persistent").maxAge,
    3600,
  );
  assert.equal(
    applySessionPersistence({ path: "/", maxAge: 0 }, "", "session").maxAge,
    0,
  );
  assert.equal(parseSessionPersistence("persistent"), "persistent");
  assert.equal(parseSessionPersistence(undefined), "session");
});
