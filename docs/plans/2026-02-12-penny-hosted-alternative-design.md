# Penny - Hosted Alternative to Piggybank

**Date**: 2026-02-12
**Status**: Approved
**Author**: Joel Lewis + Claude

## Overview

Penny is a hosted, multi-tenant SaaS alternative to the self-hosted Piggybank app. It targets financially savvy parents who want a managed cloud solution for teaching children compound interest and money management. Hosted on Cloudflare's ecosystem for affordability and performance.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting platform | Cloudflare Pages + Workers | Affordable, serverless, global edge |
| User model | Multi-tenant SaaS | Single deployment serving all families |
| Authentication | better-auth + Google OAuth | Self-hosted auth in D1, Penny-branded login, no per-user cost, future-ready for magic links |
| Database | Cloudflare D1 (SQLite-compatible) | Existing SQL queries port directly |
| Frontend framework | SvelteKit 2 + Svelte 5 + Tailwind CSS 4 | Better fit for interactive dashboard (form actions, load functions, client-side routing) |
| Architecture | Full Cloudflare-Native (Approach A) | Single SvelteKit project, no separate backend server |
| Visual identity | Modern fintech + warm | Sophisticated yet family-oriented |

## Architecture

### Runtime Flow

```
User (Browser)
    ↓
Penny Login Page (/login)
    ↓  "Sign in with Google" → better-auth OAuth flow
    ↓  Session cookie set on callback
Cloudflare Pages (SvelteKit on Workers runtime)
    ├─ Auth: /api/auth/[...all]/+server.ts → better-auth handler
    ├─ Pages: /, /login, /dashboard, /account/[id], /settings
    ├─ Load functions: +page.server.ts (D1 queries via platform.env.DB)
    ├─ Form actions: +page.server.ts (deposits, withdrawals, CRUD)
    └─ Cron Triggers: Daily interest via protected API endpoint
    ↓
Cloudflare D1 (user, session, account [OAuth], verification,
              families, accounts, transactions)
```

### Project Structure

```
penny/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte         # Root layout
│   │   ├── +layout.server.ts      # Root load (session)
│   │   ├── +page.svelte           # Landing page
│   │   ├── login/+page.svelte     # Login page
│   │   ├── dashboard/
│   │   │   ├── +page.svelte       # Family dashboard
│   │   │   └── +page.server.ts    # Load accounts
│   │   ├── account/
│   │   │   ├── new/               # Create account (form action)
│   │   │   └── [id]/
│   │   │       ├── +page.svelte   # Account detail
│   │   │       ├── +page.server.ts # Load + form actions (deposit/withdraw/interest)
│   │   │       └── settings/      # Account settings (update/delete)
│   │   ├── settings/              # Global settings + sign-out
│   │   └── api/auth/[...all]/+server.ts  # better-auth catch-all
│   ├── lib/
│   │   ├── server/
│   │   │   ├── auth.ts            # better-auth server config (factory for D1)
│   │   │   ├── db.ts              # D1 query helpers
│   │   │   ├── validation.ts      # Input validation
│   │   │   └── interest.ts        # Interest calculator (ported)
│   │   ├── components/            # Svelte components
│   │   │   ├── AccountCard.svelte
│   │   │   ├── TransactionForm.svelte
│   │   │   ├── TransactionList.svelte
│   │   │   ├── Nav.svelte
│   │   │   └── Toast.svelte
│   │   ├── auth-client.ts         # better-auth Svelte client
│   │   └── utils.ts               # Shared utilities (cn, formatCurrency)
│   ├── app.html                   # HTML template
│   ├── app.css                    # Global styles + Tailwind
│   ├── app.d.ts                   # TypeScript declarations
│   └── hooks.server.ts            # Auth middleware
├── migrations/
│   └── 0001_initial.sql
├── svelte.config.js
├── vite.config.ts
├── wrangler.toml
├── package.json
└── CLAUDE.md
```

### Key Difference from Piggybank

No Express server. SvelteKit load functions and form actions handle all server logic with direct D1 bindings. Authentication is handled by better-auth (self-hosted in D1) with Google OAuth for MVP. Auth middleware runs in `hooks.server.ts`. Interest cron runs via a protected API endpoint triggered by Cloudflare Cron.

## Database Schema

### Multi-Tenancy Strategy

Row-level isolation via `family_id` on all tables. Single D1 database serves all tenants.

### Schema

better-auth manages 4 tables (`user`, `session`, `account`, `verification`). The app adds 3 tables (`families`, `accounts`, `transactions`). The `user` table has an `additionalFields` column `familyId` linking to `families`.

```sql
-- better-auth managed tables (created via better-auth CLI/migrations)
-- user: id, name, email, emailVerified, image, familyId (FK→families), createdAt, updatedAt
-- session: id, userId (FK→user), token, expiresAt, ipAddress, userAgent, createdAt, updatedAt
-- account: id, userId (FK→user), accountId, providerId, accessToken, refreshToken, ..., createdAt, updatedAt
-- verification: id, identifier, value, expiresAt, createdAt, updatedAt

-- App tables
CREATE TABLE families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  balance REAL DEFAULT 0,
  interest_rate REAL DEFAULT 0.05,
  compounding_period TEXT DEFAULT 'monthly',
  last_interest_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  UNIQUE(family_id, name)
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  family_id TEXT NOT NULL REFERENCES families(id),
  type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal','interest')),
  category TEXT,
  amount REAL NOT NULL CHECK(amount > 0),
  balance_after REAL NOT NULL,
  note TEXT,
  transaction_date TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX idx_accounts_family ON accounts(family_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_family ON transactions(family_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
```

### Auth Flow

1. User visits `/login` and clicks "Sign in with Google"
2. better-auth client calls `authClient.signIn.social({ provider: "google" })`
3. Redirects to Google OAuth consent screen
4. Google redirects back to `/api/auth/callback/google`
5. better-auth creates/updates `user` + `account` rows, creates `session`
6. On first sign-up, a `databaseHook` auto-creates a `family` and sets `user.familyId`
7. Session cookie (`better-auth.session_token`) is set
8. SvelteKit `hooks.server.ts` calls `auth.api.getSession()`, attaches `user` (with `familyId`) to `event.locals`
9. All DB queries filter by `familyId`

## Branding & Visual Identity

### Name & Tagline

**Penny** - *"Where smart money habits start small."*

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Copper | `#C17F59` | Primary brand, CTAs, logo accent |
| Deep Teal | `#1A5C5E` | Headings, navigation, trust |
| Warm Cream | `#FAF7F2` | Page backgrounds |
| Charcoal | `#2D2D2D` | Body text |
| Sage | `#6B9E8A` | Deposits, positive indicators |
| Dusty Rose | `#C4727F` | Withdrawals, alerts |
| Soft Gold | `#D4A843` | Interest, rewards, highlights |
| Cloud | `#FFFFFF` | Cards, elevated surfaces |

### Typography

- **Headings**: Plus Jakarta Sans (Google Fonts)
- **Body**: Same family at lighter weights
- **Numbers/Money**: Tabular figures, heavier weight

### Visual Distinctions from Piggybank

| Element | Piggybank | Penny |
|---------|-----------|-------|
| Background | Cool slate | Warm cream |
| Primary color | Indigo | Copper + Deep Teal |
| Card style | White, rounded-3xl, borders | White, rounded-2xl, shadows, no borders |
| Typography | System font, heavy | DM Sans, varied weights |
| Tone | Playful, kid-focused | Sophisticated, parent-focused |
| Navigation | Top bar | Side nav (desktop), bottom nav (mobile) |
| Data density | Large cards, spacious | Tighter, dashboard feel |
| Logo | "PIGGYBANK" uppercase | "penny" lowercase |

## MVP Scope (v0.1)

1. **Authentication**: better-auth with Google OAuth. Penny-branded login page. Family auto-created on first sign-up via database hook.
2. **Family Dashboard**: Overview of all children's accounts with balances.
3. **Account Management**: Create/edit/soft-delete child accounts.
4. **Transactions**: Deposits, withdrawals with categories. Immutable ledger.
5. **Compound Interest**: Same engine as piggybank via Cloudflare Cron Trigger + manual button.
6. **Transaction History**: Filtered/sorted/paginated ledger per account.
7. **Landing Page**: Marketing page with value prop and sign-in CTA.

## Post-MVP Roadmap

| Feature | Priority | Notes |
|---------|----------|-------|
| Savings goals with progress tracking | High | Visual progress bars per goal |
| Recurring transactions (auto-allowance) | High | Weekly/monthly auto-deposits |
| Charts & insights | Medium | Balance over time, spending by category |
| Email magic links | High | Passwordless alternative to Google OAuth |
| Apple Sign-In | Medium | Second OAuth provider |
| Parent PIN for withdrawals | Medium | Port from piggybank prototype |
| Multiple parents per family | Low | Invite system |
| Export (CSV/PDF) | Low | Statement generation |
| Notifications | Low | Email alerts for milestones |

## Port vs. Rewrite Strategy

| Component | Strategy |
|-----------|----------|
| Interest calculator logic | Port directly |
| Transaction validation | Port, adapt to Astro middleware |
| SQL queries | Adapt - add family_id, D1 syntax |
| React components | Rewrite as Svelte 5 components with new design system |
| Express routes | Rewrite as SvelteKit load functions + form actions |
| Database init/migrations | Rewrite for D1 |
| Docker setup | Drop (Cloudflare deployment) |
| Cron job | Rewrite as protected API endpoint + Cloudflare Cron Trigger |
