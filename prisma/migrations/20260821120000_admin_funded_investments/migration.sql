ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "IncomeType" ADD VALUE IF NOT EXISTS 'DIRECT_REFERRAL_BONUS';
ALTER TYPE "IncomeType" ADD VALUE IF NOT EXISTS 'MONTHLY_DIRECT';
ALTER TYPE "IncomeType" ADD VALUE IF NOT EXISTS 'MONTHLY_LEVEL';

ALTER TABLE "withdrawal_requests"
  ALTER COLUMN "network" SET DEFAULT 'MANUAL';

CREATE TYPE "CommissionScheduleStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PlatformRevenueCategory" AS ENUM ('WITHDRAWAL_FEE');

ALTER TABLE "investments" ADD COLUMN "activationKey" VARCHAR(160);
CREATE UNIQUE INDEX "investments_activationKey_key" ON "investments"("activationKey");

ALTER TABLE "income_ledger_entries" ADD COLUMN "commissionScheduleId" UUID;

CREATE TABLE "referral_commission_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "beneficiaryUserId" UUID NOT NULL,
  "sourceUserId" UUID NOT NULL,
  "investmentId" UUID NOT NULL,
  "type" "IncomeType" NOT NULL,
  "percent" DECIMAL(7,4) NOT NULL,
  "baseAmount" DECIMAL(20,6) NOT NULL,
  "paidPeriods" INTEGER NOT NULL DEFAULT 0,
  "maxPeriods" INTEGER NOT NULL DEFAULT 25,
  "nextDueAt" TIMESTAMPTZ(3),
  "status" "CommissionScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "referral_commission_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_commission_schedules_beneficiary_investment_type_key"
  ON "referral_commission_schedules"("beneficiaryUserId", "investmentId", "type");
CREATE INDEX "referral_commission_schedules_status_nextDueAt_idx"
  ON "referral_commission_schedules"("status", "nextDueAt");
CREATE INDEX "referral_commission_schedules_sourceUserId_status_idx"
  ON "referral_commission_schedules"("sourceUserId", "status");
CREATE INDEX "income_ledger_entries_commissionScheduleId_creditedAt_idx"
  ON "income_ledger_entries"("commissionScheduleId", "creditedAt");

ALTER TABLE "referral_commission_schedules"
  ADD CONSTRAINT "referral_commission_schedules_beneficiaryUserId_fkey"
  FOREIGN KEY ("beneficiaryUserId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_commission_schedules"
  ADD CONSTRAINT "referral_commission_schedules_sourceUserId_fkey"
  FOREIGN KEY ("sourceUserId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_commission_schedules"
  ADD CONSTRAINT "referral_commission_schedules_investmentId_fkey"
  FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "income_ledger_entries"
  ADD CONSTRAINT "income_ledger_entries_commissionScheduleId_fkey"
  FOREIGN KEY ("commissionScheduleId") REFERENCES "referral_commission_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "referral_commission_schedules"
  ADD CONSTRAINT "referral_commission_schedules_values_check" CHECK (
    "type" IN ('MONTHLY_DIRECT', 'MONTHLY_LEVEL') AND
    "percent" > 0 AND "percent" <= 100 AND "baseAmount" > 0 AND
    "paidPeriods" >= 0 AND "maxPeriods" > 0 AND "paidPeriods" <= "maxPeriods" AND
    (("status" = 'ACTIVE' AND "nextDueAt" IS NOT NULL AND "completedAt" IS NULL) OR
     ("status" <> 'ACTIVE' AND "nextDueAt" IS NULL AND "completedAt" IS NOT NULL))
  );

CREATE TABLE "platform_revenue_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category" "PlatformRevenueCategory" NOT NULL,
  "sourceUserId" UUID NOT NULL,
  "withdrawalRequestId" UUID NOT NULL,
  "amount" DECIMAL(20,6) NOT NULL,
  "currency" VARCHAR(8) NOT NULL DEFAULT 'USDT',
  "description" VARCHAR(500) NOT NULL,
  "recordedByAdminId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_revenue_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_revenue_entries_withdrawalRequestId_key"
  ON "platform_revenue_entries"("withdrawalRequestId");
CREATE INDEX "platform_revenue_entries_category_createdAt_idx"
  ON "platform_revenue_entries"("category", "createdAt");
CREATE INDEX "platform_revenue_entries_sourceUserId_createdAt_idx"
  ON "platform_revenue_entries"("sourceUserId", "createdAt");

ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_sourceUserId_fkey"
  FOREIGN KEY ("sourceUserId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_withdrawalRequestId_fkey"
  FOREIGN KEY ("withdrawalRequestId") REFERENCES "withdrawal_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_recordedByAdminId_fkey"
  FOREIGN KEY ("recordedByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "platform_revenue_entries"
  ADD CONSTRAINT "platform_revenue_entries_amount_check" CHECK ("amount" > 0);

UPDATE "referral_links" SET "isActive" = true WHERE "isActive" = false;
UPDATE "user_profiles" SET "isReferralActive" = true WHERE "isReferralActive" = false;

UPDATE "system_settings"
SET "value" = (
  "value" - 'directCommissionPercent' - 'levelCommissionPercent' - 'maxLevelDepth'
) || jsonb_build_object(
  'directBonusPercent', '5',
  'directMonthlyPercent', COALESCE("value"->'directCommissionPercent', '"1"'::jsonb),
  'levelMonthlyPercent', COALESCE("value"->'levelCommissionPercent', '"0.25"'::jsonb),
  'directQualificationCount', 5,
  'branchQualificationCount', 5
)
WHERE "key" = 'investment_configuration';

UPDATE "system_settings"
SET "value" = "value" || jsonb_build_object('feePercent', '10')
WHERE "key" = 'withdrawal_configuration' AND NOT ("value" ? 'feePercent');

ALTER TABLE "referral_commission_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_revenue_entries" ENABLE ROW LEVEL SECURITY;
