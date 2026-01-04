# Sample PRD and TRD

# Piggybank App - Product Requirements Document

## 1. Product Overview

### 1.1 Purpose

A self-hosted digital piggybank application that allows parents to manage virtual bank accounts for their children, teaching financial concepts like saving, interest, and transaction history through a simple, lightweight interface.

### 1.2 Target Users

- **Primary Users**: Parents/guardians managing children's allowances and savings
- **Secondary Users**: Children viewing their account balances and transaction history

### 1.3 Core Value Proposition

Provides a practical, hands-on tool for teaching children about money management, compound interest, and financial responsibility without requiring actual bank accounts or third-party services.

------

## 2. Technical Architecture

### 2.1 Technology Stack

- **Frontend**: Astro (static site generation with minimal JavaScript)
- **Styling**: Plain CSS or Tailwind CSS (no heavy frameworks)
- **Backend**: Node.js with Express (lightweight API)
- **Database**: SQLite (single-file, zero-configuration)
- **Deployment**: Docker container for easy self-hosting

**Rationale**: This stack minimizes complexity, eliminates build complexity from Svelte, and provides easy deployment to your Proxmox homelab.

### 2.2 Architecture Pattern

- Server-side rendered pages with Astro
- RESTful API for transaction management
- SQLite for data persistence
- Scheduled jobs for interest calculation (cron or node-cron)

------

## 3. Functional Requirements

### 3.1 Account Management

#### 3.1.1 Create Child Account

- **Input Fields**:
  - Child's name (required, string, max 50 chars)
  - Initial balance (optional, decimal, default $0.00)
  - Interest rate (optional, percentage, default 0%)
  - Compounding period (optional, enum: daily/weekly/monthly/quarterly/annually, default monthly)
  - Account creation date (auto-generated)
- **Validation**:
  - Name must be unique per household
  - Interest rate between 0% and 100%
  - Initial balance >= $0.00

#### 3.1.2 Edit Account Settings

- Modify interest rate
- Change compounding period
- Update child's name
- **Cannot** modify account creation date or historical transactions

#### 3.1.3 Delete Account

- Soft delete (archive) with confirmation prompt
- Preserve transaction history for record-keeping

### 3.2 Transaction Management

#### 3.2.1 Add Deposit

- **Input Fields**:
  - Amount (required, decimal, > $0.00)
  - Category (enum: "Allowance", "Tooth Fairy", "Gift", "Chore", "Other")
  - Date (optional, defaults to current date/time)
  - Note (optional, string, max 200 chars)
- **Business Logic**:
  - Immediately increase account balance
  - Create transaction record

#### 3.2.2 Add Withdrawal

- **Input Fields**:
  - Amount (required, decimal, > $0.00)
  - Category (enum: "Toy", "Candy", "Savings Goal", "Other")
  - Date (optional, defaults to current date/time)
  - Note (optional, string, max 200 chars)
- **Business Logic**:
  - Check sufficient balance (prevent negative balances)
  - Immediately decrease account balance
  - Create transaction record
- **Validation**:
  - Withdrawal amount <= current balance
  - Show clear error if insufficient funds

#### 3.2.3 Edit Transaction

- Allow editing amount, category, note, and date
- **Cannot** change transaction type (deposit ↔ withdrawal)
- Recalculate account balance based on edited amount
- Show warning if edit would result in historical negative balance

#### 3.2.4 Delete Transaction

- Soft delete with confirmation
- Recalculate current balance
- Flag as deleted rather than removing from database

### 3.3 Interest Calculation

#### 3.3.1 Automated Interest Payments

- **Trigger**: Scheduled job runs daily (checks if compounding period has elapsed)
- **Calculation**:
  - Simple interest: `Interest = Principal × Rate × (Time / Compounding Period)`
  - Compound interest formula: `A = P(1 + r/n)^(nt)` where:
    - P = principal balance
    - r = annual interest rate (decimal)
    - n = number of times interest compounds per year
    - t = time in years since last compounding
- **Business Logic**:
  - Calculate interest based on current balance and time since last interest payment
  - Create interest payment transaction (category: "Interest")
  - Update last interest payment date
  - Only apply if balance > $0.00

#### 3.3.2 Manual Interest Calculation Override

- Allow parent to manually trigger interest calculation
- Useful for demonstrating concepts or correcting issues

### 3.4 Transaction History & Reporting

#### 3.4.1 Transaction List View

- **Display Fields**:
  - Date/time
  - Transaction type (Deposit/Withdrawal/Interest)
  - Category
  - Amount (with +/- indicator)
  - Running balance after transaction
  - Note (if present)
- **Sorting & Filtering**:
  - Default: Most recent first (descending date)
  - Filter by transaction type
  - Filter by date range
  - Filter by category

#### 3.4.2 Account Summary View

- Current balance (prominent display)
- Total deposits (all-time)
- Total withdrawals (all-time)
- Total interest earned (all-time)
- Account age (days/months since creation)
- Next interest payment date

------

## 4. User Interface Requirements

### 4.1 Parent Dashboard (Home Page)

**Route**: `/`

**Components**:

1. **Account Cards** (grid layout, one per child):
   - Child's name
   - Current balance (large, prominent)
   - Interest rate display
   - "View Details" button
   - "Quick Transaction" buttons (+ Deposit / - Withdrawal)
2. **Quick Actions**:
   - "Create New Account" button
   - "Settings" link

### 4.2 Child Account Detail Page

**Route**: `/account/[childId]`

**Sections**:

1. **Header**:
   - Child's name
   - Current balance
   - Edit account settings button
2. **Transaction Form** (always visible):
   - Transaction type toggle (Deposit/Withdrawal)
   - Amount input
   - Category dropdown
   - Note textarea
   - Submit button
3. **Account Statistics**:
   - Next interest payment date and amount preview
   - Total deposits/withdrawals/interest metrics
4. **Transaction History Table**:
   - Paginated list (20 per page)
   - Inline edit/delete actions
   - Export to CSV button

### 4.3 Account Settings Page

**Route**: `/account/[childId]/settings`

**Form Fields**:

- Child's name
- Interest rate (with percentage display)
- Compounding period dropdown
- Save/Cancel buttons
- Danger zone: Delete account button

### 4.4 Global Settings Page

**Route**: `/settings`

**Configuration**:

- Currency symbol (default: $)
- Date format preference
- Parent PIN/password for protected actions (optional v2 feature)
- Data export (full database backup)

------

## 5. Data Model

### 5.1 Database Schema

```sql
-- Accounts table
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
  compounding_period TEXT NOT NULL DEFAULT 'monthly',
  last_interest_date DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Transactions table
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'interest'
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  note TEXT,
  transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (account_id) REFERENCES accounts (id)
);

-- Indexes
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
```

### 5.2 API Endpoints

#### Accounts

- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account settings
- `DELETE /api/accounts/:id` - Soft delete account

#### Transactions

- `GET /api/accounts/:id/transactions` - List transactions for account
- `POST /api/accounts/:id/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Soft delete transaction

#### Interest

- `POST /api/accounts/:id/calculate-interest` - Manually trigger interest calculation

------

## 6. Non-Functional Requirements

### 6.1 Performance

- Page load time < 1 second on local network
- Transaction submission response < 500ms
- Support up to 10 accounts with 1000 transactions each

### 6.2 Security

- Self-hosted only (no external access by default)
- Optional: Basic auth for accessing the app
- Input validation on all forms
- SQL injection prevention (parameterized queries)

### 6.3 Reliability

- Automated database backups (daily)
- Transaction atomicity (all-or-nothing)
- Data validation before saving

### 6.4 Usability

- Mobile-responsive design
- Child-friendly balance display (large fonts, simple colors)
- Clear error messages
- Confirmation dialogs for destructive actions

------

## 7. MVP Scope & Future Enhancements

### 7.1 MVP (Version 1.0)

**In Scope**:

- ✅ Create/edit/delete child accounts
- ✅ Add deposits and withdrawals
- ✅ Automated interest calculation
- ✅ Transaction history view
- ✅ Basic account statistics
- ✅ Single-file SQLite database
- ✅ Docker deployment

**Out of Scope**:

- ❌ User authentication (assume trusted local network)
- ❌ Savings goals tracking
- ❌ Chore assignment integration
- ❌ Multiple currency support
- ❌ Mobile apps

### 7.2 Future Enhancements (Post-MVP)

1. **Savings Goals**: Set targets (e.g., "Save $50 for a bike") with progress tracking
2. **Parent PIN Protection**: Require PIN for withdrawals/settings changes
3. **Child-Friendly View**: Simplified read-only view for kids to check their balance
4. **Chore Management**: Link completed chores to automatic allowance deposits
5. **Transaction Categories**: Customizable categories beyond defaults
6. **Interest Visualization**: Chart showing balance growth over time
7. **Multi-User Support**: Separate parent accounts managing different children
8. **Export/Import**: CSV/JSON export for record-keeping

------

## 8. Success Metrics

### 8.1 User Engagement

- Frequency of transactions (target: 2+ per child per week)
- Interest payment consistency (automated, no missed payments)

### 8.2 Educational Impact (Qualitative)

- Children's understanding of interest concepts
- Improved saving behavior (decreasing withdrawal frequency)

### 8.3 Technical Health

- Zero data loss incidents
- 99.9% uptime (self-hosted)
- < 5 minutes to deploy updates

------

# Technical Design Document (TDD)

## 1. System Architecture

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────┐
│              Reverse Proxy (Caddy)              │
│          piggybank.yourhomelab.local            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│          Astro Frontend (Static SSR)            │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │   Pages   │  │  Layouts │  │  Components  │ │
│  │  (routes) │  │          │  │  (minimal)   │ │
│  └───────────┘  └──────────┘  └──────────────┘ │
└─────────────────┬───────────────────────────────┘
                  │ HTTP/REST
                  ▼
┌─────────────────────────────────────────────────┐
│       Node.js + Express API Server              │
│  ┌────────────┐  ┌─────────────────────────┐   │
│  │  Routes    │  │  Business Logic         │   │
│  │  Handlers  │  │  - Interest Calculator  │   │
│  │            │  │  - Transaction Manager  │   │
│  └────────────┘  └─────────────────────────┘   │
└─────────────────┬───────────────────────────────┘
                  │ SQL Queries
                  ▼
┌─────────────────────────────────────────────────┐
│              SQLite Database                    │
│               piggybank.db                      │
└─────────────────────────────────────────────────┘
                  ▲
                  │ Scheduled Jobs
┌─────────────────┴───────────────────────────────┐
│          node-cron Scheduler                    │
│        (Daily Interest Calculation)             │
└─────────────────────────────────────────────────┘
```

### 1.2 Directory Structure

```
piggybank/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── astro.config.mjs
├── tsconfig.json
│
├── frontend/                    # Astro frontend
│   ├── public/
│   │   ├── favicon.svg
│   │   └── global.css
│   ├── src/
│   │   ├── layouts/
│   │   │   └── BaseLayout.astro
│   │   ├── components/
│   │   │   ├── AccountCard.astro
│   │   │   ├── TransactionForm.astro
│   │   │   └── TransactionList.astro
│   │   ├── pages/
│   │   │   ├── index.astro          # Dashboard
│   │   │   ├── account/
│   │   │   │   └── [id].astro       # Account detail
│   │   │   └── settings.astro
│   │   └── utils/
│   │       ├── api.ts               # API client
│   │       └── formatters.ts        # Date/currency formatting
│
├── backend/                     # Express API
│   ├── server.js                # Entry point
│   ├── database/
│   │   ├── schema.sql
│   │   ├── db.js                # SQLite connection
│   │   └── migrations/
│   ├── routes/
│   │   ├── accounts.js
│   │   ├── transactions.js
│   │   └── interest.js
│   ├── services/
│   │   ├── interestCalculator.js
│   │   ├── transactionManager.js
│   │   └── accountManager.js
│   ├── middleware/
│   │   ├── validation.js
│   │   └── errorHandler.js
│   └── jobs/
│       └── dailyInterest.js     # Cron job
│
└── data/
    └── piggybank.db             # SQLite database file
```

------

## 2. Frontend Implementation (Astro)

### 2.1 Astro Configuration

**astro.config.mjs**:

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server', // SSR for API calls
  server: {
    port: 3000,
    host: true
  }
});
```

### 2.2 Page Components

#### 2.2.1 Dashboard (index.astro)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import AccountCard from '../components/AccountCard.astro';
import { getAccounts } from '../utils/api';

const accounts = await getAccounts();
---

<BaseLayout title="Piggybank - Dashboard">
  <div class="dashboard">
    <header>
      <h1>Family Piggybank</h1>
      <a href="/account/new" class="btn-primary">+ Create Account</a>
    </header>
    
    <div class="account-grid">
      {accounts.map(account => (
        <AccountCard account={account} />
      ))}
    </div>
  </div>
</BaseLayout>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .account-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }
</style>
```

#### 2.2.2 Account Detail Page

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import TransactionForm from '../../components/TransactionForm.astro';
import TransactionList from '../../components/TransactionList.astro';
import { getAccount, getTransactions } from '../../utils/api';

const { id } = Astro.params;
const account = await getAccount(id);
const transactions = await getTransactions(id);
---

<BaseLayout title={`${account.name}'s Account`}>
  <div class="account-detail">
    <header>
      <h1>{account.name}</h1>
      <div class="balance">${account.balance.toFixed(2)}</div>
    </header>
    
    <TransactionForm accountId={id} />
    
    <section class="stats">
      <div class="stat">
        <span class="label">Interest Rate</span>
        <span class="value">{(account.interest_rate * 100).toFixed(2)}%</span>
      </div>
      <div class="stat">
        <span class="label">Compounding</span>
        <span class="value">{account.compounding_period}</span>
      </div>
    </section>
    
    <TransactionList transactions={transactions} />
  </div>
</BaseLayout>
```

### 2.3 API Client Utility

**frontend/src/utils/api.ts**:

```typescript
const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/api';

export async function getAccounts() {
  const response = await fetch(`${API_BASE}/accounts`);
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

export async function getAccount(id: string) {
  const response = await fetch(`${API_BASE}/accounts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch account');
  return response.json();
}

export async function createTransaction(accountId: string, data: any) {
  const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create transaction');
  return response.json();
}

// ... similar functions for other endpoints
```

------

## 3. Backend Implementation (Express)

### 3.1 Server Setup

**backend/server.js**:

```javascript
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const { runDailyInterest } = require('./jobs/dailyInterest');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);

// Error handling
app.use(errorHandler);

// Schedule daily interest calculation (runs at 1:00 AM)
cron.schedule('0 1 * * *', runDailyInterest);

app.listen(PORT, () => {
  console.log(`Piggybank API running on port ${PORT}`);
});
```

### 3.2 Database Layer

**backend/database/db.js**:

```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/piggybank.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initialize();
      }
    });
  }

  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
        compounding_period TEXT NOT NULL DEFAULT 'monthly',
        last_interest_date DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        balance_after DECIMAL(10, 2) NOT NULL,
        note TEXT,
        transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    `);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = new Database();
```

### 3.3 Routes

**backend/routes/accounts.js**:

```javascript
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { validateAccount } = require('../middleware/validation');

// GET all accounts
router.get('/', async (req, res, next) => {
  try {
    const accounts = await db.all(
      'SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY name'
    );
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// POST create account
router.post('/', validateAccount, async (req, res, next) => {
  try {
    const { name, interest_rate = 0, compounding_period = 'monthly', initial_balance = 0 } = req.body;
    
    const result = await db.run(
      `INSERT INTO accounts (name, balance, interest_rate, compounding_period, last_interest_date)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [name, initial_balance, interest_rate, compounding_period]
    );
    
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [result.id]);
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// PUT update account
router.put('/:id', validateAccount, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, interest_rate, compounding_period } = req.body;
    
    await db.run(
      `UPDATE accounts 
       SET name = ?, interest_rate = ?, compounding_period = ?, updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [name, interest_rate, compounding_period, id]
    );
    
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [id]);
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// DELETE soft delete account
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await db.run(
      'UPDATE accounts SET deleted_at = datetime(\'now\') WHERE id = ?',
      [id]
    );
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

**backend/routes/transactions.js**:

```javascript
const express = require('express');
const router = express.Router();
const TransactionManager = require('../services/transactionManager');

// GET transactions for account
router.get('/accounts/:accountId/transactions', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const transactions = await TransactionManager.getTransactions(accountId);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// POST create transaction
router.post('/accounts/:accountId/transactions', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { type, category, amount, note, transaction_date } = req.body;
    
    const transaction = await TransactionManager.createTransaction({
      accountId,
      type,
      category,
      amount,
      note,
      transaction_date
    });
    
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 3.4 Business Logic Services

**backend/services/transactionManager.js**:

```javascript
const db = require('../database/db');

class TransactionManager {
  async createTransaction({ accountId, type, category, amount, note, transaction_date }) {
    // Get current account balance
    const account = await db.get('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL', [accountId]);
    if (!account) throw new Error('Account not found');
    
    // Calculate new balance
    let newBalance;
    if (type === 'deposit' || type === 'interest') {
      newBalance = parseFloat(account.balance) + parseFloat(amount);
    } else if (type === 'withdrawal') {
      if (parseFloat(account.balance) < parseFloat(amount)) {
        throw new Error('Insufficient funds');
      }
      newBalance = parseFloat(account.balance) - parseFloat(amount);
    } else {
      throw new Error('Invalid transaction type');
    }
    
    // Create transaction
    const result = await db.run(
      `INSERT INTO transactions 
       (account_id, type, category, amount, balance_after, note, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [accountId, type, category, amount, newBalance.toFixed(2), note || null, transaction_date || new Date().toISOString()]
    );
    
    // Update account balance
    await db.run(
      'UPDATE accounts SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [newBalance.toFixed(2), accountId]
    );
    
    return await db.get('SELECT * FROM transactions WHERE id = ?', [result.id]);
  }
  
  async getTransactions(accountId, filters = {}) {
    let sql = `SELECT * FROM transactions WHERE account_id = ? AND deleted_at IS NULL`;
    const params = [accountId];
    
    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    
    sql += ' ORDER BY transaction_date DESC';
    
    return await db.all(sql, params);
  }
}

module.exports = new TransactionManager();
```

**backend/services/interestCalculator.js**:

```javascript
const db = require('../database/db');
const TransactionManager = require('./transactionManager');

class InterestCalculator {
  // Calculate time elapsed in years based on compounding period
  getTimePeriod(lastInterestDate, compoundingPeriod) {
    const now = new Date();
    const last = new Date(lastInterestDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceLast = Math.floor((now - last) / msPerDay);
    
    const periodsPerYear = {
      'daily': 365,
      'weekly': 52,
      'monthly': 12,
      'quarterly': 4,
      'annually': 1
    };
    
    const daysPerPeriod = 365 / periodsPerYear[compoundingPeriod];
    
    return {
      periods: Math.floor(daysSinceLast / daysPerPeriod),
      periodLengthYears: 1 / periodsPerYear[compoundingPeriod]
    };
  }
  
  async calculateInterest(accountId) {
    const account = await db.get('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL', [accountId]);
    if (!account || account.balance <= 0) return null;
    
    const { periods, periodLengthYears } = this.getTimePeriod(account.last_interest_date, account.compounding_period);
    
    if (periods === 0) return null; // No full period has elapsed
    
    // Compound interest formula: A = P(1 + r/n)^(nt)
    const principal = parseFloat(account.balance);
    const rate = parseFloat(account.interest_rate);
    const n = periods; // number of periods to compound
    
    const finalAmount = principal * Math.pow(1 + rate, n);
    const interestEarned = finalAmount - principal;
    
    if (interestEarned > 0) {
      // Create interest transaction
      await TransactionManager.createTransaction({
        accountId,
        type: 'interest',
        category: 'Interest',
        amount: interestEarned.toFixed(2),
        note: `Interest for ${periods} ${account.compounding_period} period(s)`
      });
      
      // Update last interest date
      await db.run(
        'UPDATE accounts SET last_interest_date = datetime(\'now\') WHERE id = ?',
        [accountId]
      );
      
      return interestEarned;
    }
    
    return null;
  }
}

module.exports = new InterestCalculator();
```

### 3.5 Scheduled Jobs

**backend/jobs/dailyInterest.js**:

```javascript
const db = require('../database/db');
const InterestCalculator = require('../services/interestCalculator');

async function runDailyInterest() {
  console.log('Running daily interest calculation...');
  
  try {
    const accounts = await db.all('SELECT * FROM accounts WHERE deleted_at IS NULL AND balance > 0');
    
    for (const account of accounts) {
      const interest = await InterestCalculator.calculateInterest(account.id);
      if (interest) {
        console.log(`Added $${interest.toFixed(2)} interest to ${account.name}'s account`);
      }
    }
    
    console.log('Daily interest calculation complete');
  } catch (error) {
    console.error('Error running daily interest:', error);
  }
}

module.exports = { runDailyInterest };
```

------

## 4. Deployment

### 4.1 Docker Configuration

**Dockerfile**:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY frontend ./frontend
COPY backend ./backend

# Build Astro frontend
WORKDIR /app/frontend
RUN npm run build

# Switch back to root
WORKDIR /app

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000 4000

# Start both frontend and backend
CMD ["sh", "-c", "node backend/server.js & npm run preview --prefix frontend"]
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  piggybank:
    build: .
    container_name: piggybank
    ports:
      - "3000:3000"  # Astro frontend
      - "4000:4000"  # Express API
    volumes:
      - ./data:/app/data  # Persist SQLite database
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/piggybank.db
      - PUBLIC_API_URL=http://localhost:4000/api
    restart: unless-stopped
```

### 4.2 Caddy Configuration

Add to your existing Caddyfile:

```
piggybank.yourhomelab.local {
    reverse_proxy localhost:3000
}
```

------

## 5. Testing Strategy

### 5.1 Unit Tests

- **Services**: Test interest calculation logic, transaction balance updates
- **Validation**: Test input validation middleware
- **Database**: Test CRUD operations

### 5.2 Integration Tests

- **API Endpoints**: Test full request/response cycle
- **Transaction Flow**: Create account → add deposit → calculate interest
- **Edge Cases**: Insufficient funds, negative balances, invalid dates

### 5.3 Manual Testing Checklist

- [ ] Create 3 child accounts with different interest rates
- [ ] Add deposits from various categories
- [ ] Attempt withdrawal exceeding balance (should fail)
- [ ] Verify interest calculation after period elapses
- [ ] Edit transaction and verify balance recalculation
- [ ] Delete account and verify soft delete
- [ ] Export transaction history

------

## 6. Deployment Steps

1. **Clone repository** and navigate to project directory
2. **Build Docker image**: `docker-compose build`
3. **Start services**: `docker-compose up -d`
4. **Configure Caddy** reverse proxy for local domain
5. **Access application** at `http://piggybank.yourhomelab.local`
6. **Set up automated backups** of `/data/piggybank.db`

------

## 7. Maintenance & Monitoring

### 7.1 Database Backups

Add cron job on Proxmox host:

```bash
0 2 * * * cp /path/to/piggybank/data/piggybank.db /backups/piggybank-$(date +\%Y\%m\%d).db
```

### 7.2 Logs

- Access logs: `docker-compose logs -f piggybank`
- Backend logs stored in container stdout
- Frontend build errors in Astro build output

### 7.3 Updates

```bash
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

------

This PRD and TDD should give you everything you need to build a lightweight, self-hosted piggybank app. The stack is minimal (Astro + Express + SQLite), deployment is straightforward with Docker, and it fits perfectly into your Proxmox homelab alongside your other services. Let me know if you'd like me to elaborate on any specific section!