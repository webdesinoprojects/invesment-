import "dotenv/config";

import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { z } from "zod";

const inputSchema = z.object({
  DATABASE_URL: z.string().min(20),
  DIRECT_URL: z.string().min(20).optional(),
  TEST_SPONSOR_MEMBER_ID: z.string().regex(/^NP\d{6,10}$/).default("NP900001"),
});

const parsed = inputSchema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => String(issue.path[0])).join(", ");
  throw new Error(`Missing or invalid demo seed environment fields: ${fields}`);
}

const input = parsed.data;
const database = new Client({ connectionString: input.DIRECT_URL ?? input.DATABASE_URL });
const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

const members = [
  { memberId: "NP910001", fullName: "Aarav Sharma", mobile: "+919810000001", sponsor: "ROOT", status: "ACTIVE", rank: 1, daysAgo: 70 },
  { memberId: "NP910002", fullName: "Meera Patel", mobile: "+919810000002", sponsor: "ROOT", status: "ACTIVE", rank: 2, daysAgo: 55 },
  { memberId: "NP910003", fullName: "Rohan Verma", mobile: "+919810000003", sponsor: "ROOT", status: "PENDING", rank: 0, daysAgo: 16 },
  { memberId: "NP910004", fullName: "Priya Nair", mobile: "+919810000004", sponsor: "ROOT", status: "ACTIVE", rank: 1, daysAgo: 2 },
  { memberId: "NP910005", fullName: "Kabir Singh", mobile: "+919810000005", sponsor: "ROOT", status: "BLOCKED", rank: 0, daysAgo: 40 },
  { memberId: "NP920001", fullName: "Leela Joshi", mobile: "+919820000001", sponsor: "NP910001", status: "ACTIVE", rank: 1, daysAgo: 48 },
  { memberId: "NP920002", fullName: "Vikram Rao", mobile: "+919820000002", sponsor: "NP910001", status: "ACTIVE", rank: 0, daysAgo: 35 },
  { memberId: "NP920003", fullName: "Ananya Das", mobile: "+919820000003", sponsor: "NP910002", status: "ACTIVE", rank: 1, daysAgo: 28 },
  { memberId: "NP920004", fullName: "Dev Malhotra", mobile: "+919820000004", sponsor: "NP910002", status: "PENDING", rank: 0, daysAgo: 9 },
  { memberId: "NP930001", fullName: "Ishaan Kapoor", mobile: "+919830000001", sponsor: "NP920001", status: "ACTIVE", rank: 0, daysAgo: 21 },
  { memberId: "NP940001", fullName: "Sara Khan", mobile: "+919840000001", sponsor: "NP930001", status: "ACTIVE", rank: 1, daysAgo: 14 },
  { memberId: "NP950001", fullName: "Neel Mehta", mobile: "+919850000001", sponsor: "NP940001", status: "ACTIVE", rank: 0, daysAgo: 7 },
  { memberId: "NP960001", fullName: "Tara Iyer", mobile: "+919860000001", sponsor: "NP950001", status: "ACTIVE", rank: 0, daysAgo: 4 },
];

const investmentFixtures = [
  { memberId: "ROOT", amount: 500, daysAgo: 60, fundedByRoot: true },
  { memberId: "NP910001", amount: 250, daysAgo: 45, fundedByRoot: true },
  { memberId: "NP910002", amount: 500, daysAgo: 30, fundedByRoot: true },
  { memberId: "NP910004", amount: 300, daysAgo: 0, fundedByRoot: true },
  { memberId: "NP920001", amount: 200, daysAgo: 20, fundedByRoot: false },
  { memberId: "NP920002", amount: 350, daysAgo: 12, fundedByRoot: false },
  { memberId: "NP920003", amount: 125, daysAgo: 8, fundedByRoot: false },
  { memberId: "NP930001", amount: 600, daysAgo: 6, fundedByRoot: false },
  { memberId: "NP940001", amount: 175, daysAgo: 4, fundedByRoot: false },
  { memberId: "NP950001", amount: 225, daysAgo: 3, fundedByRoot: false },
  { memberId: "NP960001", amount: 150, daysAgo: 2, fundedByRoot: false },
];

try {
  await database.connect();
  const marker = await database.query(
    'SELECT 1 FROM "system_settings" WHERE "key" = $1',
    ["demo_seed_v1"],
  );
  if (marker.rowCount) {
    console.log("Demo data already exists; no changes were made.");
    process.exitCode = 0;
  } else {
    await database.query("BEGIN");
    await seedDemoData();
    await database.query("COMMIT");
    console.log("Demo data created for all user-panel views.");
    console.log("Added 13 downline members, 11 investments, income ledgers, deposits, and withdrawals.");
  }
  await printDemoSummary();
} catch (error) {
  await database.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await database.end().catch(() => undefined);
}

async function seedDemoData() {
  const rootResult = await database.query(
    `SELECT "id", "securityPinHash"
     FROM "user_profiles"
     WHERE "memberId" = $1
     LIMIT 1`,
    [input.TEST_SPONSOR_MEMBER_ID],
  );
  if (!rootResult.rowCount) {
    throw new Error("Run npm run seed:test-sponsor before seeding demo data.");
  }

  const root = rootResult.rows[0];
  const profiles = new Map([["ROOT", root.id]]);
  await database.query(
    `UPDATE "user_profiles"
     SET "rank" = 2,
         "bep20WalletAddress" = '0x2222222222222222222222222222222222222222',
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1`,
    [root.id],
  );

  for (const member of members) {
    const sponsorId = profiles.get(member.sponsor);
    if (!sponsorId) throw new Error(`Missing demo sponsor ${member.sponsor}.`);

    const createdAt = dateDaysAgo(member.daysAgo);
    const result = await database.query(
      `INSERT INTO "user_profiles" (
        "authUserId", "memberId", "fullName", "email", "mobile", "countryCode",
        "securityPinHash", "status", "rank", "isReferralActive", "sponsorId",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, 'IN', $6, $7, $8, $9, $10, $11, $11)
      RETURNING "id"`,
      [
        randomUUID(),
        member.memberId,
        member.fullName,
        `${member.memberId.toLowerCase()}@demo.local`,
        member.mobile,
        root.securityPinHash,
        member.status,
        member.rank,
        member.status === "ACTIVE",
        sponsorId,
        createdAt,
      ],
    );
    const profileId = result.rows[0].id;
    profiles.set(member.memberId, profileId);

    await database.query(
      `INSERT INTO "referral_links" (
        "userId", "code", "isActive", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $4)`,
      [profileId, member.memberId, member.status === "ACTIVE", createdAt],
    );
    await database.query(
      `INSERT INTO "referral_closure" (
        "ancestorId", "descendantId", "depth", "createdAt"
      ) VALUES ($1, $1, 0, $2)`,
      [profileId, createdAt],
    );
    await database.query(
      `INSERT INTO "referral_closure" (
        "ancestorId", "descendantId", "depth", "createdAt"
      )
      SELECT "ancestorId", $1, "depth" + 1, $2
      FROM "referral_closure"
      WHERE "descendantId" = $3`,
      [profileId, createdAt, sponsorId],
    );
  }

  const depositRequestId = await seedDeposits(root.id);
  let balance = await getLatestBalance(root.id);
  const approvedDepositCredit = await addWalletEntry({
    userId: root.id,
    balance,
    direction: "CREDIT",
    category: "DEPOSIT",
    amount: 5000,
    referenceType: "DepositRequest",
    referenceId: depositRequestId,
    key: "demo:deposit:approved",
    description: "Approved BEP-20 deposit.",
    createdAt: dateDaysAgo(65),
    returnId: true,
  });
  balance = approvedDepositCredit.balance;
  await database.query(
    `UPDATE "deposit_requests"
     SET "status" = 'APPROVED', "approvedAmount" = "amount", "reviewSource" = 'IMPORT',
         "creditLedgerEntryId" = $1, "reviewedAt" = $2, "updatedAt" = $2
     WHERE "id" = $3`,
    [approvedDepositCredit.id, dateDaysAgo(65), depositRequestId],
  );

  const investments = new Map();
  for (const fixture of investmentFixtures) {
    const userId = profiles.get(fixture.memberId);
    if (!userId) throw new Error(`Missing investment member ${fixture.memberId}.`);
    const activatedAt = dateDaysAgo(fixture.daysAgo);
    const investment = await database.query(
      `INSERT INTO "investments" (
        "userId", "amount", "payoutCapAmount", "paidOutAmount", "status", "source",
        "fundedByUserId", "activatedAt", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, 0, 'ACTIVE', $4, $5, $6, $6, $6)
      RETURNING "id"`,
      [
        userId,
        fixture.amount,
        fixture.amount * 2,
        fixture.fundedByRoot ? "WALLET" : "OFFLINE",
        fixture.fundedByRoot ? root.id : null,
        activatedAt,
      ],
    );
    const investmentId = investment.rows[0].id;
    investments.set(fixture.memberId, {
      id: investmentId,
      amount: fixture.amount,
      userId,
    });

    if (fixture.fundedByRoot) {
      balance = await addWalletEntry({
        userId: root.id,
        balance,
        direction: "DEBIT",
        category: "INVESTMENT",
        amount: fixture.amount,
        referenceType: "Investment",
        referenceId: investmentId,
        key: `demo:investment:${fixture.memberId}`,
        description: `Wallet-funded activation for ${fixture.memberId === "ROOT" ? input.TEST_SPONSOR_MEMBER_ID : fixture.memberId}.`,
        createdAt: activatedAt,
      });
    }
  }

  const roiInvestment = investments.get("ROOT");
  let totalRoi = 0;
  for (let index = 0; index < 5; index += 1) {
    const amount = 1.333333;
    const creditedAt = dateDaysAgo(10 - index);
    const incomeId = await addIncome({
      userId: root.id,
      investmentId: roiInvestment.id,
      type: "DAILY_ROI",
      percent: 8,
      baseAmount: 500,
      amount,
      level: null,
      sourceUserId: null,
      key: `demo:roi:${index + 1}`,
      description: "Daily ROI income.",
      creditedAt,
    });
    balance = await addWalletEntry({
      userId: root.id,
      balance,
      direction: "CREDIT",
      category: "ROI",
      amount,
      referenceType: "IncomeLedgerEntry",
      referenceId: incomeId,
      key: `demo:roi-wallet:${index + 1}`,
      description: "Daily ROI credited.",
      createdAt: creditedAt,
    });
    await addRoiCredit({
      investmentId: roiInvestment.id,
      incomeId,
      amount,
      creditDate: creditedAt,
    });
    totalRoi += amount;
  }
  await database.query(
    'UPDATE "investments" SET "paidOutAmount" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2',
    [totalRoi.toFixed(6), roiInvestment.id],
  );

  for (const memberId of ["NP910001", "NP910002", "NP910004"]) {
    const investment = investments.get(memberId);
    const amount = investment.amount * 0.01;
    const incomeId = await addIncome({
      userId: root.id,
      investmentId: investment.id,
      type: "DIRECT_REFERRAL",
      percent: 1,
      baseAmount: investment.amount,
      amount,
      level: null,
      sourceUserId: investment.userId,
      key: `demo:direct:${memberId}`,
      description: "Direct referral commission.",
      creditedAt: dateDaysAgo(Math.max(1, investmentFixtures.find((item) => item.memberId === memberId).daysAgo)),
    });
    balance = await addWalletEntry({
      userId: root.id,
      balance,
      direction: "CREDIT",
      category: "REFERRAL",
      amount,
      referenceType: "IncomeLedgerEntry",
      referenceId: incomeId,
      key: `demo:direct-wallet:${memberId}`,
      description: "Direct referral income credited.",
      createdAt: new Date(),
    });
  }

  const levelFixtures = [
    { memberId: "NP920001", level: 2, amount: 0.5 },
    { memberId: "NP920002", level: 2, amount: 0.875 },
    { memberId: "NP920003", level: 2, amount: 0.3125 },
    { memberId: "NP930001", level: 3, amount: 1.5 },
    { memberId: "NP940001", level: 4, amount: 0.4375 },
    { memberId: "NP950001", level: 5, amount: 0.5625 },
  ];
  for (const fixture of levelFixtures) {
    const investment = investments.get(fixture.memberId);
    const incomeId = await addIncome({
      userId: root.id,
      investmentId: investment.id,
      type: "LEVEL_INCOME",
      percent: 0.25,
      baseAmount: investment.amount,
      amount: fixture.amount,
      level: fixture.level,
      sourceUserId: investment.userId,
      key: `demo:level:${fixture.memberId}`,
      description: `Level ${fixture.level} commission.`,
      creditedAt: dateDaysAgo(fixture.level),
    });
    balance = await addWalletEntry({
      userId: root.id,
      balance,
      direction: "CREDIT",
      category: "LEVEL",
      amount: fixture.amount,
      referenceType: "IncomeLedgerEntry",
      referenceId: incomeId,
      key: `demo:level-wallet:${fixture.memberId}`,
      description: `Level ${fixture.level} income credited.`,
      createdAt: dateDaysAgo(fixture.level),
    });
  }

  for (const fixture of [
    { type: "RANK_REWARD", category: "RANK", amount: 50, key: "rank", description: "Community builder rank reward." },
    { type: "SALARY", category: "SALARY", amount: 25, key: "salary", description: "Monthly leadership income." },
  ]) {
    const incomeId = await addIncome({
      userId: root.id,
      investmentId: null,
      type: fixture.type,
      percent: null,
      baseAmount: null,
      amount: fixture.amount,
      level: null,
      sourceUserId: null,
      key: `demo:${fixture.key}`,
      description: fixture.description,
      creditedAt: dateDaysAgo(1),
    });
    balance = await addWalletEntry({
      userId: root.id,
      balance,
      direction: "CREDIT",
      category: fixture.category,
      amount: fixture.amount,
      referenceType: "IncomeLedgerEntry",
      referenceId: incomeId,
      key: `demo:${fixture.key}-wallet`,
      description: fixture.description,
      createdAt: dateDaysAgo(1),
    });
  }

  balance = await seedWithdrawals(root.id, balance);
  await database.query(
    `INSERT INTO "system_settings" ("key", "value", "description", "updatedAt")
     VALUES ('investment_configuration', $1::jsonb, 'Demo investment settings.', CURRENT_TIMESTAMP)
     ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP`,
    [JSON.stringify({
      minimumAmount: "10",
      monthlyRoiPercent: "8",
      durationMonths: 25,
      directCommissionPercent: "1",
      levelCommissionPercent: "0.25",
      maxLevelDepth: 5,
    })],
  );
  await database.query(
    `INSERT INTO "system_settings" ("key", "value", "description", "updatedAt")
     VALUES ('withdrawal_configuration', $1::jsonb, 'Demo withdrawal settings.', CURRENT_TIMESTAMP)
     ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP`,
    [JSON.stringify({ minimumAmount: "10", allowedDays: [1, 16] })],
  );
  await database.query(
    `INSERT INTO "system_settings" ("key", "value", "description", "updatedAt")
     VALUES ('demo_seed_v1', $1::jsonb, 'Marks the idempotent demo dataset.', CURRENT_TIMESTAMP)`,
    [JSON.stringify({ seededAt: now.toISOString(), finalWalletBalance: balance.toFixed(6) })],
  );
}

async function seedDeposits(userId) {
  const approved = await database.query(
    `INSERT INTO "deposit_requests" (
      "userId", "amount", "transactionHash", "status", "submittedAt",
      "createdAt", "updatedAt"
    ) VALUES ($1, 5000, $2, 'PENDING', $3, $3, $3)
    RETURNING "id"`,
    [userId, hash("a"), dateDaysAgo(66)],
  );
  await database.query(
    `INSERT INTO "deposit_requests" (
      "userId", "amount", "transactionHash", "status", "submittedAt", "createdAt", "updatedAt"
    ) VALUES ($1, 700, $2, 'PENDING', $3, $3, $3)`,
    [userId, hash("b"), dateDaysAgo(1)],
  );
  await database.query(
    `INSERT INTO "deposit_requests" (
      "userId", "amount", "transactionHash", "status", "reviewSource", "rejectionReason",
      "submittedAt", "reviewedAt", "createdAt", "updatedAt"
    ) VALUES ($1, 250, $2, 'REJECTED', 'IMPORT', 'Transaction could not be verified.', $3, $4, $3, $4)`,
    [userId, hash("c"), dateDaysAgo(12), dateDaysAgo(11)],
  );
  return approved.rows[0].id;
}

async function seedWithdrawals(userId, startingBalance) {
  let balance = startingBalance;
  const walletAddress = "0x2222222222222222222222222222222222222222";
  const fixtures = [
    { key: "paid", amount: 200, status: "PAID", daysAgo: 11, paymentHash: hash("d"), reason: null },
    { key: "rejected", amount: 75, status: "REJECTED", daysAgo: 6, paymentHash: null, reason: "Bank-side verification failed." },
    { key: "pending", amount: 120, status: "PENDING", daysAgo: 1, paymentHash: null, reason: null },
  ];

  for (const fixture of fixtures) {
    const requestId = randomUUID();
    const submittedAt = dateDaysAgo(fixture.daysAgo);
    const reviewedAt = fixture.status === "PENDING" ? null : dateDaysAgo(fixture.daysAgo - 1);
    const hold = await addWalletEntry({
      userId,
      balance,
      direction: "HOLD",
      category: "WITHDRAWAL",
      amount: fixture.amount,
      referenceType: "WithdrawalRequest",
      referenceId: requestId,
      key: `demo:withdrawal:${fixture.key}:hold`,
      description: `Funds held for ${fixture.key} withdrawal request.`,
      createdAt: submittedAt,
      returnId: true,
    });
    balance = hold.balance;

    let settlementId = null;
    let releaseId = null;
    if (fixture.status === "PAID") {
      const settlement = await addWalletEntry({
        userId,
        balance,
        direction: "SETTLE",
        category: "WITHDRAWAL",
        amount: fixture.amount,
        referenceType: "WithdrawalRequest",
        referenceId: requestId,
        key: `demo:withdrawal:${fixture.key}:settlement`,
        description: "Paid withdrawal settlement.",
        createdAt: reviewedAt,
        returnId: true,
      });
      settlementId = settlement.id;
      balance = settlement.balance;
    }
    if (fixture.status === "REJECTED") {
      const release = await addWalletEntry({
        userId,
        balance,
        direction: "RELEASE",
        category: "WITHDRAWAL",
        amount: fixture.amount,
        referenceType: "WithdrawalRequest",
        referenceId: requestId,
        key: `demo:withdrawal:${fixture.key}:release`,
        description: "Rejected withdrawal hold released.",
        createdAt: reviewedAt,
        returnId: true,
      });
      releaseId = release.id;
      balance = release.balance;
    }

    await database.query(
      `INSERT INTO "withdrawal_requests" (
        "id", "userId", "amount", "feeAmount", "netAmount", "walletAddress", "status",
        "reviewSource", "paymentHash", "rejectionReason", "holdLedgerEntryId",
        "settlementLedgerEntryId", "releaseLedgerEntryId", "submittedAt", "reviewedAt",
        "paidAt", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, 0, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12::timestamptz, $13::timestamptz, $14::timestamptz, $12::timestamptz,
        COALESCE($13::timestamptz, $12::timestamptz)
      )`,
      [
        requestId,
        userId,
        fixture.amount,
        walletAddress,
        fixture.status,
        fixture.status === "PENDING" ? null : "IMPORT",
        fixture.paymentHash,
        fixture.reason,
        hold.id,
        settlementId,
        releaseId,
        submittedAt,
        reviewedAt,
        fixture.status === "PAID" ? reviewedAt : null,
      ],
    );
  }
  return balance;
}

async function addIncome({
  userId,
  sourceUserId,
  investmentId,
  type,
  level,
  percent,
  baseAmount,
  amount,
  key,
  description,
  creditedAt,
}) {
  const result = await database.query(
    `INSERT INTO "income_ledger_entries" (
      "userId", "sourceUserId", "investmentId", "type", "level", "percent",
      "baseAmount", "amount", "idempotencyKey", "description", "creditedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING "id"`,
    [
      userId,
      sourceUserId,
      investmentId,
      type,
      level,
      percent,
      baseAmount,
      amount,
      key,
      description,
      creditedAt,
    ],
  );
  return result.rows[0].id;
}

async function addWalletEntry({
  userId,
  balance,
  direction,
  category,
  amount,
  referenceType,
  referenceId,
  key,
  description,
  createdAt,
  returnId = false,
}) {
  const increasesBalance = direction === "CREDIT" || direction === "RELEASE";
  const decreasesBalance = direction === "DEBIT" || direction === "DEDUCTION" || direction === "HOLD";
  const nextBalance = increasesBalance ? balance + amount : decreasesBalance ? balance - amount : balance;
  if (nextBalance < 0) throw new Error(`Demo ledger balance became negative for ${key}.`);

  const result = await database.query(
    `INSERT INTO "wallet_ledger_entries" (
      "userId", "direction", "category", "amount", "balanceAfter", "referenceType",
      "referenceId", "idempotencyKey", "description", "createdAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING "id"`,
    [
      userId,
      direction,
      category,
      amount,
      nextBalance.toFixed(6),
      referenceType,
      referenceId,
      key,
      description,
      createdAt,
    ],
  );
  return returnId ? { id: result.rows[0].id, balance: nextBalance } : nextBalance;
}

async function addRoiCredit({ investmentId, incomeId, amount, creditDate }) {
  const date = creditDate.toISOString().slice(0, 10);
  const run = await database.query(
    `INSERT INTO "roi_runs" (
      "runDate", "status", "processed", "credited", "completedAt"
    ) VALUES ($1, 'COMPLETED', 1, 1, $2)
    ON CONFLICT ("runDate") DO UPDATE SET
      "processed" = "roi_runs"."processed" + 1,
      "credited" = "roi_runs"."credited" + 1
    RETURNING "id"`,
    [date, creditDate],
  );
  await database.query(
    `INSERT INTO "roi_credits" (
      "runId", "investmentId", "incomeLedgerEntryId", "amount", "creditDate", "createdAt"
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [run.rows[0].id, investmentId, incomeId, amount, date, creditDate],
  );
}

async function getLatestBalance(userId) {
  const result = await database.query(
    `SELECT "balanceAfter"
     FROM "wallet_ledger_entries"
     WHERE "userId" = $1
     ORDER BY "sequence" DESC
     LIMIT 1`,
    [userId],
  );
  return Number(result.rows[0]?.balanceAfter ?? 0);
}

async function printDemoSummary() {
  const result = await database.query(
    `WITH root AS (
       SELECT "id" FROM "user_profiles" WHERE "memberId" = $1
     ), team AS (
       SELECT "descendantId"
       FROM "referral_closure"
       WHERE "ancestorId" = (SELECT "id" FROM root)
     )
     SELECT
       (SELECT COUNT(*)::int FROM team WHERE "descendantId" <> (SELECT "id" FROM root)) AS "downlineMembers",
       (SELECT COUNT(*)::int FROM "investments" WHERE "userId" IN (SELECT "descendantId" FROM team)) AS "investments",
       (SELECT COUNT(*)::int FROM "income_ledger_entries" WHERE "userId" = (SELECT "id" FROM root)) AS "incomeEntries",
       (SELECT COUNT(*)::int FROM "deposit_requests" WHERE "userId" = (SELECT "id" FROM root)) AS "deposits",
       (SELECT COUNT(*)::int FROM "withdrawal_requests" WHERE "userId" = (SELECT "id" FROM root)) AS "withdrawals",
       (SELECT COUNT(*)::int FROM "roi_credits" WHERE "investmentId" IN (
         SELECT "id" FROM "investments" WHERE "userId" = (SELECT "id" FROM root)
       )) AS "roiCredits",
       (SELECT "balanceAfter"::text
        FROM "wallet_ledger_entries"
        WHERE "userId" = (SELECT "id" FROM root)
        ORDER BY "sequence" DESC
        LIMIT 1) AS "walletBalance"`,
    [input.TEST_SPONSOR_MEMBER_ID],
  );
  console.log(`Demo summary: ${JSON.stringify(result.rows[0])}`);
}

function dateDaysAgo(daysAgo) {
  return new Date(now.getTime() - daysAgo * dayMs);
}

function hash(character) {
  return `0x${character.repeat(64)}`;
}
