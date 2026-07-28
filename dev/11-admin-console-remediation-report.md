# Admin Console Remediation Report

Date: 2026-07-28
Source specification: `C:\Users\chetan kumar\Downloads\11-admin-console-remediation.md`

## Executive Summary

The administration console was moved from a visually complete but operationally unsafe prototype
toward a feature-oriented, database-constrained admin system. The highest-risk defects identified
by the handoff were corrected:

- Deposit decisions are strictly validated and no unknown value can default to approval.
- Deposit credits use Prisma `Decimal`, serializable retry handling, deterministic idempotency,
  optimistic request versions, ledger linkage, and same-transaction audit records.
- Withdrawal processing now follows the deployed state machine.
- Paid withdrawals create one balance-neutral `SETTLE` entry and never debit the wallet twice.
- Rejected and failed withdrawals create one `RELEASE` entry and restore the original hold.
- Payment requires a normalized BSC transaction hash.
- Invalid and stale transitions return typed conflicts instead of silently changing state.
- Member blocking requires a reason; activation/unblocking clears block state consistently.
- Investment lifecycle changes use an explicit transition map and terminal states cannot reopen.
- Manual activation reuses the normal investment, wallet debit, referral, commission, duration,
  ROI, and payout-cap service.
- Manual ROI runs reuse the existing idempotent ROI engine and record the admin actor.
- Supported system settings are strictly validated, versioned, revisioned, optimistic, and audited.
- Administrator authentication now uses Supabase Auth and requires an active `AdminProfile`.
- Administrator invitation, role change, activation, and deactivation are server-authorized.
- The final active super administrator cannot be removed.
- Tables for primary operational modules now use server-side search and pagination.
- Referral tree and analytics use persisted closure and income records as separate features.
- Notification semantics are explicitly a pending work queue, not fake unread notifications.
- System-health information is produced by real server-side database checks.

No user-facing page or public visual design was rewritten. The shared investment service was
extended only to allow the admin entry point to execute the same business invariants and audit
the administrator.

## Architecture Changes

New admin code is organized by feature:

```text
src/features/admin/
  administrators/
  deposits/
    actions/
    components/
    schemas/
    services/
  health/
  investments/
    actions/
    components/
    schemas/
    services/
  members/
    actions/
    components/
    schemas/
    services/
  notifications/
  roi/
  settings/
  shared/
  withdrawals/
    actions/
    components/
    schemas/
    services/
```

Central authorization is implemented in:

```text
src/server/permissions/admin-permissions.ts
```

The permission matrix is enforced on the server:

| Permission | SUPER_ADMIN | OPERATOR | VIEWER |
| --- | --- | --- | --- |
| View admin data | Yes | Yes | Yes |
| Manage member status | Yes | Yes | No |
| Review deposits | Yes | Yes | No |
| Process withdrawals | Yes | Yes | No |
| Manage investment lifecycle | Yes | Yes | No |
| Manual activation | Yes | No | No |
| Manual ROI | Yes | No | No |
| Wallet adjustment permission | Yes | No | No |
| Edit settings | Yes | No | No |
| Manage administrators | Yes | No | No |
| View audit data | Yes | Yes | No by default |

Hidden UI elements are not treated as authorization. Actions call the central permission guard.

## Authentication Remediation

The runtime `ADMIN_EMAIL` / `ADMIN_PASSWORD` deterministic super-admin upsert was removed.

The new flow:

1. Authenticates email and password through the existing Supabase SSR server client.
2. Reads the authenticated Supabase user ID.
3. Requires a matching `AdminProfile.authUserId`.
4. Requires `AdminProfile.isActive = true`.
5. Reads the current database role on every protected request.
6. Records successful login and logout audit entries.
7. Uses the established Supabase cookie lifecycle for sign-in and sign-out.

An ordinary Supabase user receives no admin access unless an active `AdminProfile` exists.

Super administrators can invite new administrators. The invitation is created through the
server-only Supabase admin client and a corresponding attributed `AdminProfile` is created.
Administrators are deactivated, never deleted.

## Deposit Review Invariants

Input schema:

- `id`: UUID
- `decision`: exact enum `APPROVE | REJECT`
- `reason`: required for rejection

Approval:

1. Runs at serializable isolation with retry on Prisma `P2034`.
2. Loads only a pending request.
3. Reads the latest wallet balance as `Prisma.Decimal`.
4. Adds the approved amount using Decimal arithmetic.
5. Creates one `CREDIT / DEPOSIT` wallet entry.
6. Uses `deposit:{requestId}:approval` as the deterministic idempotency key.
7. Version-checks the pending request before final linkage.
8. Sets approved amount, reviewer, source, timestamp, ledger ID, and incremented version.
9. Creates the audit record in the same transaction.

Rejection:

- Requires a reason.
- Creates no wallet entry.
- Sets the required rejection lifecycle fields.
- Uses the same optimistic version and audit transaction.

## Withdrawal State Machine

### PENDING to PROCESSING

- Requires `withdrawals.process`.
- Checks status and version.
- Sets reviewer, processor, source, review time, processing time, and review note.
- Increments version.
- Audits in the same transaction.

### PROCESSING to PAID

- Requires a `0x` plus 64 hexadecimal BSC payment hash.
- Normalizes the hash to lowercase.
- Calculates net amount with Prisma Decimal: `amount - feeAmount`.
- Creates one `SETTLE / WITHDRAWAL` ledger entry.
- Keeps `balanceAfter` unchanged because the original hold already reduced the wallet.
- Uses `withdrawal:{requestId}:settlement`.
- Stores payment hash, net amount, payer, paid time, settlement ledger link, and version.
- Audits in the same serializable transaction.

The UI explicitly states that the external transfer happens outside the database transaction and
that “Record paid” is used only after the transfer succeeds.

### PENDING or PROCESSING to REJECTED

- Requires a reason.
- Creates one `RELEASE / WITHDRAWAL` ledger entry.
- Restores the original held amount using Decimal arithmetic.
- Uses `withdrawal:{requestId}:release`.
- Stores release ledger linkage and rejection lifecycle fields.
- Audits in the same transaction.

### PROCESSING to FAILED

- Requires a reason.
- Creates the same exactly-once release flow.
- Stores failure reason, failed timestamp, release link, and version.
- Audits in the same transaction.

`FAILED -> PROCESSING` was removed because it would require a new compensating hold.

## Members And Investigation

Member lists now support:

- Server-side search by member ID, name, email, or mobile.
- Status-specific views.
- Twenty-five-row server pagination.
- Audited activation, blocking, and unblocking.
- Required blocking reason.

Each member links to an investigation view containing:

- Identity, contact, country, status, rank, and sponsor.
- Direct and persisted downline counts.
- Latest immutable wallet ledger.
- Investments, payout cap, paid ROI progress, and lifecycle.
- Income totals by type and status.
- Latest deposits and withdrawals.
- Audit activity and administrator notes.

Credential hashes and existing MPIN values are never selected or rendered in the detail view.

## Investments And ROI

Investment lifecycle transitions:

```text
ACTIVE -> PAUSED | CANCELLED
PAUSED -> ACTIVE | CANCELLED
COMPLETED -> terminal
CANCELLED -> terminal
```

Pause and cancellation require reasons. Resume clears pause state. All changes record actor,
target, before/after status, and reason.

Manual activation:

- Searches by member ID, name, email, or mobile.
- Requires amount, reason, and UUID idempotency token.
- Requires the `investments.manual` permission.
- Reuses the user-side activation service.
- Applies minimum amount, wallet balance, wallet debit, payout cap, ROI percentage, duration,
  referral activation, direct commission, level commission, and existing idempotency.
- Adds admin attribution and audit inside the shared transaction.

Manual ROI:

- Requires a business date and `roi.run`.
- Rejects future dates.
- Reuses `runDailyRoi`.
- New runs are attributed as `MANUAL`.
- Existing failed work is claimed as `RETRY`.
- The existing unique run date and per-investment/date keys prevent duplicate credits.
- Run history now displays trigger, status, counts, start/end, and failure detail.

## Settings And Administrator Management

Editable settings are intentionally limited to strict schemas:

- `investment_configuration`
- `withdrawal_configuration`
- `deposit_configuration`

Every update:

1. Validates the setting-specific structure.
2. Requires a reason.
3. Checks the submitted version.
4. Increments the version.
5. Creates a `SystemSettingRevision`.
6. Stores previous and next values.
7. Records actor and audit.
8. Rejects stale changes.

Administrator management supports:

- Supabase invitation.
- Profile creation with creator attribution.
- Role changes with reasons.
- Activation and deactivation.
- Deactivation actor, timestamp, and reason.
- Prevention of self-deactivation.
- Prevention of removal of the final active super administrator.

## Query, Reporting, Referral, Notification, And Health Changes

- Primary member, payment, investment, ledger, ROI, and audit tables use 25-row pagination.
- Search runs in Prisma on the server.
- Wallet and income ledger rows remain immutable.
- Reports aggregate real member status, deposit status, withdrawal status, investments,
  payout obligations, income types, and latest wallet liabilities.
- Referral Tree reads `ReferralClosure`.
- Team Analytics separately groups persisted closure depth and paid income ledger records.
- The top-right feed is labelled “Pending work queue”; items are not called unread.
- Notification responses are validated with Zod.
- Fetch failures are visible in the notification UI.
- Dashboard “new today” uses explicit India business-day boundaries.
- Financial display formatting does not use JavaScript Number arithmetic.
- System Health reports database batch latency, last successful/failed ROI, stalled withdrawals,
  required settings, latest successful audit, and application version without exposing secrets.

## Automated Validation

Commands executed:

```text
npm run db:validate
npm run test
npm run typecheck
npm run lint
npm run build
```

Results:

- Prisma schema validation: passed.
- Admin validation tests: 5 passed, 0 failed.
- TypeScript strict validation: passed.
- ESLint: passed with zero errors and zero warnings.
- Clean production build: passed.
- `/admin/login` smoke request: HTTP 200.
- Anonymous `/admin` smoke request: HTTP 307 redirect.
- Server error log after smoke checks: empty.

Test cases currently cover:

- Unknown deposit decisions cannot approve.
- Deposit rejection requires a reason.
- Withdrawal payment requires a valid normalized BSC hash.
- Withdrawal rejection and failure require reasons.
- Member blocking requires a reason.
- Pause/cancel validation requires a reason.

## Clean Build Procedure

The running `invest` Next.js processes were identified and stopped. The resolved generated path
was verified as:

```text
C:\Users\chetan kumar\OneDrive\Desktop\invest\.next
```

Only that generated directory was removed. A new production build regenerated Prisma and `.next`
successfully. No source directory was deleted.

## Deployment And Bootstrap Requirement

The old environment-only admin credential is no longer a runtime authentication system.

Before deployment, the first administrator must have:

1. A real Supabase Auth identity.
2. An `AdminProfile` whose `authUserId` equals that Supabase user ID.
3. `isActive = true`.
4. The intended database role.

After the first active super administrator is present, additional administrators can be invited
from Admin Management.

Do not restore `ADMIN_EMAIL`, `ADMIN_PASSWORD`, or a custom cookie-secret fallback.

## Items Requiring A Dedicated Test Database Or Further Product Definition

The shared configured database was not mutated with destructive financial test fixtures. The
following release tests must run against an isolated test database before production approval:

- Concurrent approval of two deposits for the same wallet.
- Duplicate terminal withdrawal submissions under concurrency.
- Database assertions for exact settlement/release balance linkage.
- Full manual activation commission tree fixtures.
- ROI retry fixtures covering partial failure and payout caps.
- Five-level independent eligibility fixtures.
- Settings stale-write concurrency fixtures.
- Administrator session revocation after role change while a browser session is active.

Additional product work still requiring an explicit specification:

- Whether administrator login rate limiting is database-, Redis-, or edge-provider-backed.
- Whether work-queue entries should become persistently dismissible notifications.
- Which profile fields administrators may edit.
- Whether password/MPIN reset should send recovery links or invalidate credentials immediately.
- The approved policy and accounting behavior for manual wallet adjustments and reversals.
- CSV export retention, timezone, and spreadsheet-column requirements.
- Cron heartbeat source and deployment metadata provider.

These are not represented as completed because the handoff explicitly forbids claiming
production completion based only on rendered UI or shared-database testing.
