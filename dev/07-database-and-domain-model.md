# Database and Domain Model

Use Supabase Postgres. Use Prisma server-side for application data access. Keep schema normalized enough to audit every money movement.

## Prisma/Supabase Rules

- Keep Prisma server-only.
- Use `DATABASE_URL` for runtime pooled connection.
- Use `DIRECT_URL` for migrations where required.
- For Supabase pooling/Supavisor, account for PgBouncer/prepared statement requirements.
- If using Supabase Auth, link `auth.users.id` to an application `UserProfile`.
- Do not depend on client-side RLS alone when using Prisma/service DB access; enforce authorization in the DAL.

## Core Models

Likely models:

- `UserProfile`
- `AdminProfile`
- `UserCredentialMeta` if extra non-auth credential data is needed
- `Investment`
- `DepositRequest`
- `WithdrawalRequest`
- `WalletLedgerEntry`
- `IncomeLedgerEntry`
- `ReferralLink`
- `ReferralClosure` or adjacency/tree helper
- `SystemSetting`
- `AuditLog`
- `RoiRun`
- `ImageAsset` if uploads are needed

## UserProfile Fields

- id
- authUserId
- memberId, e.g. `NP333130`
- fullName
- email
- mobile
- country
- sponsorId nullable
- sponsorMemberId nullable
- status: pending/active/blocked
- isReferralActive
- bep20WalletAddress nullable
- securityPinHash if not handled by Supabase Auth
- createdAt/updatedAt

Never store raw MPIN.

## Investment

- id
- userId
- amount
- currency
- monthlyRoiPercent default 8
- durationMonths default 25
- totalPayoutCap = amount * 2
- paidOutAmount
- status: active/completed/cancelled
- activatedByAdminId nullable
- source: wallet/offline/admin
- activatedAt
- completedAt nullable

Multiple investments per user are allowed. Each has its own 25-month cycle.

## Wallet Ledger

Single source of truth for balance changes.

Fields:

- id
- userId
- direction: credit/debit/deduction/hold/release
- amount
- balanceAfter
- category: deposit, withdrawal, investment, roi, referral, level, rank, admin_adjustment
- referenceType
- referenceId
- description
- createdAt
- createdByAdminId nullable

Dashboard balances should derive from ledger aggregates or maintained transactional summaries.

## Income Ledger

Fields:

- id
- userId
- sourceUserId nullable
- investmentId nullable
- type: daily_roi/direct_referral/level_income/rank_reward/salary
- level nullable
- percent nullable
- baseAmount nullable
- amount
- status: credited/reversed
- creditedAt

## Referral Rules

- Direct commission: 1% of approved investment amount to direct sponsor.
- Level commission: 0.25% to eligible uplines up to depth 5 for that chain rule.
- Referral commission is created only after investment/activation approval.
- Registration never stops because a link was used too much.
- Link never expires.
- Inactive referral link can block registration/use according to current business rule, with custom modal.

Use a tree strategy that can answer:

- direct team
- total downline
- all team
- topup users
- today topup users
- level commission eligibility up to 5 levels

For small/local scale, adjacency list plus recursive CTE is acceptable. For faster reads, add closure table.

## Withdrawal Rules

- User can request only on day `1` or `16`.
- Minimum withdrawal is configurable; screenshot shows `$10`.
- On request, hold/deduct available balance to prevent double-spend.
- On approval, finalize as withdrawn.
- On rejection, release funds back to available balance.

## ROI Rules

- 8% monthly, credited daily as `investment.amount * 0.08 / 30`.
- Stops when duration reaches 25 months or total payout reaches 200% of investment amount.
- Automatic job creates daily ledger rows.
- Job must be idempotent per investment/date.

## Admin Settings

Settings table should include:

- monthly ROI percent
- ROI duration months
- direct commission percent
- level commission percent
- max level depth
- min investment
- min withdrawal
- withdrawal allowed days
- deposit wallet address
- active network label

Official references:

- Supabase Prisma: https://supabase.com/docs/guides/database/prisma
- Supabase Prisma troubleshooting: https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting
- Prisma Next.js: https://www.prisma.io/docs/guides/next/frameworks/nextjs
- Prisma PgBouncer: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
