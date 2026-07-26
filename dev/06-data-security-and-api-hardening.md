# Data Security and API Hardening

This app records financial activity. Build it as if users will try to manipulate requests.

## Auth and Authorization

- Use Supabase SSR/cookie auth for sessions.
- Server Components, Server Actions, and Route Handlers must verify session server-side.
- Admin routes require admin role from the database, not client state.
- User routes must scope every query by authenticated user ID.
- Admin actions must write audit logs.
- Service-role Supabase key and direct database URL stay server-only.

## Data Access Layer

- Prisma is server-only.
- Use a DAL/service layer; do not query database directly from random components.
- Use Prisma transactions for multi-ledger changes.
- Add idempotency keys for approvals/jobs where duplicate submission would create double credit.

Financial workflows requiring transactions:

- admin approves deposit -> wallet credit + deposit status + wallet ledger + audit
- user requests withdrawal -> available balance debit/hold + withdrawal row + ledger
- admin rejects withdrawal -> release pending amount + status + ledger + audit
- admin approves withdrawal -> final withdrawn status + audit
- investment activation -> active investment + wallet debit/offline record + commissions + ledger + audit
- daily ROI job -> ROI credit + investment progress + wallet ledger

## Server Action Rules

Treat every Server Action as a public HTTP endpoint:

- validate input
- verify session
- verify role/ownership
- check business rules
- use transaction where money changes
- return typed result
- never return raw DB records with hidden fields

## Route Handler Rules

Use Route Handlers only when needed:

- scheduled ROI endpoint
- ImageKit upload auth
- external webhooks
- health checks

Every Route Handler must define:

- method
- auth requirement
- validation
- cache policy
- error response shape

## Cache and Privacy

Never public-cache:

- user dashboard
- balances
- ledgers
- profile
- admin pages
- auth responses
- routes that set cookies

For Supabase SSR responses that refresh auth cookies, apply no-store/private cache behavior according to Supabase guidance.

## Environment Variables

Use `src/lib/env` with server/client env validation.

Public:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`

Server-only:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_SECRET_KEY` or service-role equivalent
- `IMAGEKIT_PRIVATE_KEY`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- cron secret

Only `NEXT_PUBLIC_*` may reach the browser.

## Logging

Allowed:

- request IDs
- action names
- non-sensitive status transitions
- admin ID performing action

Forbidden:

- passwords
- MPIN/security pin
- auth tokens
- wallet private keys
- full session objects
- full user records in client console
- env values

## Abuse Cases to Handle

- user changes hidden sponsor ID in register form
- inactive user shares referral link
- user requests withdrawal on wrong date
- user requests more than available balance
- duplicate withdraw request submit
- admin approves same deposit twice
- scheduled ROI job runs twice
- user tries to activate another member without permission/balance
- user accesses another user ledger by ID
- non-admin opens admin routes

Official references:

- Next data security: https://nextjs.org/docs/app/guides/data-security
- Next authentication guide: https://nextjs.org/docs/app/guides/authentication
- Next `use server`: https://nextjs.org/docs/app/api-reference/directives/use-server
- Supabase package choice: https://supabase.com/docs/guides/auth/choosing-a-server-package
- Supabase SSR advanced guide: https://supabase.com/docs/guides/auth/server-side/advanced-guide
