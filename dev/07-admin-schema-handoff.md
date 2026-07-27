# Admin Schema Handoff

The admin data model is deployed by `20260727113000_admin_schema`. Admin UI code must use server-side Prisma only. Browser Supabase roles have no table privileges.

## Roles

- `SUPER_ADMIN`: manage admins, users, financial actions, settings, ROI runs, and audit access.
- `OPERATOR`: review deposits/withdrawals and inspect users/ledgers. Grant mutations explicitly in the permission layer.
- `VIEWER`: read-only admin pages.

Every protected route, query, action, and service must call a server-side `requireAdmin()` permission guard. `AdminProfile.isActive` must be checked on every request.

## Required Transaction Flows

All financial mutations use a serializable Prisma transaction, row/advisory locking where needed, an idempotency key, an optimistic `version` check, and an `AuditLog` record.

### Approve Deposit

1. Lock the pending `DepositRequest` and the user's latest wallet entry.
2. Create one `WalletLedgerEntry` credit with category `DEPOSIT`.
3. Update the request to `APPROVED`, set `approvedAmount`, reviewer fields, and `creditLedgerEntryId`.
4. Write a successful audit record in the same transaction.

Rejecting a deposit sets `REJECTED`, reviewer fields, and a required rejection reason. It never creates a wallet entry.

### Process Withdrawal

The user request already has a `HOLD` entry and reduced available balance.

1. `PENDING -> PROCESSING`: record reviewer, processor, review source, and processing time.
2. `PROCESSING -> PAID`: send funds outside the database, then create a balance-neutral `SETTLE` ledger entry and store its ID, payment hash, payer, and paid time.
3. `PENDING/PROCESSING -> REJECTED`: create one `RELEASE` entry that restores the hold, then store its ID and rejection reason.
4. `PROCESSING -> FAILED`: create one `RELEASE` entry and store failure details.

Never debit the wallet again when paying a withdrawal; the original hold already reduced the available balance.

### Adjustments And Reversals

- Admin balance corrections use category `ADMIN_ADJUSTMENT`, an idempotency key, `createdByAdminId`, a reason, and an audit record.
- Never update or delete an existing wallet ledger row.
- A reversal creates a new ledger row linked by `reversalOfEntryId`.
- Income reversal sets the reversal actor/source/reason and links its compensating wallet entry.

### Settings

Updating a `SystemSetting` increments `version`, records `updatedByAdminId`, and inserts a matching `SystemSettingRevision` containing previous/next values and a reason. Both writes and the audit entry belong to one transaction.

## Lifecycle Notes

- Investments support `ACTIVE`, `PAUSED`, `COMPLETED`, and `CANCELLED`.
- Manual ROI runs must store `trigger = MANUAL` and `triggeredByAdminId`.
- Blocking a user requires `blockedAt` and `blockReason`; unblocking clears those fields.
- Admins are deactivated, not deleted. Deactivation requires a timestamp and reason.
- Use `AuditLog.actorType = SYSTEM` only for scheduled/system operations with no admin actor.

The database has check constraints for money, lifecycle consistency, referral depth, reversals, ROI counts, setting versions, and audit actors. Treat a constraint failure as a service bug, not as validation messaging for the UI.
