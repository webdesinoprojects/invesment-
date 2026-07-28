import test from "node:test";
import assert from "node:assert/strict";
import { reviewDepositSchema } from "../../src/features/admin/deposits/schemas/review-deposit.ts";
import { transitionWithdrawalSchema } from "../../src/features/admin/withdrawals/schemas/transition-withdrawal.ts";
import { changeMemberStatusSchema } from "../../src/features/admin/members/schemas/change-member-status.ts";
import { transitionInvestmentSchema } from "../../src/features/admin/investments/schemas/transition-investment.ts";

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
