# shadcn/ui Component Plan

Use shadcn/ui instead of hand-rolling common accessible primitives. New projects use Tailwind v4, React 19, OKLCH tokens, and `new-york` style.

## CLI Rules

Initialize after Next app exists:

```powershell
npx shadcn@latest init
```

Use shadcn CLI to add components, not copy old snippets from memory.

Install only what we need. For overwrite/update operations, commit first.

## Required Components

Core:

- `button`
- `card`
- `input`
- `label`
- `field`
- `select`
- `checkbox`
- `textarea`
- `separator`
- `badge`
- `avatar`
- `tabs`
- `table`
- `dialog`
- `alert-dialog`
- `sheet`
- `dropdown-menu`
- `tooltip`
- `sonner`
- `skeleton`
- `scroll-area`
- `progress`
- `calendar` only if needed for admin filters
- `popover` only if needed for date/filter controls

Forms:

- `field`
- `input`
- `select`
- `checkbox`
- React Hook Form
- Zod resolver

Charts:

- shadcn chart wrapper with Recharts if we need portfolio rings/graphs.
- For circular portfolio cards, prefer lightweight CSS/SVG components if Recharts is overkill.

Tables:

- Start with shadcn `table`.
- Add TanStack Table only if sorting/filtering/pagination becomes real, not for static simple ledgers.

Feedback:

- Custom modal wrapper around `dialog`/`alert-dialog`.
- `sonner` for non-blocking success/error toasts.
- No browser `alert()`.

## Project-Specific UI Components

Build these on top of shadcn primitives:

- `AppShell`
- `PublicHeader`
- `DashboardHeader`
- `BottomNav`
- `MetricCard`
- `WalletBalanceCard`
- `ReferralCard`
- `ShortcutGrid`
- `LedgerTable`
- `StatusBadge`
- `CopyField`
- `SecurityModal`
- `ConfirmActionDialog`
- `EmptyState`
- `PageHeader`
- `UserAvatarCard`
- `NetworkBadge`
- `AmountDisplay`

## Styling Rules

- Use Tailwind v4 tokens in `globals.css`.
- Use CSS variables for brand colors, not repeated arbitrary hex values.
- Use lucide icons where possible.
- Keep cards at 8px radius unless screenshot matching needs slightly larger panels.
- Use stable dimensions for bottom nav, icon tiles, cards, and tables to prevent layout shift.
- Do not create nested cards.
- Do not use oversized marketing hero patterns inside the app dashboard.
- Mobile must be designed, not incidental. Tables need horizontal scroll or responsive row layout.

Official references:

- shadcn CLI: https://ui.shadcn.com/docs/cli
- Tailwind v4 support: https://ui.shadcn.com/docs/tailwind-v4
- React Hook Form + Zod: https://ui.shadcn.com/docs/forms/react-hook-form
- Chart component: https://ui.shadcn.com/docs/components/chart
