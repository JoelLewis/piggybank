# Piggybank App Implementation Plan

## Phase 1: Project Initialization & Structure
- [ ] Initialize project structure (monorepo-style: `frontend/` and `backend/`).
- [ ] Set up root `package.json` for workspace management or simple script orchestration.
- [ ] Create `frontend` (Astro + React + Tailwind) using `npm create astro@latest`.
- [ ] Create `backend` (Express) directory and initialize `package.json`.

## Phase 2: Backend Development (Express + SQLite)
- [ ] Install dependencies (`express`, `sqlite3`, `cors`, `node-cron`, etc.).
- [ ] implement `database/db.js` to initialize SQLite schema (Accounts, Transactions).
- [ ] Implement `services/transactionManager.js` and `services/interestCalculator.js`.
- [ ] Create API routes:
    - [ ] `routes/accounts.js` (CRUD for accounts).
    - [ ] `routes/transactions.js` (Add deposit/withdrawal, List history).
- [ ] Set up `jobs/dailyInterest.js` for cron execution.
- [ ] Create `server.js` entry point.

## Phase 3: Frontend Development (Astro + React)
- [ ] Configure Astro for SSR (Server Side Rendering) to support dynamic API interactions.
- [ ] Install React and Tailwind integrations.
- [ ] Create shared UI components (`AccountCard`, `TransactionForm`, `TransactionList`) using React.
- [ ] Implement Pages:
    - [ ] `index.astro` (Dashboard).
    - [ ] `account/[id].astro` (Details & History).
    - [ ] `settings.astro` (Global settings).
- [ ] Implement API client utility (`utils/api.ts`) to talk to the backend.

## Phase 4: Production Readiness & Proxmox LXC Deployment
- [ ] Create `Dockerfile` for a multi-stage build (build frontend, serve both).
- [ ] Create `docker-compose.yml` for easy orchestration.
- [ ] Create a `deploy.sh` script or instructions for setting up the LXC container (installing Docker & Compose).
- [ ] (Optional) Caddyfile configuration for reverse proxying if running multiple services or needing HTTPS.

## GitHub Sync Instructions
Run the following commands to push this repository to GitHub:
```bash
# 1. Create a new repository on GitHub named 'piggybank'
# 2. Add the remote
git remote add origin https://github.com/<YOUR_USERNAME>/piggybank.git
# 3. Rename branch to main (optional but recommended)
git branch -m main
# 4. Push
git push -u origin main
```
