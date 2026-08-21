import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const isolated =
  Boolean(testDatabaseUrl) &&
  testDatabaseUrl !== process.env.DATABASE_URL;
const skipReason = isolated
  ? false
  : "TEST_DATABASE_URL must be set to an isolated database different from DATABASE_URL";

if (isolated) process.env.DATABASE_URL = testDatabaseUrl;

let prisma;
let reviewDeposit;
let transitionWithdrawal;
let transitionInvestment;
let adjustWallet;
let reverseWalletEntry;
let activateInvestment;
let creditDailyRoi;
let runDailyRoi;
let createSystemSetting;
let updateSystemSetting;
let updateAdministratorLifecycle;
let prepareMemberDeletion;
let finalizeMemberDeletion;

const trackedUsers = new Set();
const trackedAdmins = new Set();
const trackedRuns = new Set();
const trackedSettings = new Set();
let sequence = 0;

before(async () => {
  if (!isolated) return;
  const dbModule = await import("../../src/lib/db/prisma.ts");
  prisma = dbModule.getPrisma();
  ({ reviewDeposit } = await import("../../src/features/admin/deposits/services/review-deposit.ts"));
  ({ transitionWithdrawal } = await import("../../src/features/admin/withdrawals/services/transition-withdrawal.ts"));
  ({ transitionInvestment } = await import("../../src/features/admin/investments/services/transition-investment.ts"));
  ({ adjustWallet, reverseWalletEntry } = await import("../../src/features/admin/wallet/services/wallet-operation.ts"));
  ({ activateInvestment } = await import("../../src/features/investment/services/activate-investment.ts"));
  ({ creditDailyRoi } = await import("../../src/features/roi/services/credit-daily-roi.ts"));
  ({ runDailyRoi } = await import("../../src/features/roi/services/run-daily-roi.ts"));
  ({ createSystemSetting, updateSystemSetting } = await import("../../src/features/admin/settings/service.ts"));
  ({ updateAdministratorLifecycle } = await import("../../src/features/admin/administrators/service.ts"));
  ({ prepareMemberDeletion, finalizeMemberDeletion } = await import("../../src/features/admin/members/services/delete-member.ts"));
  await prisma.adminLoginThrottle.findFirst();
});

after(async () => {
  if (!isolated || !prisma) return;
  const userIds = [...trackedUsers];
  const adminIds = [...trackedAdmins];
  const runIds = [...trackedRuns];
  await prisma.roiCredit.deleteMany({ where: { runId: { in: runIds } } });
  await prisma.roiRun.deleteMany({ where: { id: { in: runIds } } });
  await prisma.platformRevenueEntry.deleteMany({ where: { sourceUserId: { in: userIds } } });
  await prisma.incomeLedgerEntry.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { sourceUserId: { in: userIds } }] },
  });
  await prisma.referralCommissionSchedule.deleteMany({
    where: { OR: [{ beneficiaryUserId: { in: userIds } }, { sourceUserId: { in: userIds } }] },
  });
  await prisma.depositRequest.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.withdrawalRequest.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.investment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.walletLedgerEntry.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.adminUserNote.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.referralClosure.deleteMany({
    where: { OR: [{ ancestorId: { in: userIds } }, { descendantId: { in: userIds } }] },
  });
  await prisma.referralLink.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({
    where: { OR: [{ actorAdminId: { in: adminIds } }, { targetUserId: { in: userIds } }] },
  });
  await prisma.systemSettingRevision.deleteMany({
    where: { settingKey: { in: [...trackedSettings] } },
  });
  await prisma.systemSetting.deleteMany({ where: { key: { in: [...trackedSettings] } } });
  await prisma.userProfile.deleteMany({ where: { id: { in: userIds } } });
  await prisma.adminProfile.deleteMany({ where: { id: { in: adminIds } } });
  await prisma.$disconnect();
});

test("legacy deposit requests can only be rejected and never credit earnings", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const user = await createUser();
  await seedBalance(user.id, "100");
  const first = await prisma.depositRequest.create({
    data: { userId: user.id, amount: "10", transactionHash: hashFor(1) },
  });
  const second = await prisma.depositRequest.create({
    data: { userId: user.id, amount: "20", transactionHash: hashFor(2) },
  });
  const rejections = await Promise.all([
    reviewDeposit({ id: first.id, decision: "REJECT", reason: "Use investment credit", confirmed: "true", adminId: admin.id }),
    reviewDeposit({ id: second.id, decision: "REJECT", reason: "Use investment credit", confirmed: "true", adminId: admin.id }),
  ]);
  assert.equal(rejections.every((result) => result.ok), true);
  assert.equal((await latestBalance(user.id)).toFixed(6), "100.000000");
  assert.equal(await prisma.depositRequest.count({
    where: { id: { in: [first.id, second.id] }, status: "REJECTED" },
  }), 2);

  const duplicate = await prisma.depositRequest.create({
    data: { userId: user.id, amount: "5", transactionHash: hashFor(3) },
  });
  const decisions = await Promise.all([
    reviewDeposit({ id: duplicate.id, decision: "REJECT", reason: "Use investment credit", confirmed: "true", adminId: admin.id }),
    reviewDeposit({ id: duplicate.id, decision: "REJECT", reason: "Use investment credit", confirmed: "true", adminId: admin.id }),
  ]);
  assert.equal(decisions.filter((result) => result.ok).length, 1);
  assert.equal(await prisma.walletLedgerEntry.count({
    where: { referenceId: duplicate.id, category: "DEPOSIT" },
  }), 1);
});

test("withdrawal paid and release transitions apply exactly once and payment hashes stay unique", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const user = await createUser();
  await seedBalance(user.id, "200");
  const paid = await createWithdrawal(user.id, "40");
  assert.equal((await transitionWithdrawal({
    id: paid.id,
    transition: "PROCESS",
    reason: "Reviewed",
    confirmed: "true",
    adminId: admin.id,
  })).ok, true);
  const paymentHash = hashFor(20);
  const paidResults = await Promise.all([
    transitionWithdrawal({ id: paid.id, transition: "PAY", paymentHash, reason: "Paid", confirmed: "true", adminId: admin.id }),
    transitionWithdrawal({ id: paid.id, transition: "PAY", paymentHash, reason: "Paid", confirmed: "true", adminId: admin.id }),
  ]);
  assert.equal(paidResults.filter((result) => result.ok).length, 1);
  assert.equal(await prisma.walletLedgerEntry.count({
    where: { referenceId: paid.id, direction: "SETTLE" },
  }), 1);
  const retainedFee = await prisma.platformRevenueEntry.findUniqueOrThrow({
    where: { withdrawalRequestId: paid.id },
  });
  assert.equal(retainedFee.amount.toFixed(6), "4.000000");

  const released = await createWithdrawal(user.id, "30");
  const releaseResults = await Promise.all([
    transitionWithdrawal({ id: released.id, transition: "REJECT", reason: "Rejected", confirmed: "true", adminId: admin.id }),
    transitionWithdrawal({ id: released.id, transition: "REJECT", reason: "Rejected", confirmed: "true", adminId: admin.id }),
  ]);
  assert.equal(releaseResults.filter((result) => result.ok).length, 1);
  assert.equal(await prisma.walletLedgerEntry.count({
    where: { referenceId: released.id, direction: "RELEASE" },
  }), 1);

  const duplicateHash = await createWithdrawal(user.id, "20");
  await transitionWithdrawal({ id: duplicateHash.id, transition: "PROCESS", reason: "Reviewed", confirmed: "true", adminId: admin.id });
  const hashResult = await transitionWithdrawal({
    id: duplicateHash.id,
    transition: "PAY",
    paymentHash,
    reason: "Paid",
    confirmed: "true",
    adminId: admin.id,
  });
  assert.equal(hashResult.ok, false);
  assert.equal(hashResult.code, "DUPLICATE_HASH");
});

test("concurrent adjustments keep an exact balance and a reversal can post only once", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const user = await createUser();
  await seedBalance(user.id, "100");
  const results = await Promise.all([
    adjustWallet({ userId: user.id, operation: "DEBIT", amount: "30", reason: "Correction A", idempotencyKey: randomUUID(), confirmed: "true", adminId: admin.id }),
    adjustWallet({ userId: user.id, operation: "DEBIT", amount: "50", reason: "Correction B", idempotencyKey: randomUUID(), confirmed: "true", adminId: admin.id }),
  ]);
  assert.equal(results.every((result) => result.ok), true);
  assert.equal((await latestBalance(user.id)).toFixed(6), "20.000000");

  const debit = await adjustWallet({
    userId: user.id,
    operation: "DEBIT",
    amount: "15",
    reason: "Reversible correction",
    idempotencyKey: randomUUID(),
    confirmed: "true",
    adminId: admin.id,
  });
  assert.equal(debit.ok, true);
  const reversals = await Promise.all([
    reverseWalletEntry({ entryId: debit.entryId, reason: "Undo correction", idempotencyKey: randomUUID(), confirmed: "true", adminId: admin.id }),
    reverseWalletEntry({ entryId: debit.entryId, reason: "Undo correction", idempotencyKey: randomUUID(), confirmed: "true", adminId: admin.id }),
  ]);
  assert.equal(reversals.filter((result) => result.ok).length, 1);
});

test("manual activation targets the exact UUID when names duplicate and rejects repeat tokens", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const first = await createUser({ fullName: "Duplicate Name" });
  const second = await createUser({ fullName: "Duplicate Name" });
  const settings = defaultInvestmentSettings();
  const token = randomUUID();
  const activated = await activateInvestment({
    targetUserId: second.id,
    amount: "10",
    requestToken: token,
    settings,
    adminId: admin.id,
  });
  assert.equal(activated.ok, true);
  assert.equal(await prisma.investment.count({ where: { userId: first.id } }), 0);
  assert.equal(await prisma.investment.count({ where: { userId: second.id } }), 1);
  assert.equal(await prisma.walletLedgerEntry.count({ where: { userId: second.id } }), 0,
    "investment principal must not become withdrawable earnings");
  const repeat = await activateInvestment({
    targetUserId: second.id,
    amount: "10",
    requestToken: token,
    settings,
    adminId: admin.id,
  });
  assert.deepEqual(repeat, { ok: false, code: "DUPLICATE_REQUEST" });
});

test("referral bonuses unlock at five direct and five branch investments", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const settings = defaultInvestmentSettings();
  const sponsor = await createUser();
  const directMembers = [];
  for (let index = 0; index < 5; index += 1) {
    const member = await createUser({ sponsorId: sponsor.id });
    directMembers.push(member);
    const result = await activateInvestment({
      targetUserId: member.id,
      amount: "100",
      requestToken: randomUUID(),
      settings,
      adminId: admin.id,
    });
    assert.equal(result.ok, true);
    const monthlyCount = await prisma.incomeLedgerEntry.count({
      where: { userId: sponsor.id, type: "MONTHLY_DIRECT" },
    });
    assert.equal(monthlyCount, index < 4 ? 0 : 5);
  }

  assert.equal(await prisma.incomeLedgerEntry.count({
    where: { userId: sponsor.id, type: "DIRECT_REFERRAL_BONUS" },
  }), 5);
  assert.equal((await latestBalance(sponsor.id)).toFixed(6), "30.000000");

  const sixthDirect = await createUser({ sponsorId: sponsor.id });
  const sixthDirectInvestment = await activateInvestment({
    targetUserId: sixthDirect.id,
    amount: "100",
    requestToken: randomUUID(),
    settings,
    adminId: admin.id,
  });
  assert.equal(sixthDirectInvestment.ok, true, "five directs is a minimum, not a cap");
  assert.equal(await prisma.incomeLedgerEntry.count({
    where: { userId: sponsor.id, type: "DIRECT_REFERRAL_BONUS" },
  }), 6);
  assert.equal(await prisma.incomeLedgerEntry.count({
    where: { userId: sponsor.id, type: "MONTHLY_DIRECT" },
  }), 6);

  const repeatMemberInvestment = await activateInvestment({
    targetUserId: directMembers[0].id,
    amount: "100",
    requestToken: randomUUID(),
    settings,
    adminId: admin.id,
  });
  assert.equal(repeatMemberInvestment.ok, true);
  assert.equal(await prisma.incomeLedgerEntry.count({
    where: { userId: sponsor.id, type: "DIRECT_REFERRAL_BONUS" },
  }), 6, "the one-time direct bonus must not repeat for later investments");

  const branchOwner = directMembers[0];
  for (let index = 0; index < 5; index += 1) {
    const member = await createUser({ sponsorId: branchOwner.id });
    const result = await activateInvestment({
      targetUserId: member.id,
      amount: "100",
      requestToken: randomUUID(),
      settings,
      adminId: admin.id,
    });
    assert.equal(result.ok, true);
    const levelCount = await prisma.incomeLedgerEntry.count({
      where: { userId: sponsor.id, type: "MONTHLY_LEVEL" },
    });
    assert.equal(levelCount, index < 4 ? 0 : 5);
  }

  assert.equal(await prisma.referralCommissionSchedule.count({
    where: { beneficiaryUserId: sponsor.id, type: "MONTHLY_LEVEL", paidPeriods: 1 },
  }), 5);
});

test("ROI preserves partial credits on retry and enforces the payout cap", { skip: skipReason }, async () => {
  const user = await createUser();
  const capInvestment = await prisma.investment.create({
    data: {
      userId: user.id,
      amount: "100",
      monthlyRoiPercent: "100",
      durationMonths: 25,
      payoutCapAmount: "1",
      source: "ADMIN",
      activatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  const run = await createRun(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const dateKey = run.runDate.toISOString().slice(0, 10);
  const capResult = await creditDailyRoi({
    runId: run.id,
    investmentId: capInvestment.id,
    creditDate: run.runDate,
    dateKey,
  });
  assert.deepEqual(capResult, { status: "CREDITED", amount: "1.000000" });
  const capped = await prisma.investment.findUniqueOrThrow({ where: { id: capInvestment.id } });
  assert.equal(capped.paidOutAmount.toFixed(6), "1.000000");
  assert.equal(capped.status, "COMPLETED");

  const retryUser = await createUser();
  await Promise.all([0, 1].map(() => prisma.investment.create({
    data: {
      userId: retryUser.id,
      amount: "100",
      monthlyRoiPercent: "8",
      durationMonths: 25,
      payoutCapAmount: "200",
      source: "ADMIN",
      activatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  })));
  const failedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  let failedOnce = false;
  const partial = await runDailyRoi(failedDate, undefined, {
    credit: async (input) => {
      if (!failedOnce) {
        failedOnce = true;
        throw new Error("Injected isolated-test failure");
      }
      return creditDailyRoi(input);
    },
  });
  assert.equal(partial.status, "FAILED");
  assert.equal(partial.credited > 0, true);
  const partialRun = await prisma.roiRun.findUniqueOrThrow({
    where: { runDate: new Date(partial.date) },
  });
  trackedRuns.add(partialRun.id);
  const retried = await runDailyRoi(failedDate);
  assert.equal(retried.status, "COMPLETED");
  assert.equal(retried.failed, 0);
});

test("ROI completes at the 25-month boundary and never credits month 26", { skip: skipReason }, async () => {
  const user = await createUser();
  const investment = await prisma.investment.create({
    data: {
      userId: user.id,
      amount: "100",
      monthlyRoiPercent: "8",
      durationMonths: 25,
      payoutCapAmount: "200",
      paidOutAmount: "25",
      source: "ADMIN",
      activatedAt: new Date("2078-11-10T00:00:00.000Z"),
    },
  });
  const expiryRun = await createRun(new Date("2080-12-10T00:00:00.000Z"));
  const expiry = await creditDailyRoi({
    runId: expiryRun.id,
    investmentId: investment.id,
    creditDate: expiryRun.runDate,
    dateKey: "2080-12-10",
  });
  const monthTwentySixRun = await createRun(new Date("2081-01-10T00:00:00.000Z"));
  const monthTwentySix = await creditDailyRoi({
    runId: monthTwentySixRun.id,
    investmentId: investment.id,
    creditDate: monthTwentySixRun.runDate,
    dateKey: "2081-01-10",
  });

  const [completed, incomeCount, creditCount, unchangedUser] = await Promise.all([
    prisma.investment.findUniqueOrThrow({ where: { id: investment.id } }),
    prisma.incomeLedgerEntry.count({ where: { investmentId: investment.id } }),
    prisma.roiCredit.count({ where: { investmentId: investment.id } }),
    prisma.userProfile.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        status: true,
        isReferralActive: true,
        referralLink: { select: { isActive: true } },
      },
    }),
  ]);

  assert.deepEqual(expiry, { status: "COMPLETED" });
  assert.deepEqual(monthTwentySix, { status: "COMPLETED" });
  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.paidOutAmount.toFixed(6), "25.000000");
  assert.equal(incomeCount, 0);
  assert.equal(creditCount, 0);
  assert.equal(unchangedUser.status, "ACTIVE");
  assert.equal(unchangedUser.isReferralActive, true);
  assert.equal(unchangedUser.referralLink?.isActive, true);
});

test("competing investment transitions and stale setting writes cannot overwrite each other", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const user = await createUser();
  const investment = await prisma.investment.create({
    data: {
      userId: user.id,
      amount: "10",
      monthlyRoiPercent: "8",
      durationMonths: 25,
      payoutCapAmount: "20",
      source: "ADMIN",
    },
  });
  const transitions = await Promise.all([
    transitionInvestment({ id: investment.id, expectedStatus: "ACTIVE", status: "PAUSED", reason: "Review", confirmed: "true", adminId: admin.id }),
    transitionInvestment({ id: investment.id, expectedStatus: "ACTIVE", status: "CANCELLED", reason: "Close", confirmed: "true", adminId: admin.id }),
  ]);
  assert.equal(transitions.filter((result) => result.ok).length, 1);

  const key = `integration_setting_${randomUUID()}`;
  trackedSettings.add(key);
  await prisma.systemSetting.create({ data: { key, value: { enabled: true } } });
  const writes = await Promise.all([
    updateSystemSetting({ key, value: { enabled: false }, version: 1, reason: "First", adminId: admin.id }),
    updateSystemSetting({ key, value: { enabled: true, mode: "second" }, version: 1, reason: "Second", adminId: admin.id }),
  ]);
  assert.equal(writes.filter((result) => result.ok).length, 1);
  assert.equal((await prisma.systemSetting.findUniqueOrThrow({ where: { key } })).version, 2);
});

test("fresh settings are initialized once with revision and audit history", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const key = `integration_setting_${randomUUID()}`;
  trackedSettings.add(key);

  const attempts = await Promise.all([
    createSystemSetting({
      key,
      value: { enabled: true },
      reason: "Initial production configuration",
      adminId: admin.id,
    }),
    createSystemSetting({
      key,
      value: { enabled: false },
      reason: "Competing initialization",
      adminId: admin.id,
    }),
  ]);

  assert.equal(attempts.filter((result) => result.ok).length, 1);
  assert.equal(await prisma.systemSettingRevision.count({ where: { settingKey: key } }), 1);
  assert.equal(await prisma.auditLog.count({
    where: { action: "SYSTEM_SETTING_CREATE", entityId: key },
  }), 1);
});

test("concurrent final-super-admin changes leave at least one active super administrator", { skip: skipReason }, async () => {
  const baselineActiveSuperAdmins = await prisma.adminProfile.count({
    where: { role: "SUPER_ADMIN", isActive: true },
  });
  const first = await createAdmin();
  const second = await createAdmin();
  const results = await Promise.all([
    updateAdministratorLifecycle({
      id: second.id,
      operation: "DEACTIVATE",
      role: "SUPER_ADMIN",
      reason: "Concurrency test",
      confirmed: "true",
      actorAdminId: first.id,
    }),
    updateAdministratorLifecycle({
      id: first.id,
      operation: "DEACTIVATE",
      role: "SUPER_ADMIN",
      reason: "Concurrency test",
      confirmed: "true",
      actorAdminId: second.id,
    }),
  ]);
  const activeSuperAdmins = await prisma.adminProfile.count({
    where: { role: "SUPER_ADMIN", isActive: true },
  });
  assert.equal(activeSuperAdmins >= 1, true);
  assert.equal(
    results.filter((result) => result.ok).length,
    baselineActiveSuperAdmins === 0 ? 1 : 2,
  );
});

test("member deletion removes unused profiles but protects financial records", { skip: skipReason }, async () => {
  const admin = await createAdmin();
  const unused = await createUser();
  const deletionInput = {
    id: unused.id,
    memberId: unused.memberId,
    confirmation: unused.memberId,
    reason: "Duplicate unused registration",
    confirmed: "true",
    adminId: admin.id,
  };
  const prepared = await prepareMemberDeletion(deletionInput);
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  const deleted = await finalizeMemberDeletion({
    id: prepared.member.id,
    authUserId: prepared.member.authUserId,
    memberId: prepared.member.memberId,
    adminId: admin.id,
    reason: deletionInput.reason,
  });
  assert.equal(deleted.ok, true);
  assert.equal(await prisma.userProfile.findUnique({ where: { id: unused.id } }), null);
  assert.equal(await prisma.auditLog.count({
    where: { action: "MEMBER_DELETE", entityId: unused.id, actorAdminId: admin.id },
  }), 1);

  const funded = await createUser();
  await seedBalance(funded.id, "25");
  const protectedResult = await prepareMemberDeletion({
    ...deletionInput,
    id: funded.id,
    memberId: funded.memberId,
    confirmation: funded.memberId,
  });
  assert.equal(protectedResult.ok, false);
  if (!protectedResult.ok) assert.equal(protectedResult.code, "PROTECTED");
  assert.equal(await prisma.userProfile.findUnique({ where: { id: funded.id } }) !== null, true);
});

async function createAdmin() {
  const id = randomUUID();
  trackedAdmins.add(id);
  return prisma.adminProfile.create({
    data: {
      id,
      authUserId: randomUUID(),
      email: `${id}@admin.integration.invalid`,
      displayName: "Integration Admin",
      role: "SUPER_ADMIN",
    },
  });
}

async function createUser(overrides = {}) {
  sequence += 1;
  const id = randomUUID();
  trackedUsers.add(id);
  const memberId = `NP${String(800000 + sequence)}`;
  const user = await prisma.userProfile.create({
    data: {
      id,
      authUserId: randomUUID(),
      memberId,
      fullName: overrides.fullName ?? `Integration Member ${sequence}`,
      email: `${id}@member.integration.invalid`,
      mobile: `+9199${String(10000000 + sequence)}`,
      countryCode: "IN",
      securityPinHash: "integration-test-only",
      status: "ACTIVE",
      isReferralActive: true,
      sponsorId: overrides.sponsorId ?? null,
    },
  });
  await prisma.referralLink.create({
    data: { userId: user.id, code: memberId, isActive: true },
  });
  return user;
}

async function seedBalance(userId, amount) {
  return prisma.walletLedgerEntry.create({
    data: {
      userId,
      direction: "CREDIT",
      category: "DEPOSIT",
      amount,
      balanceAfter: amount,
      referenceType: "IntegrationFixture",
      idempotencyKey: `fixture:${randomUUID()}`,
      description: "Isolated integration-test balance.",
    },
  });
}

async function latestBalance(userId) {
  return (await prisma.walletLedgerEntry.findFirstOrThrow({
    where: { userId },
    orderBy: { sequence: "desc" },
  })).balanceAfter;
}

async function createWithdrawal(userId, amount) {
  const id = randomUUID();
  const current = await latestBalance(userId);
  const hold = await prisma.walletLedgerEntry.create({
    data: {
      userId,
      direction: "HOLD",
      category: "WITHDRAWAL",
      amount,
      balanceAfter: current.minus(amount),
      referenceType: "WithdrawalRequest",
      referenceId: id,
      idempotencyKey: `fixture-withdrawal:${id}`,
      description: "Isolated integration-test hold.",
    },
  });
  return prisma.withdrawalRequest.create({
    data: {
      id,
      userId,
      amount,
      feeAmount: (Number(amount) * 0.1).toString(),
      netAmount: (Number(amount) * 0.9).toString(),
      network: "MANUAL",
      walletAddress: `0x${"1".repeat(40)}`,
      holdLedgerEntryId: hold.id,
    },
  });
}

async function createRun(date) {
  const run = await prisma.roiRun.create({
    data: { runDate: new Date(date.toISOString().slice(0, 10)), status: "RUNNING" },
  });
  trackedRuns.add(run.id);
  return run;
}

function hashFor(value) {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function defaultInvestmentSettings() {
  return {
    minimumAmount: "10",
    monthlyRoiPercent: "8",
    durationMonths: 25,
    directBonusPercent: "5",
    directMonthlyPercent: "1",
    levelMonthlyPercent: "0.25",
    directQualificationCount: 5,
    branchQualificationCount: 5,
  };
}
