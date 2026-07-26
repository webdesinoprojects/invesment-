# Clean Architecture and Folder Structure

The app must be organized by domain and route, not by dumping everything into page files.

## Proposed Structure

```text
src/
  app/
    (public)/
      layout.tsx
      page.tsx
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
    (user)/
      layout.tsx
      dashboard/page.tsx
      deposit/page.tsx
      withdraw/page.tsx
      invest/page.tsx
      team/page.tsx
      earnings/page.tsx
      history/page.tsx
      assets/page.tsx
      profile/page.tsx
      security/password/page.tsx
      security/mpin/page.tsx
    (admin)/
      layout.tsx
      admin/page.tsx
      admin/users/page.tsx
      admin/deposits/page.tsx
      admin/withdrawals/page.tsx
      admin/investments/page.tsx
      admin/ledger/page.tsx
      admin/settings/page.tsx
      admin/audit/page.tsx
    api/
      cron/roi/route.ts
      imagekit/auth/route.ts
  components/
    ui/
    layout/
    charts/
    feedback/
    data-table/
  features/
    auth/
      actions/
      components/
      schemas/
      types/
    user-dashboard/
      components/
      queries/
      types/
    wallet/
      actions/
      components/
      queries/
      schemas/
      services/
      types/
    investment/
      actions/
      calculations/
      components/
      queries/
      schemas/
      services/
      types/
    referral/
      calculations/
      components/
      queries/
      services/
      types/
    earnings/
      components/
      queries/
      types/
    team/
      components/
      queries/
      types/
    profile/
      actions/
      components/
      schemas/
      types/
    admin/
      actions/
      components/
      queries/
      schemas/
      types/
  lib/
    auth/
    db/
    env/
    imagekit/
    money/
    security/
    supabase/
    utils/
  server/
    jobs/
    permissions/
    audit/
  styles/
    globals.css
  types/
    common.ts
    database.ts
    money.ts
```

## Layer Rules

- `app/**/page.tsx`: route composition only. Fetch data, choose components, pass props.
- `features/*/components`: domain UI components.
- `features/*/actions`: Server Actions only. Must validate + authorize.
- `features/*/queries`: server-only read queries.
- `features/*/schemas`: Zod schemas for action/form/route input.
- `features/*/types`: exported domain types.
- `features/*/calculations`: pure functions, no DB, no env.
- `features/*/services`: orchestration for business workflows.
- `lib/db`: Prisma client and database helpers, server-only.
- `server/jobs`: scheduled ROI, cleanup, reconciliation.
- `server/audit`: audit log writer.

## Page File Size Rule

Target:

- `page.tsx`: under 120 lines.
- component file: under 250 lines.
- action file: under 250 lines.
- query file: under 250 lines.
- large tables split columns, filters, row actions, and empty states into files.

If a file crosses this, split it before adding more code.

## User Routes

- `/dashboard`: wallet card, referral card, shortcuts, carousel, portfolio overview.
- `/deposit`: QR/address/latest transaction.
- `/withdraw`: date-gated withdrawal request.
- `/invest`: activation/investment form and ledger.
- `/team`: four tabs: all team, topup id, today topup id, direct.
- `/earnings`: four tabs: daily ROI, referral, level income, rank rewards.
- `/history`: three tabs: main wallet, withdraw history, deposit history.
- `/assets`: aggregate balances.
- `/profile`: profile details + wallet address.
- `/security/password`: password change.
- `/security/mpin`: MPIN/security pin change.

## Admin Routes

Build after user side, but data model must support:

- users
- deposits
- withdrawals
- investments
- daily ROI credits
- direct referral commissions
- level commissions
- wallet ledger
- settings
- audit log

## Imports

Allowed direction:

```text
app -> features -> lib/server -> db
components/ui -> no app imports
calculations -> no app/db/env imports
schemas/types -> no app/db imports
```

Do not import a page into a component. Do not import Prisma into a Client Component.
