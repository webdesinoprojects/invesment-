CREATE TABLE "admin_login_throttles" (
  "key" VARCHAR(64) NOT NULL,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
  "blockedUntil" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "admin_login_throttles_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "admin_login_throttles_failure_count_check" CHECK ("failureCount" >= 0)
);

CREATE INDEX "admin_login_throttles_blockedUntil_idx"
  ON "admin_login_throttles"("blockedUntil");

ALTER TABLE "admin_login_throttles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "investments"
  DROP CONSTRAINT "investments_amounts_check";

ALTER TABLE "investments"
  ADD CONSTRAINT "investments_amounts_check" CHECK (
    "amount" > 0 AND
    "monthlyRoiPercent" >= 0 AND
    "monthlyRoiPercent" <= 100 AND
    "durationMonths" > 0 AND
    "payoutCapAmount" > 0 AND
    "paidOutAmount" >= 0 AND
    "paidOutAmount" <= "payoutCapAmount"
  );

DO $$
DECLARE
  app_role TEXT;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
        'admin_login_throttles',
        app_role
      );
    END IF;
  END LOOP;
END $$;
