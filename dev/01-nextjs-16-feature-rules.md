# Next.js 16 Feature Rules

Use Next.js `16.2.12` stable, not canary/preview. App Router only.

## Routing

- Use `src/app`.
- Use route groups for layout separation:
  - `(public)` for landing/login/register.
  - `(user)` for authenticated user dashboard.
  - `(admin)` for admin panel.
- Do not use `pages/`.
- Use `loading.tsx`, `error.tsx`, and `not-found.tsx` where flows need clear states.
- Use `route.ts` only for API/webhook endpoints. Prefer Server Actions for form mutations.

## Server and Client Components

Default to Server Components. Add `"use client"` only when the component needs:

- local interactive state
- event handlers
- browser APIs
- React Hook Form
- charts/carousels that require client JavaScript

Keep client boundaries small. A table shell can be server-rendered, while a tab switcher or copy button can be a small Client Component.

Use `server-only` for modules that touch:

- Prisma
- Supabase server clients
- auth/session verification
- financial calculations
- admin authorization
- secrets/env

## Fetching and Caching

For this app, most user/admin data is request-specific and financial. Default it to dynamic/no-cache unless explicitly safe.

Use:

- Server Components for read queries close to the database.
- `connection()` when a page must always wait for request-time rendering.
- Cache only safe reference data: public landing content, static settings labels, countries, non-sensitive app config.
- Do not cache user balances, pending requests, session data, admin tables, or income ledgers globally.
- If cache is used, tag it narrowly and invalidate after mutations.

Use Next.js cache APIs carefully:

- `revalidateTag(tag, "max")` for stale-while-revalidate public/reference data.
- `updateTag` for user-facing changes that must refresh immediately after mutation.
- `refresh()` from Server Actions when the current route needs refreshed data after a mutation.
- Do not call cache invalidation from rendering.

## Mutations

Use Server Actions for:

- login/register forms
- profile update
- password/MPIN change
- invest/activation request
- withdrawal request
- admin approve/reject flows

Use Route Handlers for:

- ImageKit auth/upload token endpoints
- scheduled ROI job endpoint if needed
- external webhook callbacks
- health checks

Every Server Action and Route Handler must:

- verify session
- verify role
- validate input with Zod or equivalent server schema
- return a typed action result
- avoid leaking stack traces to the client
- write audit records for admin/financial changes

## Forms

Use React 19/Next Server Action patterns:

- `<form action={serverAction}>` where progressive enhancement is useful.
- `useActionState` for pending/error/success state in client forms.
- `useFormStatus` for submit buttons inside forms.
- React Hook Form + shadcn Field + Zod for complex forms.

Never depend on browser validation alone.

## Images

Use:

- `next/image` for local logo/static screenshots in `public`.
- `@imagekit/next` for hosted media and optimized uploaded assets.

Always set:

- meaningful `alt`
- `width`/`height` or `fill` with stable parent dimensions
- `sizes` for responsive images
- eager loading only for real LCP images

## Security Headers

Add security headers in Next config/proxy where compatible:

- Content Security Policy
- `X-Frame-Options` or CSP `frame-ancestors`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

CSP needs to account for ImageKit, Supabase, and any chart/icon/font providers. Prefer self-hosted assets where practical.

Official references:

- Project structure: https://nextjs.org/docs/app/getting-started/project-structure
- Server/client components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Forms/actions: https://nextjs.org/docs/app/guides/forms
- Updating data: https://nextjs.org/docs/app/getting-started/updating-data
- Route handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Data security: https://nextjs.org/docs/app/guides/data-security
- CSP: https://nextjs.org/docs/app/guides/content-security-policy
- Image optimization: https://nextjs.org/docs/app/getting-started/images
- Version 16 upgrade notes: https://nextjs.org/docs/app/guides/upgrading/version-16
