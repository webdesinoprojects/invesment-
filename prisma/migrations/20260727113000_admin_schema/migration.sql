-- Admin workflow enums are intentionally separate from user/request enums so
-- impossible lifecycle states cannot be assigned to the wrong request type.
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED', 'FAILED');
CREATE TYPE "ActionSource" AS ENUM ('ADMIN', 'SYSTEM', 'IMPORT');
CREATE TYPE "RoiRunTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'RETRY');
CREATE TYPE "AuditActorType" AS ENUM ('ADMIN', 'SYSTEM');
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILED');

ALTER TYPE "InvestmentStatus" RENAME TO "InvestmentStatus_old";
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "investments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "investments"
  ALTER COLUMN "status" TYPE "InvestmentStatus"
  USING ("status"::text::"InvestmentStatus");
ALTER TABLE "investments" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "InvestmentStatus_old";

ALTER TYPE "LedgerDirection" RENAME TO "LedgerDirection_old";
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT', 'DEDUCTION', 'HOLD', 'RELEASE', 'SETTLE');
ALTER TABLE "wallet_ledger_entries"
  ALTER COLUMN "direction" TYPE "LedgerDirection"
  USING ("direction"::text::"LedgerDirection");
DROP TYPE "LedgerDirection_old";

-- Admin identity lifecycle and attribution.
ALTER TABLE "admin_profiles"
  ADD COLUMN "email" VARCHAR(254),
  ADD COLUMN "lastLoginAt" TIMESTAMPTZ(3),
  ADD COLUMN "deactivatedAt" TIMESTAMPTZ(3),
  ADD COLUMN "deactivationReason" VARCHAR(500),
  ADD COLUMN "createdByAdminId" UUID,
  ADD COLUMN "deactivatedByAdminId" UUID;

ALTER TABLE "user_profiles"
  ADD COLUMN "blockedAt" TIMESTAMPTZ(3),
  ADD COLUMN "blockedByAdminId" UUID,
  ADD COLUMN "blockReason" VARCHAR(500);

UPDATE "user_profiles"
SET "blockedAt" = COALESCE("blockedAt", "updatedAt"),
    "blockReason" = COALESCE("blockReason", 'Imported blocked account.')
WHERE "status" = 'BLOCKED';

ALTER TABLE "investments"
  ADD COLUMN "statusChangedById" UUID,
  ADD COLUMN "statusReason" VARCHAR(500),
  ADD COLUMN "pausedAt" TIMESTAMPTZ(3);

-- Wallet metadata and explicit reversal linkage must exist before request
-- records are linked to their financial effects.
ALTER TABLE "wallet_ledger_entries"
  ADD COLUMN "reversalOfEntryId" UUID,
  ADD COLUMN "reversalReason" VARCHAR(500),
  ADD COLUMN "metadata" JSONB;

ALTER TABLE "income_ledger_entries"
  ADD COLUMN "reversedByAdminId" UUID,
  ADD COLUMN "reversalWalletEntryId" UUID,
  ADD COLUMN "reversalSource" "ActionSource",
  ADD COLUMN "reversalReason" VARCHAR(500);

-- Deposit review lifecycle and its exact wallet credit.
ALTER TABLE "deposit_requests"
  ADD COLUMN "approvedAmount" DECIMAL(20,6),
  ADD COLUMN "senderWalletAddress" VARCHAR(64),
  ADD COLUMN "reviewSource" "ActionSource",
  ADD COLUMN "creditLedgerEntryId" UUID,
  ADD COLUMN "reviewNote" VARCHAR(500),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "deposit_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "deposit_requests"
  ALTER COLUMN "status" TYPE "DepositStatus"
  USING ("status"::text::"DepositStatus");
ALTER TABLE "deposit_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "deposit_requests"
SET "approvedAmount" = "amount",
    "reviewSource" = 'IMPORT'
WHERE "status" = 'APPROVED';

UPDATE "deposit_requests"
SET "reviewSource" = 'IMPORT'
WHERE "status" = 'REJECTED';

UPDATE "deposit_requests" AS deposit
SET "creditLedgerEntryId" = (
  SELECT ledger."id"
  FROM "wallet_ledger_entries" AS ledger
  WHERE ledger."referenceType" = 'DepositRequest'
    AND ledger."referenceId" = deposit."id"
    AND ledger."direction" = 'CREDIT'
    AND ledger."category" = 'DEPOSIT'
  ORDER BY ledger."sequence" ASC
  LIMIT 1
)
WHERE deposit."status" = 'APPROVED';

-- Withdrawal requests now distinguish review, processing, payout, rejection,
-- cancellation, and failure. Holds, settlements, and releases are explicit.
ALTER TABLE "withdrawal_requests"
  ADD COLUMN "feeAmount" DECIMAL(20,6) NOT NULL DEFAULT 0,
  ADD COLUMN "netAmount" DECIMAL(20,6),
  ADD COLUMN "network" VARCHAR(16) NOT NULL DEFAULT 'BEP20',
  ADD COLUMN "reviewSource" "ActionSource",
  ADD COLUMN "processedById" UUID,
  ADD COLUMN "paidById" UUID,
  ADD COLUMN "reviewNote" VARCHAR(500),
  ADD COLUMN "failureReason" VARCHAR(500),
  ADD COLUMN "settlementLedgerEntryId" UUID,
  ADD COLUMN "releaseLedgerEntryId" UUID,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processingStartedAt" TIMESTAMPTZ(3),
  ADD COLUMN "paidAt" TIMESTAMPTZ(3),
  ADD COLUMN "cancelledAt" TIMESTAMPTZ(3),
  ADD COLUMN "failedAt" TIMESTAMPTZ(3);

ALTER TABLE "withdrawal_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "withdrawal_requests"
  ALTER COLUMN "status" TYPE "WithdrawalStatus"
  USING (
    CASE "status"::text
      WHEN 'APPROVED' THEN 'PAID'
      ELSE "status"::text
    END::"WithdrawalStatus"
  );
ALTER TABLE "withdrawal_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "withdrawal_requests"
SET "netAmount" = "amount" - "feeAmount";

UPDATE "withdrawal_requests"
SET "reviewSource" = 'IMPORT',
    "paidAt" = COALESCE("reviewedAt", "updatedAt")
WHERE "status" = 'PAID';

UPDATE "withdrawal_requests"
SET "reviewSource" = 'IMPORT'
WHERE "status" = 'REJECTED';

UPDATE "withdrawal_requests" AS request
SET "releaseLedgerEntryId" = (
  SELECT ledger."id"
  FROM "wallet_ledger_entries" AS ledger
  WHERE ledger."referenceType" = 'WithdrawalRequest'
    AND ledger."referenceId" = request."id"
    AND ledger."direction" = 'RELEASE'
    AND ledger."category" = 'WITHDRAWAL'
  ORDER BY ledger."sequence" ASC
  LIMIT 1
)
WHERE request."status" IN ('REJECTED', 'CANCELLED', 'FAILED');

INSERT INTO "wallet_ledger_entries" (
  "id", "userId", "direction", "category", "amount", "balanceAfter",
  "referenceType", "referenceId", "idempotencyKey", "description", "metadata", "createdAt"
)
SELECT
  gen_random_uuid(), request."userId", 'SETTLE', 'WITHDRAWAL', request."netAmount",
  COALESCE(balance."balanceAfter", 0), 'WithdrawalRequest', request."id",
  'migration:withdrawal-settlement:' || request."id"::text,
  'Legacy paid withdrawal settlement.',
  jsonb_build_object('migration', '20260727113000_admin_schema'),
  COALESCE(request."paidAt", now())
FROM "withdrawal_requests" AS request
LEFT JOIN LATERAL (
  SELECT ledger."balanceAfter"
  FROM "wallet_ledger_entries" AS ledger
  WHERE ledger."userId" = request."userId"
  ORDER BY ledger."sequence" DESC
  LIMIT 1
) AS balance ON true
WHERE request."status" = 'PAID'
  AND request."settlementLedgerEntryId" IS NULL;

UPDATE "withdrawal_requests" AS request
SET "settlementLedgerEntryId" = settlement."id"
FROM "wallet_ledger_entries" AS settlement
WHERE settlement."referenceType" = 'WithdrawalRequest'
  AND settlement."referenceId" = request."id"
  AND settlement."direction" = 'SETTLE'
  AND settlement."category" = 'WITHDRAWAL'
  AND request."status" = 'PAID';

-- ROI execution attribution.
ALTER TABLE "roi_runs"
  ADD COLUMN "trigger" "RoiRunTrigger" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "triggeredByAdminId" UUID;

-- Versioned settings retain who changed configuration and the exact history.
ALTER TABLE "system_settings"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updatedByAdminId" UUID,
  ADD COLUMN "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "system_setting_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "settingKey" VARCHAR(100) NOT NULL,
  "version" INTEGER NOT NULL,
  "previousValue" JSONB,
  "nextValue" JSONB NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "changedByAdminId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_setting_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_user_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "authorAdminId" UUID NOT NULL,
  "note" VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "admin_user_notes_pkey" PRIMARY KEY ("id")
);

-- Audit records can now identify settings and other non-UUID entities, record
-- denied/failed attempts, and correlate multi-step financial operations.
ALTER TABLE "audit_logs"
  ADD COLUMN "actorType" "AuditActorType" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN "errorCode" VARCHAR(100),
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "correlationId" VARCHAR(100);

UPDATE "audit_logs"
SET "actorType" = 'SYSTEM'
WHERE "actorAdminId" IS NULL;

ALTER TABLE "audit_logs"
  ALTER COLUMN "entityId" TYPE VARCHAR(160)
  USING ("entityId"::text);

-- Unique indexes.
CREATE UNIQUE INDEX "admin_profiles_email_key" ON "admin_profiles"("email");
CREATE UNIQUE INDEX "deposit_requests_creditLedgerEntryId_key" ON "deposit_requests"("creditLedgerEntryId");
CREATE UNIQUE INDEX "withdrawal_requests_paymentHash_key" ON "withdrawal_requests"("paymentHash");
CREATE UNIQUE INDEX "withdrawal_requests_settlementLedgerEntryId_key" ON "withdrawal_requests"("settlementLedgerEntryId");
CREATE UNIQUE INDEX "withdrawal_requests_releaseLedgerEntryId_key" ON "withdrawal_requests"("releaseLedgerEntryId");
CREATE UNIQUE INDEX "wallet_ledger_entries_reversalOfEntryId_key" ON "wallet_ledger_entries"("reversalOfEntryId");
CREATE UNIQUE INDEX "income_ledger_entries_reversalWalletEntryId_key" ON "income_ledger_entries"("reversalWalletEntryId");
CREATE UNIQUE INDEX "system_setting_revisions_settingKey_version_key" ON "system_setting_revisions"("settingKey", "version");

-- Admin list and investigation indexes.
CREATE INDEX "admin_profiles_role_isActive_idx" ON "admin_profiles"("role", "isActive");
CREATE INDEX "admin_profiles_createdByAdminId_idx" ON "admin_profiles"("createdByAdminId");
CREATE INDEX "admin_profiles_deactivatedByAdminId_idx" ON "admin_profiles"("deactivatedByAdminId");
CREATE INDEX "user_profiles_blockedByAdminId_blockedAt_idx" ON "user_profiles"("blockedByAdminId", "blockedAt");
CREATE INDEX "investments_statusChangedById_updatedAt_idx" ON "investments"("statusChangedById", "updatedAt");
CREATE INDEX "deposit_requests_reviewedById_reviewedAt_idx" ON "deposit_requests"("reviewedById", "reviewedAt");
CREATE INDEX "deposit_requests_reviewedAt_idx" ON "deposit_requests"("reviewedAt");
CREATE INDEX "withdrawal_requests_reviewedById_reviewedAt_idx" ON "withdrawal_requests"("reviewedById", "reviewedAt");
CREATE INDEX "withdrawal_requests_processedById_processingStartedAt_idx" ON "withdrawal_requests"("processedById", "processingStartedAt");
CREATE INDEX "withdrawal_requests_paidById_paidAt_idx" ON "withdrawal_requests"("paidById", "paidAt");
CREATE INDEX "wallet_ledger_entries_createdByAdminId_createdAt_idx" ON "wallet_ledger_entries"("createdByAdminId", "createdAt");
CREATE INDEX "income_ledger_entries_reversedByAdminId_reversedAt_idx" ON "income_ledger_entries"("reversedByAdminId", "reversedAt");
CREATE INDEX "roi_runs_status_startedAt_idx" ON "roi_runs"("status", "startedAt");
CREATE INDEX "roi_runs_triggeredByAdminId_startedAt_idx" ON "roi_runs"("triggeredByAdminId", "startedAt");
CREATE INDEX "system_settings_updatedByAdminId_updatedAt_idx" ON "system_settings"("updatedByAdminId", "updatedAt");
CREATE INDEX "system_setting_revisions_changedByAdminId_createdAt_idx" ON "system_setting_revisions"("changedByAdminId", "createdAt");
CREATE INDEX "admin_user_notes_userId_createdAt_idx" ON "admin_user_notes"("userId", "createdAt");
CREATE INDEX "admin_user_notes_authorAdminId_createdAt_idx" ON "admin_user_notes"("authorAdminId", "createdAt");
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");
CREATE INDEX "audit_logs_correlationId_createdAt_idx" ON "audit_logs"("correlationId", "createdAt");
CREATE INDEX "audit_logs_outcome_createdAt_idx" ON "audit_logs"("outcome", "createdAt");

-- Explicit foreign keys for every admin actor and financial effect.
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_createdByAdminId_fkey"
  FOREIGN KEY ("createdByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_deactivatedByAdminId_fkey"
  FOREIGN KEY ("deactivatedByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_blockedByAdminId_fkey"
  FOREIGN KEY ("blockedByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investments" ADD CONSTRAINT "investments_statusChangedById_fkey"
  FOREIGN KEY ("statusChangedById") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_creditLedgerEntryId_fkey"
  FOREIGN KEY ("creditLedgerEntryId") REFERENCES "wallet_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_processedById_fkey"
  FOREIGN KEY ("processedById") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_holdLedgerEntryId_fkey"
  FOREIGN KEY ("holdLedgerEntryId") REFERENCES "wallet_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_settlementLedgerEntryId_fkey"
  FOREIGN KEY ("settlementLedgerEntryId") REFERENCES "wallet_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_releaseLedgerEntryId_fkey"
  FOREIGN KEY ("releaseLedgerEntryId") REFERENCES "wallet_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_reversalOfEntryId_fkey"
  FOREIGN KEY ("reversalOfEntryId") REFERENCES "wallet_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "income_ledger_entries" ADD CONSTRAINT "income_ledger_entries_reversedByAdminId_fkey"
  FOREIGN KEY ("reversedByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "income_ledger_entries" ADD CONSTRAINT "income_ledger_entries_reversalWalletEntryId_fkey"
  FOREIGN KEY ("reversalWalletEntryId") REFERENCES "wallet_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roi_runs" ADD CONSTRAINT "roi_runs_triggeredByAdminId_fkey"
  FOREIGN KEY ("triggeredByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedByAdminId_fkey"
  FOREIGN KEY ("updatedByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "system_setting_revisions" ADD CONSTRAINT "system_setting_revisions_settingKey_fkey"
  FOREIGN KEY ("settingKey") REFERENCES "system_settings"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "system_setting_revisions" ADD CONSTRAINT "system_setting_revisions_changedByAdminId_fkey"
  FOREIGN KEY ("changedByAdminId") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_user_notes" ADD CONSTRAINT "admin_user_notes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_user_notes" ADD CONSTRAINT "admin_user_notes_authorAdminId_fkey"
  FOREIGN KEY ("authorAdminId") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorAdminId_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorAdminId_fkey"
  FOREIGN KEY ("actorAdminId") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database-level financial and lifecycle invariants. Services still perform
-- richer validation, but invalid money/state cannot be persisted accidentally.
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_deactivation_check" CHECK (
  ("isActive" AND "deactivatedAt" IS NULL) OR
  (NOT "isActive" AND "deactivatedAt" IS NOT NULL AND "deactivationReason" IS NOT NULL)
);
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_block_check" CHECK (
  ("status" = 'BLOCKED' AND "blockedAt" IS NOT NULL AND "blockReason" IS NOT NULL) OR
  ("status" <> 'BLOCKED' AND "blockedAt" IS NULL)
);
ALTER TABLE "referral_closure" ADD CONSTRAINT "referral_closure_depth_check" CHECK (
  "depth" >= 0 AND
  (("depth" = 0 AND "ancestorId" = "descendantId") OR
   ("depth" > 0 AND "ancestorId" <> "descendantId"))
);
ALTER TABLE "investments" ADD CONSTRAINT "investments_amounts_check" CHECK (
  "amount" > 0 AND "monthlyRoiPercent" > 0 AND "monthlyRoiPercent" <= 100 AND
  "durationMonths" > 0 AND "payoutCapAmount" > 0 AND
  "paidOutAmount" >= 0 AND "paidOutAmount" <= "payoutCapAmount"
);
ALTER TABLE "investments" ADD CONSTRAINT "investments_status_check" CHECK (
  ("status" = 'ACTIVE') OR
  ("status" = 'PAUSED' AND "pausedAt" IS NOT NULL AND "statusReason" IS NOT NULL) OR
  ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL) OR
  ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "statusReason" IS NOT NULL)
);
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_amount_check" CHECK (
  "amount" > 0 AND ("approvedAmount" IS NULL OR "approvedAmount" > 0)
);
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_status_check" CHECK (
  ("status" = 'PENDING' AND "reviewedAt" IS NULL AND "reviewSource" IS NULL AND
    "approvedAmount" IS NULL AND "creditLedgerEntryId" IS NULL AND "rejectionReason" IS NULL) OR
  ("status" = 'APPROVED' AND "reviewedAt" IS NOT NULL AND "reviewSource" IS NOT NULL AND
    "approvedAmount" IS NOT NULL AND "creditLedgerEntryId" IS NOT NULL AND "rejectionReason" IS NULL) OR
  ("status" = 'REJECTED' AND "reviewedAt" IS NOT NULL AND "reviewSource" IS NOT NULL AND
    "approvedAmount" IS NULL AND "creditLedgerEntryId" IS NULL AND "rejectionReason" IS NOT NULL)
);
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_amount_check" CHECK (
  "amount" > 0 AND "feeAmount" >= 0 AND "feeAmount" < "amount" AND
  ("netAmount" IS NULL OR ("netAmount" > 0 AND "netAmount" = "amount" - "feeAmount"))
);
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_status_check" CHECK (
  "holdLedgerEntryId" IS NOT NULL AND (
    ("status" = 'PENDING' AND "reviewedAt" IS NULL AND "reviewSource" IS NULL AND
      "paymentHash" IS NULL AND "settlementLedgerEntryId" IS NULL AND "releaseLedgerEntryId" IS NULL) OR
    ("status" = 'PROCESSING' AND "reviewedAt" IS NOT NULL AND "reviewSource" IS NOT NULL AND
      "processingStartedAt" IS NOT NULL AND "settlementLedgerEntryId" IS NULL AND "releaseLedgerEntryId" IS NULL) OR
    ("status" = 'PAID' AND "reviewedAt" IS NOT NULL AND "reviewSource" IS NOT NULL AND
      "paidAt" IS NOT NULL AND "paymentHash" IS NOT NULL AND "netAmount" IS NOT NULL AND
      "settlementLedgerEntryId" IS NOT NULL AND "releaseLedgerEntryId" IS NULL) OR
    ("status" = 'REJECTED' AND "reviewedAt" IS NOT NULL AND "reviewSource" IS NOT NULL AND
      "rejectionReason" IS NOT NULL AND "releaseLedgerEntryId" IS NOT NULL AND "settlementLedgerEntryId" IS NULL) OR
    ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND
      "releaseLedgerEntryId" IS NOT NULL AND "settlementLedgerEntryId" IS NULL) OR
    ("status" = 'FAILED' AND "failedAt" IS NOT NULL AND "failureReason" IS NOT NULL AND
      "releaseLedgerEntryId" IS NOT NULL AND "settlementLedgerEntryId" IS NULL)
  )
);
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_amount_check"
  CHECK ("amount" > 0 AND "balanceAfter" >= 0);
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_reversal_check" CHECK (
  ("reversalOfEntryId" IS NULL AND "reversalReason" IS NULL) OR
  ("reversalOfEntryId" IS NOT NULL AND "reversalOfEntryId" <> "id" AND "reversalReason" IS NOT NULL)
);
ALTER TABLE "income_ledger_entries" ADD CONSTRAINT "income_ledger_entries_amount_check" CHECK (
  "amount" > 0 AND ("baseAmount" IS NULL OR "baseAmount" > 0) AND
  ("percent" IS NULL OR ("percent" >= 0 AND "percent" <= 100)) AND
  ("level" IS NULL OR "level" >= 1)
);
ALTER TABLE "income_ledger_entries" ADD CONSTRAINT "income_ledger_entries_reversal_check" CHECK (
  ("status" = 'CREDITED' AND "reversedAt" IS NULL AND "reversalSource" IS NULL AND
    "reversalWalletEntryId" IS NULL AND "reversalReason" IS NULL) OR
  ("status" = 'REVERSED' AND "reversedAt" IS NOT NULL AND "reversalSource" IS NOT NULL AND
    "reversalWalletEntryId" IS NOT NULL AND "reversalReason" IS NOT NULL)
);
ALTER TABLE "roi_runs" ADD CONSTRAINT "roi_runs_counts_check"
  CHECK ("processed" >= 0 AND "credited" >= 0 AND "failed" >= 0 AND "credited" + "failed" <= "processed");
ALTER TABLE "roi_runs" ADD CONSTRAINT "roi_runs_trigger_check" CHECK (
  ("trigger" = 'MANUAL' AND "triggeredByAdminId" IS NOT NULL) OR
  ("trigger" <> 'MANUAL')
);
ALTER TABLE "roi_credits" ADD CONSTRAINT "roi_credits_amount_check" CHECK ("amount" > 0);
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_version_check" CHECK ("version" > 0);
ALTER TABLE "system_setting_revisions" ADD CONSTRAINT "system_setting_revisions_version_check" CHECK ("version" > 0);
ALTER TABLE "system_setting_revisions" ADD CONSTRAINT "system_setting_revisions_reason_check" CHECK (length(btrim("reason")) > 0);
ALTER TABLE "admin_user_notes" ADD CONSTRAINT "admin_user_notes_note_check" CHECK (length(btrim("note")) > 0);
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_check" CHECK (
  ("actorType" = 'ADMIN' AND "actorAdminId" IS NOT NULL) OR
  ("actorType" = 'SYSTEM' AND "actorAdminId" IS NULL)
);

DROP TYPE "RequestStatus";

-- New admin-only tables follow the same server-only access policy as the rest
-- of the application schema.
ALTER TABLE "system_setting_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_user_notes" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  app_role TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', 'system_setting_revisions', app_role);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', 'admin_user_notes', app_role);
    END IF;
  END LOOP;
END $$;
