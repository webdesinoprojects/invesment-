# Nature Power Build Rules

Last checked: 2026-07-26.

These rules are mandatory for this project. They exist because this app handles balances, referrals, requests, identity, and admin approvals. Treat every mutation as financial-record software, not a simple UI demo.

## Version Baseline

- Next.js: `16.2.12` stable / Active LTS.
- React: React 19 line. Use the stable `react@latest` compatible with Next 16.2.11 at install time, then pin exact versions.
- TypeScript: `7.0.2` stable if package compatibility allows it; otherwise pin the newest stable supported by Next/shadcn dependencies.
- Tailwind CSS: v4 line, currently v4.3 from official Tailwind release notes.
- shadcn/ui: latest CLI/components, Tailwind v4 + React 19 mode, `new-york` style, `sonner` instead of deprecated toast.
- Database: Supabase Postgres.
- Data access: Prisma ORM server-side only, plus Supabase SSR Auth where session/auth is needed.
- Media: ImageKit Next SDK for hosted media; `next/image` for local static assets.

## Non-Negotiables

- Do not create 1,000-line feature files. Split by route, component, action, query, schema, type, and utility.
- No business logic inside JSX components unless it is purely presentational.
- No Prisma, service-role keys, admin credentials, payout wallet secrets, or private env vars in Client Components.
- No browser `alert()`. Use a custom modal/toast layer.
- No `console.log` for sensitive data, auth payloads, transactions, balances, env values, user records, or admin actions.
- No direct client-side trust for money, roles, sponsor IDs, activation status, withdrawal dates, or commission amounts.
- No unvalidated server action or route handler input. Use schema validation on the server.
- No raw SQL string interpolation. Use Prisma query APIs, parameterized SQL, or stored functions with typed wrappers.
- No invisible state mutations from rendering. Mutations belong in Server Actions, Route Handlers, scheduled jobs, or admin commands.
- No public route can infer admin access from query params, localStorage, hidden inputs, or client state.
- No user-facing feature is complete until empty, loading, error, success, unauthorized, and mobile states exist.

## Checkpoint Rule

After a real feature is finished and verified, create a commit checkpoint. A feature means a coherent user/admin capability, not half a file. Examples:

- `feat(auth): add login and registration flow`
- `feat(user): add wallet dashboard`
- `feat(admin): approve deposit requests`

Before committing:

- Run typecheck/lint/build.
- Review `git diff`.
- Confirm no secrets or debug logs were added.
- Commit only project files, never unrelated parent-directory changes.

## Source Baseline

- Next.js stable package and blog: https://www.npmjs.com/package/next, https://nextjs.org/blog
- Next.js App Router docs: https://nextjs.org/docs/app
- React versions: https://react.dev/versions
- TypeScript package/blog: https://www.npmjs.com/package/typescript, https://devblogs.microsoft.com/typescript/
- Tailwind v4 notes: https://tailwindcss.com/blog/tailwindcss-v4, https://tailwindcss.com/blog/tailwindcss-v4-3
- shadcn/ui docs: https://ui.shadcn.com/docs
- Supabase SSR/Auth docs: https://supabase.com/docs/guides/auth/server-side, https://supabase.com/docs/guides/auth/choosing-a-server-package
- Supabase Prisma docs: https://supabase.com/docs/guides/database/prisma
- Prisma Next.js docs: https://www.prisma.io/docs/guides/next/frameworks/nextjs
- ImageKit Next SDK: https://imagekit.io/docs/integration/nextjs
