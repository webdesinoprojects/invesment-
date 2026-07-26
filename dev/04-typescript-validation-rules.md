# TypeScript and Validation Rules

Use strict TypeScript as a correctness tool, not decoration.

## TypeScript Baseline

Use TypeScript `7.0.2` stable if the dependency graph supports it. If Next/shadcn tooling requires a lower range, pin the newest compatible stable release and document why.

Keep strict settings:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noUncheckedSideEffectImports`
- `isolatedModules`
- `verbatimModuleSyntax`
- `moduleDetection: "force"`

Do not loosen strictness to make errors disappear.

## Type Placement

Types live near the domain:

```text
features/wallet/types/wallet.ts
features/investment/types/investment.ts
features/referral/types/referral.ts
types/common.ts
types/money.ts
```

Use global `types/` only for shared cross-domain primitives.

## Validation

Use Zod for:

- login/register input
- profile update
- password change
- MPIN change
- withdrawal request
- investment/activation request
- admin approve/reject forms
- route handler JSON bodies
- env validation

Validation must run on the server. Client validation is for UX only.

Pattern:

```text
schema.ts -> action.ts -> service.ts -> query/db
```

The action parses untrusted input before calling service logic.

## Action Result Type

Server Actions should return a predictable shape:

```ts
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };
```

Do not throw raw errors to the UI for expected validation/business failures.

## Money Types

Never use floating point for stored money.

Recommended internal representation:

- store integer minor units or Decimal in database
- calculate with Decimal library or database decimal
- format only at the UI boundary

Examples:

- `amountUsd`
- `amountMinor`
- `MoneyAmount`
- `formatMoney(amount, "USD")`

Avoid ambiguous names like `amount` unless the type makes units clear.

## Exhaustiveness

Use discriminated unions for statuses:

```ts
type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED";
```

Use exhaustive switch checks for financial status handling. Unknown status should fail loudly in development and safely in production.

## No Unsafe Escapes

Avoid:

- `any`
- `as any`
- broad `Record<string, any>`
- non-null assertion `!` unless the invariant is obvious and local
- accepting database rows as UI-safe data without mapping

Official references:

- TypeScript latest package: https://www.npmjs.com/package/typescript
- TypeScript release notes/blog: https://devblogs.microsoft.com/typescript/
- TypeScript 5.9 strict init reference: https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/
- shadcn form validation: https://ui.shadcn.com/docs/forms/react-hook-form
