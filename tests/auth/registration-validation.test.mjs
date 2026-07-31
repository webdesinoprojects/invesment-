import assert from "node:assert/strict";
import test from "node:test";

import { registerSchema } from "../../src/features/auth/schemas/auth.ts";

const validRegistration = {
  fullName: "Independent Member",
  email: "independent@example.com",
  countryCode: "IN",
  mobile: "+919876543210",
  password: "Password1",
  confirmPassword: "Password1",
  securityPin: "1234",
};

test("registration accepts an omitted sponsor", () => {
  const parsed = registerSchema.safeParse(validRegistration);
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.inviteId, undefined);
});

test("registration normalizes a blank sponsor to no sponsor", () => {
  const parsed = registerSchema.safeParse({ ...validRegistration, inviteId: "  " });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.inviteId, undefined);
});

test("registration still validates a supplied sponsor", () => {
  assert.equal(
    registerSchema.safeParse({ ...validRegistration, inviteId: "random" }).success,
    false,
  );
  const parsed = registerSchema.safeParse({
    ...validRegistration,
    inviteId: "np123456",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.inviteId, "NP123456");
});

test("registration normalizes equivalent mobile formats to E.164", () => {
  const local = registerSchema.safeParse({
    ...validRegistration,
    mobile: "98765 43210",
  });
  const international = registerSchema.safeParse({
    ...validRegistration,
    mobile: "+91 98765-43210",
  });

  assert.equal(local.success, true);
  assert.equal(international.success, true);
  if (local.success && international.success) {
    assert.equal(local.data.mobile, "+919876543210");
    assert.equal(international.data.mobile, local.data.mobile);
  }
});

test("registration rejects an invalid mobile for the selected country", () => {
  const parsed = registerSchema.safeParse({
    ...validRegistration,
    mobile: "12345",
  });

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.deepEqual(parsed.error.flatten().fieldErrors.mobile, [
      "Enter a valid mobile number for the selected country.",
    ]);
  }
});
