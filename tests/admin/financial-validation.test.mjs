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

const id = "00000000-0000-4000-8000-000000000000";

test("deposit decision rejects unknown values", () => {
  assert.equal(reviewDepositSchema.safeParse({ id, decision: "OTHER", reason: "" }).success, false);
});
test("deposit rejection requires a reason", () => {
  assert.equal(reviewDepositSchema.safeParse({ id, decision: "REJECT", reason: "" }).success, false);
  assert.equal(reviewDepositSchema.safeParse({ id, decision: "REJECT", reason: "Hash does not match" }).success, true);
});
test("withdrawal payment requires a normalized BSC hash", () => {
  assert.equal(transitionWithdrawalSchema.safeParse({ id, transition: "PAY", paymentHash: "0x123", reason: "" }).success, false);
  const parsed = transitionWithdrawalSchema.safeParse({ id, transition: "PAY", paymentHash: `0x${"AB".repeat(32)}`, reason: "Paid externally" });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.paymentHash, `0x${"ab".repeat(32)}`);
});
test("withdrawal reject and failure require reasons", () => {
  assert.equal(transitionWithdrawalSchema.safeParse({ id, transition: "REJECT", reason: "" }).success, false);
  assert.equal(transitionWithdrawalSchema.safeParse({ id, transition: "FAIL", reason: "" }).success, false);
});
test("blocking and exceptional investment states require reasons", () => {
  assert.equal(changeMemberStatusSchema.safeParse({ id, status: "BLOCKED", reason: "" }).success, false);
  assert.equal(transitionInvestmentSchema.safeParse({ id, status: "CANCELLED", reason: "" }).success, false);
  assert.equal(transitionInvestmentSchema.safeParse({ id, status: "PAUSED", reason: "Compliance review" }).success, true);
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
  assert.equal(can("SUPER_ADMIN", "audit.view"), true);
  assert.equal(can("OPERATOR", "audit.view"), false);
  assert.equal(can("VIEWER", "audit.view"), false);
  assert.equal(can("OPERATOR", "deposits.review"), true);
  assert.equal(can("VIEWER", "deposits.review"), false);
});
