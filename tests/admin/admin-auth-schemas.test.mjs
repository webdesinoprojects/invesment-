import test from "node:test";
import assert from "node:assert/strict";

import {
  adminInviteAcceptanceSchema,
  adminLoginSchema,
} from "../../src/features/admin/auth/schemas.ts";

test("admin login accepts every non-empty password format", () => {
  assert.equal(adminLoginSchema.safeParse({
    email: "operator@example.com",
    password: "123456",
  }).success, true);
  assert.equal(adminLoginSchema.safeParse({
    email: "operator@example.com",
    password: "",
  }).success, false);
});

test("admin invitation requires matching passwords with the shared minimum length", () => {
  assert.equal(adminInviteAcceptanceSchema.safeParse({
    password: "123456",
    confirmPassword: "123456",
  }).success, true);
  assert.equal(adminInviteAcceptanceSchema.safeParse({
    password: "123456",
    confirmPassword: "654321",
  }).success, false);
  assert.equal(adminInviteAcceptanceSchema.safeParse({
    password: "12345",
    confirmPassword: "12345",
  }).success, false);
});
