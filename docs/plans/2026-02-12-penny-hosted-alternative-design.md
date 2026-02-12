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
| Authentication | Cloudflare Access + Google OAuth | Zero custom auth code, secure by default |
| Database | Cloudflare D1 (SQLite-compatible) | Existing SQL queries port directly |
| Frontend framework | Astro + React + Tailwind | Reuse piggybank stack, first-class CF Pages support |
| Architecture | Full Cloudflare-Native (Approach A) | Single Astro project, no separate backend server |
| Visual identity | Modern fintech + warm | Sophisticated yet family-oriented |

## Architecture

### Runtime Flow

```
User (Browser)
    ↓
Cloudflare Access (Google OAuth)
    ↓  (JWT via CF_Authorization cookie)
Cloudflare Pages (Astro SSR on Workers runtime)
    ├─ Pages: /, /dashboard, /account/[id], /settings
    ├─ API Endpoints: /api/accounts, /api/transactions, etc.
    │   └─ Direct D1 bindings (env.DB.prepare(...))
    ├─ KV: Session data, rate limiting
    └─ Cron Triggers: Daily interest calculation
    ↓
Cloudflare D1 (SQLite-compatible)
```

### Project Structure

```
penny/
├── src/
│   ├── components/          # React components
│   │   ├── AccountCard.tsx
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionList.tsx
│   │   └── ui/             # Shared UI primitives
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro      # Landing/marketing page
│   │   ├── dashboard.astro  # Authenticated family dashboard
│   │   ├── account/[id].astro
│   │   └── api/             # Server endpoints (replace Express)
│   │       ├── accounts/[...path].ts
│   │       └── transactions/[...path].ts
│   ├── lib/
│   │   ├── db.ts            # D1 query helpers
│   │   ├── auth.ts          # CF Access JWT verification
│   │   └── interest.ts      # Interest calculator (ported)
│   └── styles/
│       └── global.css
├── migrations/               # D1 schema migrations
│   └── 0001_initial.sql
├── astro.config.mjs
├── wrangler.toml             # CF Workers/D1/KV bindings
├── tailwind.config.mjs
├── package.json
└── CLAUDE.md
```

### Key Difference from Piggybank

No Express server. Astro server endpoints handle all API logic with direct D1 bindings. Interest cron runs as a Cloudflare Cron Trigger instead of node-cron.

## Database Schema

### Multi-Tenancy Strategy

Row-level isolation via `family_id` on all tables. Single D1 database serves all tenants.

### Schema

```sql
CREATE TABLE families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL UNIQUE,
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

1. User hits any authenticated page
2. Cloudflare Access intercepts, redirects to OAuth if no valid session
3. Access sets a `CF_Authorization` JWT cookie
4. Astro middleware verifies JWT, extracts email
5. Looks up or creates family record by email
6. Attaches `family_id` to request context (`Astro.locals.family`)
7. All DB queries filter by `family_id`

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

- **Headings**: DM Sans or Plus Jakarta Sans (Google Fonts)
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

1. **Authentication**: Cloudflare Access with Google OAuth. Family auto-created on first login.
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
| React components | Rewrite with new design system |
| Express routes | Rewrite as Astro server endpoints |
| Database init/migrations | Rewrite for D1 |
| Docker setup | Drop (Cloudflare deployment) |
| Cron job | Rewrite as Cloudflare Cron Trigger |
