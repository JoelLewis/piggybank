# Piggybank App - AI Context

This document serves as the primary context for AI assistants working on the Piggybank project. It outlines the project's purpose, technical constraints, and core logic.

## 1. Project Overview

A self-hosted virtual piggybank for parents to manage children's allowances and teach compound interest.

- **Core Value**: Financial literacy via hands-on simulation.
- **Access Model**: Local network only (Trusted environment).

## 2. Technical Stack

- **Frontend**: Astro (SSR Mode) + React + Tailwind CSS.
- **Backend**: Node.js + Express.
- **Database**: SQLite3 (Single-file).
- **Process Management**: Docker.

## 3. Database Schema (SQLite)

### Accounts

- `id` (PK), `name` (Unique), `balance` (Decimal), `interest_rate` (Decimal 0.0000), `compounding_period` (Enum), `last_interest_date` (DateTime), `created_at`, `deleted_at`.

### Transactions

- `id` (PK), `account_id` (FK), `type` ('deposit', 'withdrawal', 'interest'), `category`, `amount`, `balance_after`, `note`, `date`.

## 4. Key Business Logic

### Compound Interest Engine

- **Formula**: $A = P(1 + r/n)^n$
- **Implementation**:
  1. Calculate `periodsElapsed` = `Math.floor(daysSinceLast / daysPerPeriod)`.
  2. If `periodsElapsed > 0`, apply formula.
  3. Create an 'interest' transaction.
  4. Update `last_interest_date` to current timestamp.

### Security (Parent PIN)

- **Status**: Optional.
- **Scope**: Required for `withdrawal` transactions, `delete` actions, and `settings` overrides.
- **Implementation**: 4-digit numeric string.

## 5. Development Principles

- **Single Source of Truth**: Balance is stored in `accounts` but must be validated against the `transactions` ledger.
- **Soft Deletes**: Use `deleted_at` for accounts to preserve historical records.
- **Immutability**: Transactions cannot be changed once posted; corrections require adjustment transactions.



# AI Coding Instructions

When generating code or suggesting changes for the Piggybank App, adhere to these rules:

## 1. Frontend Standards

- **Component Style**: Functional React components with Tailwind CSS.
- **Icons**: Use `lucide-react`.
- **Formatting**: 2-space indentation.
- **State**: Prefer local state for UI, and `fetch`/`useEffect` (or Astro Actions) for server synchronization.

## 2. Backend Standards

- **API Design**: RESTful endpoints.
- **Error Handling**: Middleware-based error handling. Always return JSON error objects.
- **SQL**: Use parameterized queries to prevent injection. No ORM; use raw SQL for transparency.
- **Cron Jobs**: Scheduled daily at 01:00 AM for interest processing.

## 3. UI/UX Guidelines

- **Accessibility**: High contrast for balance displays.
- **Mobile First**: All layouts must be responsive.
- **Feedback**: Every action must trigger a visual feedback toast or message.

## 4. Documentation

- All new API endpoints must be documented in the README.
- Complex math (interest) must include inline comments explaining the variables.



# Piggybank App

A self-hosted digital piggybank for teaching children financial literacy.

## Tech Stack

- **Frontend**: Astro + React + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Icons**: Lucide React

## Local Development

### 1. Installation

```
npm install
```

### 2. Configuration

Create a `.env` file in the root:

```
PORT=4000
DB_PATH=./data/piggybank.db
PUBLIC_API_URL=http://localhost:4000/api
```

### 3. Run Development Servers

**Backend:**

```
node server.js
```

**Frontend:**

```
npm run dev
```

## Transitioning from Prototype

The current `App.jsx` uses in-memory state. To connect to the SQLite backend:

1. Replace `useEffect` hooks with API calls to the Express routes.
2. Update `handleTransaction` and `calculateInterestManual` to `POST` to `/api/transactions`.

# Begin sample package configuration

{
  "name": "piggybank-app",
  "version": "0.1.0",
  "description": "Self-hosted virtual piggybank for kids",
  "main": "server.js",
  "scripts": {
    "dev": "astro dev",
    "start": "astro preview",
    "server": "nodemon server.js",
    "build": "astro build"
  },
  "dependencies": {
    "astro": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "cors": "^2.8.5",
    "lucide-react": "^0.294.0",
    "node-cron": "^3.0.3",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@astrojs/react": "^3.0.0",
    "@astrojs/tailwind": "^5.0.0",
    "nodemon": "^3.0.1",
    "tailwindcss": "^3.3.0"
  }
}



# Begin Demonstration App Code

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  MinusCircle, 
  History, 
  Settings, 
  TrendingUp, 
  User, 
  ArrowLeft, 
  Trash2, 
  Calendar,
  DollarSign,
  ChevronRight,
  Info,
  Lock,
  Unlock,
  ShieldCheck,
  X,
  RefreshCw
} from 'lucide-react';

/**
 * PIGGYBANK APP - PRODUCTION READY PROTOTYPE
 * Refined Interest Calculation & Parent PIN Security
 */

const CATEGORIES = {
  deposit: ["Allowance", "Tooth Fairy", "Gift", "Chore", "Other"],
  withdrawal: ["Toy", "Candy", "Savings Goal", "Other"],
  interest: ["Interest"]
};

const COMPOUNDING_PERIOD_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  annually: 365
};

export default function App() {
  // --- STATE MANAGEMENT ---
  const [accounts, setAccounts] = useState([
    {
      id: '1',
      name: 'Charlie',
      balance: 125.50,
      interest_rate: 0.05, // 5%
      compounding_period: 'monthly',
      last_interest_date: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(), // 65 days ago (2 periods due)
      created_at: new Date().toISOString()
    }
  ]);

  const [transactions, setTransactions] = useState([
    { id: 't1', account_id: '1', type: 'deposit', category: 'Allowance', amount: 100, balance_after: 100, note: 'Starting balance', date: new Date().toISOString() },
    { id: 't2', account_id: '1', type: 'deposit', category: 'Chore', amount: 25.50, balance_after: 125.50, note: 'Mowed the lawn', date: new Date().toISOString() }
  ]);

  const [parentPin, setParentPin] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const [currentView, setCurrentView] = useState('dashboard');
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const activeAccount = useMemo(() => 
    accounts.find(a => a.id === activeAccountId), 
    [accounts, activeAccountId]
  );

  // --- UTILS ---

  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const requireParentAuth = (callback) => {
    if (!parentPin || isUnlocked) {
      callback();
    } else {
      setPendingAction(() => callback);
      setShowPinEntry(true);
    }
  };

  // --- CORE SERVICES ---

  const handleTransaction = (data) => {
    const perform = () => {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) return showFeedback("Invalid amount", "error");

      const account = accounts.find(a => a.id === data.accountId);
      if (!account) return;
    
      let newBalance = account.balance;
      if (data.type === 'deposit' || data.type === 'interest') {
        newBalance += amount;
      } else {
        if (newBalance < amount) return showFeedback("Insufficient funds!", "error");
        newBalance -= amount;
      }
    
      const newTx = {
        id: `t-${Date.now()}`,
        account_id: data.accountId,
        type: data.type,
        category: data.category,
        amount: amount,
        balance_after: newBalance,
        note: data.note,
        date: new Date().toISOString()
      };
    
      setTransactions([newTx, ...transactions]);
      setAccounts(accounts.map(a => 
        a.id === data.accountId ? { ...a, balance: newBalance } : a
      ));
      showFeedback("Transaction recorded");
    };
    
    if (data.type === 'withdrawal') {
      requireParentAuth(perform);
    } else {
      perform();
    }
  };

  /**
   * Refined Interest Service
   * Correctly handles multiple skipped periods and compound growth
      */
    const calculateInterestManual = (accountId) => {

    const account = accounts.find(a => a.id === accountId);
    if (!account || account.balance <= 0) return showFeedback("No balance for interest", "error");
    
    const last = new Date(account.last_interest_date);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now - last) / (1000 * 60 * 60 * 24));
    
    const periodDays = COMPOUNDING_PERIOD_DAYS[account.compounding_period];
    const periodsElapsed = Math.floor(diffDays / periodDays);
    
    if (periodsElapsed === 0) {
      return showFeedback(`Not due yet. Next payment in ${periodDays - diffDays} days.`, "info");
    }
    
    // Formula: A = P(1 + r)^n
    // r = annual rate / (days in year / days in period)
    const ratePerPeriod = account.interest_rate / (365 / periodDays);
    const finalAmount = account.balance * Math.pow(1 + ratePerPeriod, periodsElapsed);
    const interestEarned = finalAmount - account.balance;
    
    if (interestEarned < 0.01) return showFeedback("Interest negligible (< $0.01)", "info");
    
    handleTransaction({
      accountId,
      type: 'interest',
      category: 'Interest',
      amount: interestEarned,
      note: `Compound interest for ${periodsElapsed} period(s)`
    });
    
    setAccounts(prev => prev.map(a => 
      a.id === accountId ? { ...a, last_interest_date: new Date().toISOString() } : a
    ));
    
    showFeedback(`Successfully added $${interestEarned.toFixed(2)}!`);
  };

  // --- COMPONENTS ---

  const PinPad = () => {
    const [entry, setEntry] = useState('');
    const [err, setErr] = useState(false);

    const handleDigit = (d) => {
      if (entry.length >= 4) return;
      const newEntry = entry + d;
      setEntry(newEntry);
      
      if (newEntry.length === 4) {
        if (newEntry === parentPin) {
          setIsUnlocked(true);
          setShowPinEntry(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        } else {
          setErr(true);
          setTimeout(() => { setEntry(''); setErr(false); }, 500);
        }
      }
    };
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Parental Control</h2>
          <p className="text-slate-500 text-sm mb-6">Enter PIN to authorize action.</p>
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${entry.length > i ? 'bg-indigo-600 scale-110' : 'bg-slate-200'} ${err ? 'bg-rose-500 animate-shake' : ''}`}></div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'X'].map(key => (
              <button key={key} onClick={() => key === 'C' ? setEntry('') : key === 'X' ? setShowPinEntry(false) : handleDigit(key)} className="h-16 rounded-2xl bg-slate-50 font-black text-xl hover:bg-slate-100 active:scale-95">{key}</button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AccountDetail = () => {
    const [txType, setTxType] = useState('deposit');
    const [amount, setAmount] = useState('');
    const accountTxs = transactions.filter(t => t.account_id === activeAccount.id);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
    
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">{activeAccount.name}</h1>
            <p className="text-slate-500 text-sm">Managing growth since {new Date(activeAccount.created_at).toLocaleDateString()}</p>
          </div>
          <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-100 min-w-[240px]">
            <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Current Balance</div>
            <div className="text-4xl font-black">${activeAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
    
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Quick Entry</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                {['deposit', 'withdrawal'].map(t => (
                  <button key={t} onClick={() => setTxType(t)} className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${txType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t}</button>
                ))}
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="number" placeholder="0.00" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <button onClick={() => { handleTransaction({ accountId: activeAccount.id, type: txType, amount, category: 'Manual' }); setAmount(''); }} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-transform active:scale-95 ${txType === 'deposit' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  Post {txType}
                </button>
              </div>
            </div>
    
            <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group">
              <RefreshCw className="absolute -right-6 -bottom-6 text-slate-800 opacity-50 group-hover:rotate-180 transition-transform duration-1000" size={160} />
              <div className="relative z-10">
                <div className="text-xs font-bold uppercase text-slate-400 mb-1">Auto-Compounding</div>
                <div className="text-2xl font-black mb-1">{(activeAccount.interest_rate * 100).toFixed(1)}% APY</div>
                <div className="text-xs text-slate-500 mb-6">Compounded {activeAccount.compounding_period}</div>
                <button onClick={() => calculateInterestManual(activeAccount.id)} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold transition-colors">
                  Check & Pay Interest
                </button>
              </div>
            </div>
            
            <button onClick={() => setCurrentView('settings')} className="w-full py-3 text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2">
              <Settings size={18} /> Account Settings
            </button>
          </div>
    
          <div className="lg:col-span-2">
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <h2 className="font-bold flex items-center gap-2 text-slate-700"><History size={18} /> Transaction Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50">
                      <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Event</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4 text-right">Balance</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {accountTxs.sort((a,b) => new Date(b.date) - new Date(a.date)).map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'deposit' ? 'bg-emerald-500' : tx.type === 'withdrawal' ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                              <span className="text-sm font-bold text-slate-800">{tx.category}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-right font-black ${tx.type === 'withdrawal' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {tx.type === 'withdrawal' ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-400 text-sm">${parseFloat(tx.balance_after).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const GlobalSettings = () => {
    const [pinInput, setPinInput] = useState('');
    return (
      <div className="max-w-xl mx-auto py-8 space-y-6">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800"><ArrowLeft size={18} /> Dashboard</button>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h2 className="text-3xl font-black text-slate-900 mb-6">Security & Preferences</h2>
          <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-3xl">
              <div className="flex items-center gap-3 mb-2 text-indigo-600"><ShieldCheck size={24} /><h3 className="font-bold">Parental PIN</h3></div>
              <p className="text-sm text-slate-500 mb-6">When active, withdrawals and settings require a PIN code.</p>
              <div className="flex gap-4">
                <input type="password" maxLength="4" placeholder="----" className="bg-white border border-slate-200 px-4 py-3 rounded-xl text-center font-black tracking-[0.5em] w-32 focus:ring-2 focus:ring-indigo-500 outline-none" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} />
                <button onClick={() => { if (pinInput.length === 4) { setParentPin(pinInput); setPinInput(''); showFeedback("PIN Configured!"); } }} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100">{parentPin ? 'Change PIN' : 'Activate'}</button>
                {parentPin && <button onClick={() => { setParentPin(null); setIsUnlocked(false); showFeedback("PIN Removed"); }} className="text-rose-500 font-bold text-sm">Disable</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- ROOT RENDER ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {feedback && <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[110] px-8 py-4 rounded-2xl shadow-2xl bg-slate-900 text-white font-bold animate-in slide-in-from-top-4">{feedback.msg}</div>}
      {showPinEntry && <PinPad />}

      <nav className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-100"><DollarSign size={24} strokeWidth={3} /></div>
          <span className="font-black text-2xl tracking-tighter text-slate-800">PIGGYBANK</span>
        </div>
        <div className="flex items-center gap-4">
          {parentPin && (
            <button onClick={() => setIsUnlocked(!isUnlocked)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all border ${isUnlocked ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-slate-100 text-slate-400'}`}>
              {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
              {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
            </button>
          )}
          <button onClick={() => setCurrentView('global-settings')} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"><Settings size={20} /></button>
        </div>
      </nav>
    
      <main className="max-w-6xl mx-auto">
        {currentView === 'dashboard' && (
          <div className="space-y-12">
            <div className="flex justify-between items-center">
              <h1 className="text-5xl font-black text-slate-900 tracking-tight">Accounts</h1>
              <button onClick={() => setCurrentView('create-account')} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"><PlusCircle size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {accounts.map(a => (
                <div key={a.id} onClick={() => { setActiveAccountId(a.id); setCurrentView('account-detail'); }} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><User size={24} /></div>
                    <div className="text-[10px] font-black tracking-widest text-slate-300 uppercase bg-slate-50 px-3 py-1 rounded-full">{a.compounding_period}</div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">{a.name}</h3>
                  <div className="text-4xl font-black text-indigo-600 mb-6">${a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-sm"><TrendingUp size={14} /> {(a.interest_rate * 100).toFixed(1)}%</div>
                    <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {currentView === 'account-detail' && <AccountDetail />}
        {currentView === 'global-settings' && <GlobalSettings />}
        {currentView === 'create-account' && (
           <div className="max-w-xl mx-auto space-y-6">
              <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-slate-500"><ArrowLeft size={18} /> Cancel</button>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                <h2 className="text-3xl font-black mb-8">New Account</h2>
                <div className="space-y-6">
                  <div><label className="block text-xs font-black uppercase text-slate-400 mb-2">Child's Name</label><input type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" placeholder="Sam" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-black uppercase text-slate-400 mb-2">Interest APY %</label><input type="number" defaultValue="5" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold" /></div>
                    <div><label className="block text-xs font-black uppercase text-slate-400 mb-2">Compounding</label><select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none font-bold capitalize">{Object.keys(COMPOUNDING_PERIOD_DAYS).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                  </div>
                  <button onClick={() => handleCreateAccount({ name: 'Sam', initial_balance: 0, interest_rate: 5, compounding_period: 'monthly' })} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg shadow-lg shadow-indigo-100">Open Account</button>
                </div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
}