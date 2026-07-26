import "dotenv/config";

import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { z } from "zod";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

const inputSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  DATABASE_URL: z.string().min(20),
  DIRECT_URL: z.string().min(20).optional(),
  TEST_SPONSOR_EMAIL: z.email().transform((value) => value.toLowerCase()),
  TEST_SPONSOR_PASSWORD: z
    .string()
    .min(8)
    .max(64)
    .regex(/[A-Za-z]/)
    .regex(/\d/),
  TEST_SPONSOR_MPIN: z.string().regex(/^\d{4,6}$/),
  TEST_SPONSOR_NAME: z.string().min(2).max(120).default("Test Sponsor"),
  TEST_SPONSOR_MEMBER_ID: z.string().regex(/^NP\d{6,10}$/).default("NP900001"),
  TEST_SPONSOR_MOBILE: z.string().regex(/^\+?[1-9]\d{7,14}$/).default("+919000000001"),
  TEST_SPONSOR_COUNTRY: z.string().length(2).default("IN"),
  TEST_SPONSOR_BALANCE: z.coerce.number().positive().max(1_000_000).default(1000),
});

const parsed = inputSchema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => String(issue.path[0])).join(", ");
  throw new Error(`Missing or invalid test sponsor environment fields: ${fields}`);
}

const input = parsed.data;
const databaseUrl = input.DIRECT_URL ?? input.DATABASE_URL;
const database = new Client({ connectionString: databaseUrl });
const supabase = createClient(input.NEXT_PUBLIC_SUPABASE_URL, input.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let createdAuthUserId = null;

try {
  await database.connect();
  const existing = await database.query(
    'SELECT "memberId" FROM "user_profiles" WHERE "email" = $1 OR "memberId" = $2 LIMIT 1',
    [input.TEST_SPONSOR_EMAIL, input.TEST_SPONSOR_MEMBER_ID],
  );
  if (existing.rowCount) {
    throw new Error("The test sponsor email or member ID already exists.");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.TEST_SPONSOR_EMAIL,
    password: input.TEST_SPONSOR_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: input.TEST_SPONSOR_NAME },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Supabase test user creation failed.");
  }
  createdAuthUserId = data.user.id;

  const securityPinHash = await hashSecurityPin(input.TEST_SPONSOR_MPIN);
  await database.query("BEGIN");
  const profileResult = await database.query(
    `INSERT INTO "user_profiles" (
      "authUserId", "memberId", "fullName", "email", "mobile", "countryCode",
      "securityPinHash", "status", "isReferralActive", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', true, CURRENT_TIMESTAMP)
    RETURNING "id"`,
    [
      createdAuthUserId,
      input.TEST_SPONSOR_MEMBER_ID,
      input.TEST_SPONSOR_NAME,
      input.TEST_SPONSOR_EMAIL,
      input.TEST_SPONSOR_MOBILE,
      input.TEST_SPONSOR_COUNTRY.toUpperCase(),
      securityPinHash,
    ],
  );
  const profileId = profileResult.rows[0].id;

  await database.query(
    'INSERT INTO "referral_links" ("userId", "code", "isActive", "updatedAt") VALUES ($1, $2, true, CURRENT_TIMESTAMP)',
    [profileId, input.TEST_SPONSOR_MEMBER_ID],
  );
  await database.query(
    'INSERT INTO "referral_closure" ("ancestorId", "descendantId", "depth") VALUES ($1, $1, 0)',
    [profileId],
  );
  await database.query(
    `INSERT INTO "wallet_ledger_entries" (
      "userId", "direction", "category", "amount", "balanceAfter",
      "referenceType", "idempotencyKey", "description"
    ) VALUES ($1, 'CREDIT', 'ADMIN_ADJUSTMENT', $2, $2, 'TestSeed', $3, 'Local test balance.')`,
    [profileId, input.TEST_SPONSOR_BALANCE, `test-seed:initial-balance:${profileId}`],
  );
  await database.query(
    `INSERT INTO "system_settings" ("key", "value", "description", "updatedAt")
     VALUES ('deposit_configuration', $1::jsonb, 'Local test deposit configuration.', CURRENT_TIMESTAMP)
     ON CONFLICT ("key") DO NOTHING`,
    [JSON.stringify({
      walletAddress: "0x1111111111111111111111111111111111111111",
      network: "BSC (BEP-20)",
      minimumAmount: "10",
    })],
  );
  await database.query("COMMIT");

  console.log(`Test sponsor created: ${input.TEST_SPONSOR_MEMBER_ID} (${input.TEST_SPONSOR_EMAIL})`);
  console.log(`Test wallet balance: ${input.TEST_SPONSOR_BALANCE} USDT`);
} catch (error) {
  await database.query("ROLLBACK").catch(() => undefined);
  if (createdAuthUserId) {
    await supabase.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
  }
  throw error;
} finally {
  await database.end().catch(() => undefined);
}

async function hashSecurityPin(pin) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(pin, salt, KEY_LENGTH);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
