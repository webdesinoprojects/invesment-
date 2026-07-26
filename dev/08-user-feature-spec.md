# User Feature Spec

This file captures the user-side logic agreed from screenshots and discussion.

## Public Auth

Login:

- Login ID
- password
- remember me
- forgot password
- register link

Register:

- invite ID
- referrer name
- full name
- email
- country
- mobile
- password
- repeat password
- security pin / MPIN

Referral register URL:

```text
/register?ref=NP333130
```

Registration through ref fills invite/referrer details. If sponsor is not eligible/active, show custom modal with the referral restriction message.

## Dashboard

Cards:

- wallet balance
- deposit/withdraw buttons
- referral program card
- team members
- level income
- direct income
- rewards
- referral link copy
- shortcut cards: invest, team, earnings, deposit, withdraw, rewards
- investment carousel
- portfolio overview rings

## Deposit

- Deposit USDT page.
- BEP-20/BSC badge.
- QR code.
- recipient address and copy.
- latest verified transaction table.
- no automatic client-side credit.
- admin verifies/credits deposit manually.

## Withdrawal

- Allowed only on day `1` and `16`.
- If not allowed, custom modal: `Withdraw opens on only 1st & 16th of every month !`
- Form fields:
  - USDT BEP20 wallet address
  - amount
  - security pin
- User request creates pending withdrawal and holds funds.
- Admin approves/rejects.

## Invest / Activation

- User can activate/invest from wallet balance where applicable.
- Admin can also activate manually/offline.
- Fields:
  - member ID
  - member name
  - amount
  - security pin
- Ledger below.
- Investment can be any configured allowed amount.
- Each investment has 8% monthly ROI, daily split, for 25 months / 200% cap.

## Team

Four tabs:

- All Team
- Topup Id
- Today Topup Id
- Direct

Summary:

- direct team count
- total downline count

Tables match screenshot columns. Empty tabs show clean empty state or custom no-data modal depending flow.

## Earnings

Four tabs:

- Daily ROI
- Referral
- Level Income
- Rank Rewards

Daily ROI:

- own daily ROI split records.

Referral:

- direct 1% commission records.

Level Income:

- 0.25% chain commission records with member ID and level.

Rank Rewards:

- reward records if present.
- if no records, show custom message: `Income does not exist.!`

## History

Three tabs:

- Main Wallet
- Withdraw History
- Deposit History

Main Wallet columns:

- S.No.
- Date
- Credit ($)
- Debit ($)
- Deduction ($)
- Description

Withdraw/deposit history:

- request logs.
- if none, show `No Data found` in custom UI.

## Assets

Aggregate snapshot:

- main wallet balance
- active investment
- daily ROI
- direct income
- level income
- rank income
- salary income
- total withdraw

## Profile

User can view:

- sponsor ID
- sponsor name
- full name
- email
- mobile
- country
- USDT BEP-20 wallet address

User can edit:

- USDT BEP-20 wallet address
- password
- MPIN/security pin

Admin can edit/override broader fields.

## Logout

- Clears session.
- Routes back to login page.
- Dashboard shell disappears.

## Custom Feedback

No browser alerts. Use:

- blocking dialog for restricted actions
- toast for copy/success
- inline errors for forms
- empty states for no records
