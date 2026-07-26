# Tailwind CSS v4 Rules

Use Tailwind CSS v4, not v3 habits.

## Setup

Tailwind v4 is CSS-first:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

Use `@theme` / `@theme inline` in CSS for design tokens. Do not start by creating a large old-style `tailwind.config.js` unless a specific legacy plugin requires it.

## Token Rules

Define brand tokens once:

- background
- foreground
- card
- card-foreground
- primary
- primary-foreground
- success
- warning
- danger
- border
- ring
- chart colors
- dashboard glow colors

Use OKLCH/HSL token style consistent with shadcn Tailwind v4.

## Utility Rules

- Prefer `size-*` for equal width/height icons and buttons.
- Use logical sizing/spacing where useful.
- Use `bg-linear-*`, `bg-radial-*`, `bg-conic-*` v4 naming.
- Do not rely on old `bg-gradient-*` habits for new gradient APIs.
- Use container queries for cards/tables where viewport breakpoints are too blunt.
- Use stable dimensions for cards, nav bars, ring charts, and icon tiles.
- Avoid one-color-theme monotony; the Nature Power dashboard uses black, green, gold, cyan/blue, and muted purple/pink accents.

## App Visual Rules

- Match screenshots: dark dashboard, neon green/gold accents, compact cards, bottom nav.
- Keep text readable on dark backgrounds.
- Do not put dashboard sections into marketing-style hero layouts.
- No decorative gradient blobs/orbs. If particles are used, keep them subtle and non-blocking.
- Tables must not overflow the viewport without a controlled horizontal scroll area.
- Buttons must not resize on loading state.
- Use consistent spacing scale across all dashboard pages.

## Responsive Rules

- Design mobile first for login/register and dashboard cards.
- For desktop, keep max content width close to screenshot proportions.
- Bottom nav must remain fixed, usable, and not cover content. Add bottom padding to pages.
- Large data tables need:
  - sticky or repeated context where useful
  - horizontal scroll
  - readable empty state

Official references:

- Tailwind v4.0: https://tailwindcss.com/blog/tailwindcss-v4
- Tailwind v4.3: https://tailwindcss.com/blog/tailwindcss-v4-3
- Directives and `@theme`: https://tailwindcss.com/docs/functions-and-directives
- shadcn Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4
