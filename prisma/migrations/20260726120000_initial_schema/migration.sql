-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvestmentSource" AS ENUM ('WALLET', 'OFFLINE', 'ADMIN');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT', 'DEDUCTION', 'HOLD', 'RELEASE');

-- CreateEnum
CREATE TYPE "LedgerCategory" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'ROI', 'REFERRAL', 'LEVEL', 'RANK', 'SALARY', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('DAILY_ROI', 'DIRECT_REFERRAL', 'LEVEL_INCOME', 'RANK_REWARD', 'SALARY');

-- CreateEnum
CREATE TYPE "IncomeStatus" AS ENUM ('CREDITED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RoiRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "authUserId" UUID NOT NULL,
    "memberId" VARCHAR(16) NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "mobile" VARCHAR(24) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "securityPinHash" TEXT NOT NULL,
    "securityPinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "securityPinLockedUntil" TIMESTAMPTZ(3),
    "bep20WalletAddress" VARCHAR(64),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "isReferralActive" BOOLEAN NOT NULL DEFAULT false,
    "sponsorId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "authUserId" UUID NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "role" "AdminRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_closure" (
    "ancestorId" UUID NOT NULL,
    "descendantId" UUID NOT NULL,
    "depth" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_closure_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USDT',
    "monthlyRoiPercent" DECIMAL(7,4) NOT NULL DEFAULT 8,
    "durationMonths" INTEGER NOT NULL DEFAULT 25,
    "payoutCapAmount" DECIMAL(20,6) NOT NULL,
    "paidOutAmount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "InvestmentSource" NOT NULL,
    "fundedByUserId" UUID,
    "activatedById" UUID,
    "activatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USDT',
    "network" VARCHAR(16) NOT NULL DEFAULT 'BEP20',
    "transactionHash" VARCHAR(128),
    "note" VARCHAR(500),
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "rejectionReason" VARCHAR(500),
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "deposit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USDT',
    "walletAddress" VARCHAR(64) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "paymentHash" VARCHAR(128),
    "rejectionReason" VARCHAR(500),
    "holdLedgerEntryId" UUID,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence" BIGSERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "balanceAfter" DECIMAL(20,6) NOT NULL,
    "referenceType" VARCHAR(64) NOT NULL,
    "referenceId" UUID,
    "idempotencyKey" VARCHAR(160),
    "description" VARCHAR(500) NOT NULL,
    "createdByAdminId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "sourceUserId" UUID,
    "investmentId" UUID,
    "type" "IncomeType" NOT NULL,
    "status" "IncomeStatus" NOT NULL DEFAULT 'CREDITED',
    "level" INTEGER,
    "percent" DECIMAL(7,4),
    "baseAmount" DECIMAL(20,6),
    "amount" DECIMAL(20,6) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "creditedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMPTZ(3),

    CONSTRAINT "income_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "runDate" DATE NOT NULL,
    "status" "RoiRunStatus" NOT NULL DEFAULT 'RUNNING',
    "processed" INTEGER NOT NULL DEFAULT 0,
    "credited" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errorDetail" VARCHAR(1000),
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "roi_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_credits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "runId" UUID NOT NULL,
    "investmentId" UUID NOT NULL,
    "incomeLedgerEntryId" UUID NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "creditDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roi_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(500),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorAdminId" UUID,
    "targetUserId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" UUID,
    "reason" VARCHAR(500),
    "before" JSONB,
    "after" JSONB,
    "requestId" VARCHAR(100),
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_authUserId_key" ON "user_profiles"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_memberId_key" ON "user_profiles"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");

-- CreateIndex
CREATE INDEX "user_profiles_sponsorId_idx" ON "user_profiles"("sponsorId");

-- CreateIndex
CREATE INDEX "user_profiles_status_createdAt_idx" ON "user_profiles"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_authUserId_key" ON "admin_profiles"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_userId_key" ON "referral_links"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_code_key" ON "referral_links"("code");

-- CreateIndex
CREATE INDEX "referral_closure_descendantId_depth_idx" ON "referral_closure"("descendantId", "depth");

-- CreateIndex
CREATE INDEX "referral_closure_ancestorId_depth_idx" ON "referral_closure"("ancestorId", "depth");

-- CreateIndex
CREATE INDEX "investments_userId_status_idx" ON "investments"("userId", "status");

-- CreateIndex
CREATE INDEX "investments_fundedByUserId_activatedAt_idx" ON "investments"("fundedByUserId", "activatedAt");

-- CreateIndex
CREATE INDEX "investments_status_activatedAt_idx" ON "investments"("status", "activatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_requests_transactionHash_key" ON "deposit_requests"("transactionHash");

-- CreateIndex
CREATE INDEX "deposit_requests_status_submittedAt_idx" ON "deposit_requests"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "deposit_requests_userId_submittedAt_idx" ON "deposit_requests"("userId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_requests_holdLedgerEntryId_key" ON "withdrawal_requests"("holdLedgerEntryId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_submittedAt_idx" ON "withdrawal_requests"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "withdrawal_requests_userId_submittedAt_idx" ON "withdrawal_requests"("userId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_entries_sequence_key" ON "wallet_ledger_entries"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_entries_idempotencyKey_key" ON "wallet_ledger_entries"("idempotencyKey");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_userId_createdAt_idx" ON "wallet_ledger_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_userId_sequence_idx" ON "wallet_ledger_entries"("userId", "sequence");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_category_createdAt_idx" ON "wallet_ledger_entries"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "income_ledger_entries_idempotencyKey_key" ON "income_ledger_entries"("idempotencyKey");

-- CreateIndex
CREATE INDEX "income_ledger_entries_userId_type_creditedAt_idx" ON "income_ledger_entries"("userId", "type", "creditedAt");

-- CreateIndex
CREATE INDEX "income_ledger_entries_sourceUserId_idx" ON "income_ledger_entries"("sourceUserId");

-- CreateIndex
CREATE UNIQUE INDEX "roi_runs_runDate_key" ON "roi_runs"("runDate");

-- CreateIndex
CREATE UNIQUE INDEX "roi_credits_incomeLedgerEntryId_key" ON "roi_credits"("incomeLedgerEntryId");

-- CreateIndex
CREATE INDEX "roi_credits_runId_idx" ON "roi_credits"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "roi_credits_investmentId_creditDate_key" ON "roi_credits"("investmentId", "creditDate");

-- CreateIndex
CREATE INDEX "audit_logs_actorAdminId_createdAt_idx" ON "audit_logs"("actorAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetUserId_createdAt_idx" ON "audit_logs"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_closure" ADD CONSTRAINT "referral_closure_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_closure" ADD CONSTRAINT "referral_closure_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_fundedByUserId_fkey" FOREIGN KEY ("fundedByUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_ledger_entries" ADD CONSTRAINT "income_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_ledger_entries" ADD CONSTRAINT "income_ledger_entries_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_ledger_entries" ADD CONSTRAINT "income_ledger_entries_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_credits" ADD CONSTRAINT "roi_credits_runId_fkey" FOREIGN KEY ("runId") REFERENCES "roi_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_credits" ADD CONSTRAINT "roi_credits_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_credits" ADD CONSTRAINT "roi_credits_incomeLedgerEntryId_fkey" FOREIGN KEY ("incomeLedgerEntryId") REFERENCES "income_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase exposes the public schema through PostgREST. All application data is
-- accessed by the server-side Prisma connection, so browser roles get no table access.
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_closure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "investments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deposit_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "withdrawal_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallet_ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "income_ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roi_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roi_credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    app_role TEXT;
    app_table TEXT;
BEGIN
    FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
            FOREACH app_table IN ARRAY ARRAY[
                'user_profiles', 'admin_profiles', 'referral_links', 'referral_closure',
                'investments', 'deposit_requests', 'withdrawal_requests',
                'wallet_ledger_entries', 'income_ledger_entries', 'roi_runs',
                'roi_credits', 'system_settings', 'audit_logs'
            ]
            LOOP
                EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', app_table, app_role);
            END LOOP;
            EXECUTE format(
                'REVOKE ALL PRIVILEGES ON SEQUENCE public.wallet_ledger_entries_sequence_seq FROM %I',
                app_role
            );
        END IF;
    END LOOP;
END $$;
