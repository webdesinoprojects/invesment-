# Admin Feature Plan

Admin will be built after user side, but user-side data must support it.

## Admin Modules

Dashboard:

- total users
- active users
- pending users
- total active investments
- total deposits approved
- pending deposit requests
- pending withdrawal requests
- ROI paid
- referral/level commissions paid

Users:

- search by member ID, name, mobile, email
- view sponsor/downline
- edit locked user fields
- block/unblock
- reset password/MPIN flow
- view wallet and income ledgers

Deposits:

- pending/approved/rejected
- manual credit
- transaction hash/payment note
- audit trail

Withdrawals:

- pending/approved/rejected
- approve with payment hash/note
- reject with reason
- release funds on rejection
- audit trail

Investments/Activations:

- create activation manually
- approve user activation request
- amount, user, source, status
- view ROI progress
- cancel only with explicit audited reason

ROI Engine:

- daily run status
- run manually for date
- idempotency check
- missed-day detection
- per-investment payout cap tracking

Referral:

- direct tree
- downline tree
- commission ledger
- level eligibility preview
- chain depth visibility

Wallet Ledger:

- all credit/debit/deduction/hold/release entries
- filter by user/category/date
- admin adjustment with reason

Settings:

- ROI percent
- ROI duration
- direct commission percent
- level commission percent
- max level depth
- minimum investment
- minimum withdrawal
- withdrawal dates
- deposit wallet address
- network label
- maintenance mode

Audit:

- admin ID
- action
- entity
- before/after snapshot where safe
- IP/user-agent if available
- created at

## Admin Security

- Admin routes use separate layout and authorization gate.
- Admin role checked server-side on every page/action.
- Destructive actions require confirm dialog.
- High-risk actions require reason text.
- No admin API response returns secrets.
- All admin financial changes are transactional and audited.

## Suggested Roles

- `SUPER_ADMIN`: all access, settings/admin users.
- `OPERATOR`: approve deposits/withdrawals/investments.
- `VIEWER`: read-only.

## Build Order

1. User data model and auth.
2. User dashboard and ledgers.
3. Admin users/deposits/withdrawals.
4. Investments and ROI job.
5. Referral and commission ledgers.
6. Admin settings and audit polishing.
