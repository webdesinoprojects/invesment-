import test from "node:test";
import assert from "node:assert/strict";
import { reviewDepositSchema } from "../../src/features/admin/deposits/schemas/review-deposit.ts";
import { transitionWithdrawalSchema } from "../../src/features/admin/withdrawals/schemas/transition-withdrawal.ts";
import { changeMemberStatusSchema } from "../../src/features/admin/members/schemas/change-member-status.ts";
import { transitionInvestmentSchema } from "../../src/features/admin/investments/schemas/transition-investment.ts";
import { manualActivationSchema } from "../../src/features/admin/investments/schemas/manual-activation.ts";
import { can } from "../../src/features/admin/permissions.ts";
import {
  depositConfigurationSchema,
  investmentConfigurationSchema,
  withdrawalConfigurationSchema,
} from "../../src/features/settings/schemas/configuration.ts";
import {
  ADMIN_LOGIN_BLOCK_MS,
  ADMIN_LOGIN_WINDOW_MS,
  evaluateLoginRateLimit,
} from "../../src/features/admin/auth/login-rate-limit-policy.ts";

const id = "00000000-0000-4000-8000-000000000000";

test("deposit decision rejects unknown values", () => {
  assert.equal(reviewDepositSchema.safeParse({ id, decision: "OTHER", reason: "" }).success, false);
});
test("deposit rejection requires a reason", () => {
  assert.equal(reviewDepositSchema.safeParse({ id, decision: "REJECT", reason: "" }).success, false);
  assert.equal(reviewDepositSchema.safeParse({ id, decision: "REJECT", reason: "Hash does not match", confirmed: "true" }).success, true);
});
test("withdrawal payment requires a normalized BSC hash", () => {
  assert.equal(transitionWithdrawalSchema.safeParse({ id, transition: "PAY", paymentHash: "0x123", reason: "" }).success, false);
  const parsed = transitionWithdrawalSchema.safeParse({ id, transition: "PAY", paymentHash: `0x${"AB".repeat(32)}`, reason: "Paid externally", confirmed: "true" });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.paymentHash, `0x${"ab".repeat(32)}`);
});
test("withdrawal reject and failure require reasons", () => {
  assert.equal(transitionWithdrawalSchema.safeParse({ id, transition: "REJECT", reason: "" }).success, false);
  assert.equal(transitionWithdrawalSchema.safeParse({ id, transition: "FAIL", reason: "" }).success, false);
});
test("blocking and exceptional investment states require reasons", () => {
  assert.equal(changeMemberStatusSchema.safeParse({ id, status: "BLOCKED", reason: "" }).success, false);
  assert.equal(transitionInvestmentSchema.safeParse({ id, expectedStatus: "ACTIVE", status: "CANCELLED", reason: "" }).success, false);
  assert.equal(transitionInvestmentSchema.safeParse({ id, expectedStatus: "ACTIVE", status: "PAUSED", reason: "Compliance review", confirmed: "true" }).success, true);
});

test("shared configuration schemas reject invalid financial settings", () => {
  assert.equal(depositConfigurationSchema.safeParse({
    walletAddress: `0x${"a".repeat(40)}`,
    network: "BEP20",
    minimumAmount: "0",
  }).success, false);
  assert.equal(investmentConfigurationSchema.safeParse({
    minimumAmount: "50000000000000",
    monthlyRoiPercent: "8",
    durationMonths: 25,
    directCommissionPercent: "101",
    levelCommissionPercent: "0.25",
    maxLevelDepth: 5,
  }).success, false);
});

test("withdrawal settings normalize duplicate allowed days", () => {
  const parsed = withdrawalConfigurationSchema.parse({
    minimumAmount: "10",
    allowedDays: [16, 1, 16, 1],
  });
  assert.deepEqual(parsed.allowedDays, [1, 16]);
});

test("manual activation requires an exact user UUID and explicit confirmation", () => {
  const base = {
    userId: id,
    amount: "10",
    reason: "Support-approved activation",
    requestToken: "10000000-0000-4000-8000-000000000000",
  };
  assert.equal(manualActivationSchema.safeParse(base).success, false);
  assert.equal(manualActivationSchema.safeParse({ ...base, confirmed: "true" }).success, true);
  assert.equal(manualActivationSchema.safeParse({
    ...base,
    userId: "topa singh",
    confirmed: "true",
  }).success, false);
});

test("audit access and sidebar permissions use the central role matrix", () => {
  const sensitivePermissions = [
    "members.sensitive",
    "investments.manual",
    "wallet.adjust",
    "settings.manage",
    "administrators.manage",
    "audit.view",
  ];
  for (const permission of sensitivePermissions) {
    assert.equal(can("SUPER_ADMIN", permission), true, `SUPER_ADMIN must have ${permission}`);
    assert.equal(can("OPERATOR", permission), false, `OPERATOR must not have ${permission}`);
    assert.equal(can("VIEWER", permission), false, `VIEWER must not have ${permission}`);
  }

  const operationalPermissions = [
    "members.manage",
    "deposits.review",
    "withdrawals.process",
    "investments.manage",
    "reports.export",
  ];
  for (const permission of operationalPermissions) {
    assert.equal(can("SUPER_ADMIN", permission), true, `SUPER_ADMIN must have ${permission}`);
    assert.equal(can("OPERATOR", permission), true, `OPERATOR must have ${permission}`);
    assert.equal(can("VIEWER", permission), false, `VIEWER must not have ${permission}`);
  }

  for (const role of ["SUPER_ADMIN", "OPERATOR", "VIEWER"]) {
    assert.equal(can(role, "admin.view"), true, `${role} must be able to view admin`);
    assert.equal(can(role, "members.view"), true, `${role} must be able to view members`);
    assert.equal(can(role, "reports.view"), true, `${role} must be able to view reports`);
  }
});

test("admin login limiter locks and recovers after the shared window", () => {
  const now = new Date("2026-07-28T06:30:00.000Z");
  assert.equal(evaluateLoginRateLimit({
    failureCount: 5,
    windowStartedAt: new Date(now.getTime() - 1_000),
    blockedUntil: new Date(now.getTime() + ADMIN_LOGIN_BLOCK_MS),
  }, now).allowed, false);
  assert.equal(evaluateLoginRateLimit({
    failureCount: 5,
    windowStartedAt: new Date(now.getTime() - ADMIN_LOGIN_WINDOW_MS - 1),
    blockedUntil: new Date(now.getTime() - 1),
  }, now).allowed, true);
});
