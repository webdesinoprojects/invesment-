# User Panel Setup and Test Runbook

This runbook covers the user application only. The admin panel is intentionally not implemented yet.

## 1. Supabase project values

Create a Supabase project and collect these values:

- `NEXT_PUBLIC_SUPABASE_URL`: project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key.
- `SUPABASE_SECRET_KEY`: server-only secret key. Never expose it with a `NEXT_PUBLIC_` prefix.
- `DATABASE_URL`: transaction-pooler PostgreSQL URL for the running app.
- `DIRECT_URL`: direct or session-pooler PostgreSQL URL for migrations.

In Supabase Authentication URL Configuration, add:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/confirm`

Use the production origin instead of localhost after deployment.

## 2. Application secrets

Generate three independent random values. Run this command three times and use a different result for each variable:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- `PASSWORD_RECOVERY_SECRET`
- `CRON_SECRET`

`NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PUBLIC_KEY`, and `IMAGEKIT_PRIVATE_KEY` are optional until final media assets are integrated.

## 3. Create the database

Fill `.env`, then run:

```powershell
npm install
npm run db:deploy
npm run db:generate
```

The committed initial migration creates the complete user-side schema, constraints, indexes, and ledgers.

## 4. Create the first test sponsor

Registration requires an active sponsor. Until the admin panel exists, add these temporary local values to `.env`:

```dotenv
TEST_SPONSOR_EMAIL=test-sponsor@example.com
TEST_SPONSOR_PASSWORD=ChangeMe12345
TEST_SPONSOR_MPIN=1234
```

Then run:

```powershell
npm run seed:test-sponsor
```

This creates active member `NP900001`, a 1,000 USDT test ledger balance, an active referral link, and a fake deposit address. Never send funds to the fake address. Remove the three `TEST_SPONSOR_*` values after seeding and do not use this script in production.

## 5. Start and test

```powershell
npm run dev
```

Open `http://localhost:3000` and verify this sequence:

1. Log in as `NP900001` with the test password.
2. Open Profile, add a syntactically valid test BEP-20 address, and test password and MPIN changes.
3. Invest 100 USDT into `NP900001` using the test MPIN. The wallet is debited and the investment and referral access remain active.
4. Copy the referral URL and register a second account in a private browser window. The invite ID and sponsor must come from the URL.
5. From the sponsor account, activate 100 USDT for the second member ID. Confirm the sponsor receives 1% direct income.
6. Use the second member's referral URL to register a third account, then fund that third account from the first sponsor. Confirm the second member receives 1% and the first sponsor receives 0.25% level income.
7. Verify Team tabs, Earnings tabs, History tabs, Assets totals, empty states, pagination, and logout.
8. Submit a deposit using a unique 66-character BSC hash (`0x` plus 64 hexadecimal characters). It must remain pending until the future admin workflow reviews it.
9. Verify the withdrawal-closed dialog outside the 1st and 16th. Actual approval or rejection cannot be tested until the admin panel exists.
10. Request a password reset and confirm that the email link opens the dedicated 15-minute recovery form, not the current-password form.

## 6. Test automatic ROI

ROI starts on the India calendar day after activation. For an immediate local test, move only test investments to the prior day in Supabase SQL Editor:

```sql
update investments
set "activatedAt" = now() - interval '1 day'
where status = 'ACTIVE';
```

Invoke the protected job:

```powershell
$cronSecret = ((Get-Content .env | Where-Object { $_ -like 'CRON_SECRET=*' }) -split '=', 2)[1]
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/cron/roi -Headers @{ Authorization = "Bearer $cronSecret" }
```

A 100 USDT investment at 8% monthly credits 0.266667 USDT per day. Invoke the endpoint again on the same India date and confirm no second credit is created.

In production, configure a trusted scheduler to send this authenticated POST once per India calendar day, preferably shortly after midnight IST. Retry non-2xx responses; the run and credit idempotency constraints make retries safe.

## 7. Required release checks

```powershell
npm run typecheck
npm run lint
npm run db:validate
npm run build
```

Do not begin admin-panel implementation until the user workflow above has been reviewed and accepted.
