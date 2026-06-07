# Plan: Full Trading Platform Expansion

Enable Lovable Cloud + persist data per user, with a hamburger drawer for navigation.

## 1. Backend (Lovable Cloud)
- Enable Cloud (Supabase under the hood).
- Tables (all RLS, scoped to `auth.uid()`):
  - `profiles` — display name, avatar, 2FA enabled flag, active_account ('real'|'demo')
  - `accounts` — one real + one demo per user, balance, currency
  - `trades` — account_id, symbol, side, qty, price, pnl, status, created_at
  - `transactions` — account_id, type (deposit/withdraw), method, amount, status, created_at
  - `price_alerts` — symbol, condition (above/below), target_price, active
  - `support_tickets` — subject, message, status, created_at
  - `notifications` — title, body, type, read
- Trigger: on signup → create profile + real + demo account (demo seeded with $10,000 virtual).

## 2. Auth pages
- `/auth` route: tabbed Sign In / Sign Up (email + password, strong validation via zod).
- Google sign-in via Lovable broker.
- `_authenticated` subtree for everything else.
- On sign-in: redirect to `/` (trade screen).

## 3. Navigation
- Header hamburger → side `Sheet` drawer with sections:
  Trade · History · Cashier · Reports · Alerts · Support · Education · Security (2FA) · Sign out.
- Top of drawer: avatar, email, **Real ↔ Demo account toggle** (Switch).
- Active-account badge in header next to portfolio value.

## 4. Account toggle (Real/Demo)
- Stored on profile (`active_account`).
- Trade screen reads balance from the active account; Buy/Sell writes trades to that account.
- Demo trades clearly badged "DEMO".

## 5. Trading history (`/history`)
- Table: time, symbol, side, qty, price, P&L, status. Filters: account, side, symbol, date range.

## 6. Cashier (`/cashier`)
- Tabs: Deposit (re-uses existing `DepositSheet` form) / Withdraw (bank/crypto/mobile money).
- Transactions list below with status pills.
- Withdrawals on demo account are disabled with explainer.

## 7. Reports (`/reports`)
- Cards: total volume, net P&L, win rate, best/worst trade, deposit/withdraw totals.
- Period selector (7d/30d/90d/all). Simple bar chart of daily P&L.

## 8. Price alerts (`/alerts`)
- Create alert form (symbol, above/below, price). List of active alerts.
- Toast notification when current live price crosses threshold (client-side polling against the existing live candles).
- Bell icon in header shows unread count from `notifications`.

## 9. Support (`/support`)
- Contact form (subject, category, message) → inserts `support_tickets`.
- List of user's previous tickets with status.

## 10. Security / 2FA (`/security`)
- Enable TOTP via Supabase `mfa.enroll` (QR + verify 6-digit code).
- List enrolled factors, allow unenroll.
- Change password.

## 11. Education (`/education`)
- Static curated content: 6 cards (Candlestick basics, Risk management, Order types, Reading volume, Crypto wallets 101, Avoiding scams).
- Each opens a detail page with markdown-style article.

## 12. Bug fix (quiet)
- Fix SSR hydration mismatch on price text: seed candles deterministically and gate live drift behind `useEffect`/client mount.

## Technical notes
- All data reads/writes via `createServerFn` with `requireSupabaseAuth`.
- Use existing dark theme tokens; no new color system.
- Mobile-first; drawer uses `Sheet` from shadcn.
- Keep the existing `CandlestickChart` and `DepositSheet`; wire Buy/Sell to insert trade rows.

Scope is large — I'll ship it in one pass and call out anything stubbed.
