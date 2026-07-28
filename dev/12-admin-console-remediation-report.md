# NaturePower Admin Console Remediation Report

Date: 28 July 2026  
Branch: `main`  
Scope: Admin console, shared financial invariants used by admin operations, database migration, and isolated admin/financial tests.

## Delivery status

The requested remediation has been implemented in focused local commits. No commit was pushed.

Financial integration and concurrency tests were discovered by the test runner but were not executed because `TEST_DATABASE_URL` is not configured. The suite deliberately refuses to use `DATABASE_URL` as a fallback. Consequently, this report does not describe the application as production-ready.

## Local commits

- `e10ac5e fix(admin): enforce shared settings and exact activation`
- `dd96508 feat(admin): add audited member and wallet operations`
- `69b49ee feat(admin): add reports health and protected operations`

## Implemented remediation

### Shared configuration and financial validation

- Added shared Zod schemas for deposit, withdrawal, and investment configuration.
- Reused the same schemas in admin setting writes and runtime financial readers.
- Enforced positive minimum amounts, maximum investment limits, percentage ranges, duration limits, referral depth limits, and normalized withdrawal days.
- Added optimistic setting-version checks and audit revisions to prevent silent stale overwrites.
- Aligned the investment database constraint with the shared inclusive 0–100 ROI percentage validator.
- Kept all persisted money calculations on Prisma `Decimal`; dashboard chart values are emitted as fixed decimal strings rather than converted with JavaScript `Number`.

### Permissions

- Centralized role permissions for `SUPER_ADMIN`, `OPERATOR`, and `VIEWER`.
- Enforced the same permission matrix in server actions, feature pages, sidebar visibility, and report export.
- Restricted sensitive member controls, manual activation, wallet adjustment, settings management, administrator management, and audit access.
- Added role-matrix tests covering view, operational, and sensitive permissions for all three roles.

### Manual investment activation

- Requires an exact member UUID selected from a server-side search result.
- Allows duplicate names without ambiguous activation.
- Requires amount, reason, explicit confirmation, and a UUID request token.
- Uses the shared investment service and settings.
- Uses an idempotency token to reject repeated submissions.
- Uses serializable/optimistic transaction behavior for competing financial writes.

### Administrator lifecycle

- Added schema-validated administrator invitation and lifecycle operations.
- Uses a safe explicit invitation redirect based on the configured public site URL.
- Handles Supabase invitation success followed by database profile failure by attempting identity cleanup.
- Writes a reconciliation-required audit event when cleanup cannot be completed.
- Preserves self-deactivation protection.
- Prevents removal of the last active `SUPER_ADMIN` inside a serializable transaction.
- Requires a reason and explicit confirmation for role and activation changes.

### ROI consistency

- Distinguishes an executed run from a previously completed or currently owned run.
- Does not write a misleading manual-run audit entry when no work executed.
- Keeps successfully posted partial credits immutable when another investment fails.
- Supports retrying the same failed run and relies on unique investment/date credits to prevent double posting.
- Reports partial failure accurately instead of claiming all applied credits failed.
- Enforces the investment payout cap through the shared ROI credit service.

### Member administration

- Added strict allowlisted editing for name, mobile, country code, and BEP20 wallet address.
- Requires an edit reason, confirmation, and audit record.
- Added internal administrator notes using the existing schema.
- Added Supabase password recovery without generating or exposing passwords.
- Added secure MPIN replacement that hashes the new MPIN, clears lockout counters, and never reads or displays the previous MPIN.
- Added accessible review dialogs for profile, password-recovery, and MPIN changes.
- Retained the requested table-adjacent member status control while requiring explicit confirmation for block/unblock changes.
- Member queries select safe scalar fields and never return password or MPIN hashes.

### Wallet adjustments and reversals

- Added `SUPER_ADMIN`-only credit and debit adjustments.
- Requires a reason, idempotency key, and explicit confirmation.
- Validates sufficient balance for debits.
- Computes the running balance and writes the audit record in the same serializable transaction.
- Keeps historical ledger rows immutable.
- Adds reversal entries linked with `reversalOfEntryId` and `reversalReason`.
- Prevents duplicate reversal with an optimistic eligibility check and unique linkage.
- Limits reversal to unreversed `ADMIN_ADJUSTMENT` entries. Reversal of deposits, withdrawals, investments, ROI, or referral income remains intentionally unsupported until an accounting policy defines the required downstream behavior.

### Referral investigation

- Added member-specific referral investigation.
- Shows direct referrals, total downline, and separate depth 1–5 counts.
- Shows each ancestor's independent five-level position and progress.
- Shows referral link activation/eligibility data independently of display counts.
- Shows persisted commission entries tied to the source member, source investment, income type, and level.
- Explains when the selected relationship is beyond the five-level commission window.

### Reports and health

- Added server-side report filters for date range, member, exact status, and transaction type.
- Added server-side pagination.
- Added permission-protected CSV export.
- Formats exported timestamps in the India timezone.
- Escapes CSV formula prefixes to prevent spreadsheet formula injection.
- Added Decimal-safe reconciliation totals for deposits, withdrawals, investment principal, paid ROI, payout caps, income, and wallet liability.
- Expanded system health with database latency, latest ROI success/failure, missed India business dates, stalled withdrawals, overdue deposits, failed ROI runs, and missing or invalid financial settings.
- Health and report responses do not include environment values, connection strings, credentials, tokens, or cookies.

### Admin login protection

- Added a shared PostgreSQL-backed admin login throttle.
- Keys the throttle with a SHA-256 hash of normalized email plus the available client IP.
- Uses a 15-minute attempt window, five-attempt threshold, and 15-minute block.
- Records failures atomically in a serializable transaction.
- Clears the throttle after successful authentication.
- Returns a generic authentication error for credential, account, and throttling failures.
- Does not persist or log the submitted email, password, cookie, token, or raw IP in the throttle record.

### Confirmation UX and architecture

- Replaced bare destructive/financial action expanders with accessible modal dialogs for:
  - deposit approval and rejection;
  - withdrawal processing, payment, rejection, and failure;
  - investment pause/cancel transitions;
  - manual activation;
  - administrator role and lifecycle changes;
  - settings changes;
  - wallet reversals;
  - sensitive member administration.
- Dialogs identify the target and describe the consequence before submission.
- Split the large admin catch-all implementation into feature-oriented page/query modules for members, payments, finance, referrals, reports, and operations.
- Route coordination remains in `src/app/(admin)/admin/[...slug]/page.tsx`.

## Database migration

Added:

`prisma/migrations/20260728150000_admin_hardening/migration.sql`

The migration:

- creates `admin_login_throttles`;
- adds its block-time index and failure-count check;
- enables row-level security;
- revokes direct table access from Supabase `anon` and `authenticated` roles when those roles exist;
- updates `investments_amounts_check` so the database agrees with the shared ROI percentage validator.

The migration was generated and validated locally but was not deployed to a shared database.

## Tests added

### Unit and validation tests

- Invalid deposit decisions and required rejection reasons.
- Withdrawal BSC hash normalization and required exceptional-state reasons.
- Member/investment exceptional-state validation.
- Invalid financial settings.
- Withdrawal-day normalization.
- Exact UUID and confirmation requirements for manual activation.
- Permission behavior for all roles.
- Admin login lockout and recovery-window policy.

### Isolated financial/concurrency suite

`tests/admin/database-financial.test.mjs` contains:

- concurrent approvals of separate deposits into the same wallet;
- duplicate deposit decision protection;
- withdrawal `PROCESSING -> PAID` exactly once;
- withdrawal rejection hold release exactly once;
- duplicate payment-hash rejection;
- concurrent wallet adjustments;
- duplicate reversal prevention;
- exact UUID activation where two members have the same name;
- independent five-level referral windows across an eight-member chain;
- ROI partial failure, retry, and payout-cap enforcement;
- competing investment transitions;
- stale setting-write conflict;
- concurrent attempts to deactivate the final super administrators.

The suite performs fixture cleanup and skips unless `TEST_DATABASE_URL` exists and differs from `DATABASE_URL`.

## Validation commands and results

| Command | Result |
| --- | --- |
| `npx.cmd prisma validate` | Passed; Prisma schema valid |
| `npm.cmd run typecheck` | Passed; no TypeScript errors |
| `npm.cmd run lint` | Passed; no ESLint errors or warnings |
| `npm.cmd test` | Passed; 10 unit tests passed, 8 isolated database tests skipped |
| `npm.cmd run build` | Passed; Next.js 16.2.12 production build completed |
| `git diff --check` | Passed; no whitespace errors or conflict markers |

The production build generated all expected admin routes, including:

- `/admin`
- `/admin/[...slug]`
- `/admin/api/notifications`
- `/admin/api/reports/export`
- `/admin/login`

## Remaining limitations

1. The isolated financial/concurrency tests have not run because a separate test database was not supplied.
2. The new migration has not been deployed.
3. Reversal eligibility is intentionally limited to administrator adjustments. A product/accounting decision is required before reversing other transaction categories because those reversals can affect investments, ROI, referral income, holds, and externally paid funds.
4. Supabase invitation cleanup is best-effort. If both profile creation and identity cleanup fail, the audit log identifies the reconciliation requirement for an administrator.
5. Notification state remains derived from current pending database work rather than a persistent per-administrator read/unread inbox.

## Manual QA checklist

Use a non-production environment with the migration applied and seeded `SUPER_ADMIN`, `OPERATOR`, and `VIEWER` identities.

1. Sign in with each role and confirm unauthorized sidebar items are absent.
2. Attempt direct navigation to every hidden route and verify the server rejects it.
3. Submit five failed admin logins for the same normalized email/IP and verify the generic block response; confirm recovery after the configured window.
4. Open two members with identical names and verify manual activation targets only the selected UUID.
5. Repeat the same activation request token and verify no second investment or debit is created.
6. Approve two deposits for one member concurrently and verify the final wallet balance and immutable ledger entries.
7. Process and pay a withdrawal, then repeat the pay action and verify only one settlement entry exists.
8. Reject/fail a held withdrawal twice and verify only one release entry exists.
9. Create simultaneous wallet adjustments and verify the running balance; reverse an eligible adjustment twice and verify one reversal.
10. Edit approved member fields and verify the reason and before/after values are audited.
11. Request password recovery and replace an MPIN; confirm no credential or MPIN value appears in the page, audit metadata, server response, or console.
12. Try concurrent final-super-admin deactivations and verify one active super administrator remains.
13. Run ROI for a date, retry it, and verify there are no duplicate investment/date credits.
14. Inspect a referral chain longer than five members and verify the direct and level commission window.
15. Filter reports, paginate, export CSV, and verify India timestamps and reconciliation totals.
16. Inspect system health with a missing setting, invalid setting, failed ROI run, and stalled financial request.
17. Check the admin layout and dialogs on narrow mobile, tablet, and desktop widths.

## Safe rollout sequence

1. Provision a disposable database with the same schema.
2. Set `TEST_DATABASE_URL` only for the test command and ensure it differs from `DATABASE_URL`.
3. Apply migrations to the disposable database.
4. Run `npm.cmd test` and require all 18 tests to pass with zero skips.
5. Repeat `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build`.
6. Review the migration and accounting-policy limitation.
7. Apply the migration through the normal deployment process.
8. Complete the manual QA checklist.
9. Push or deploy only after those checks are accepted.
