# Piggybank App

A self-hosted virtual piggybank for teaching financial literacy to children. Built with Astro (Frontend) and Express (Backend), designed for easy self-hosting via Docker.

## Features

- **Account Management**: Create and manage accounts for multiple children.
- **Transactions**: Track deposits, withdrawals, and view history.
- **Interest**: Automated compound interest calculation (daily, weekly, monthly, etc.).
- **Security**: Optional parent PIN (Coming Soon).
- **Self-Hosted**: Full control over your data with SQLite.
- **Persistent Storage**: Database persists across server restarts and software updates.
- **Automated Backups**: Daily backups with 30-day retention.

## Quick Start (Docker)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/JoelLewis/piggybank.git
    cd piggybank
    ```

2.  **Start with Docker Compose**:
    ```bash
    docker-compose up -d --build
    ```

3.  **Access the App**:
    -   Frontend: `http://localhost:3000`
    -   Backend API: `http://localhost:4000`

## Manual Development Setup

### Backend

1.  Navigate to `backend/`:
    ```bash
    cd backend
    npm install
    ```
2.  Start the server:
    ```bash
    npm run start
    # or for dev
    npx nodemon server.js
    ```

### Frontend

1.  Navigate to `frontend/`:
    ```bash
    cd frontend
    npm install
    ```
2.  Start development server:
    ```bash
    npm run dev
    ```

## Proxmox LXC Installation

1.  Create a standard LXC container (Debian/Ubuntu).
2.  Install Docker and Docker Compose inside the LXC.
3.  Clone this repo and run `docker-compose up -d`.
4.  (Optional) Use a reverse proxy like Caddy or Nginx to serve on a domain.

## Database & Data Persistence

### Storage Location

All data is stored in the `./data/` directory:
- **Database**: `./data/piggybank.db` (SQLite)
- **Backups**: `./data/backups/` (Daily automated backups)

This directory is mounted as a Docker volume, ensuring your data persists across:
- Container restarts
- Software updates (via `docker-compose pull` and restart)
- Server reboots

### Automated Backups

Daily backups run automatically at 2:00 AM:
- Retention: 30 days
- Location: `./data/backups/piggybank_backup_YYYYMMDD_HHMMSS.db`

### Manual Backup

```bash
# While running
docker-compose exec backend sqlite3 /app/data/piggybank.db ".backup /app/data/backups/manual_$(date +%Y%m%d_%H%M%S).db"
```

### Restore from Backup

```bash
# Stop the application
docker-compose down

# Restore database
cp data/backups/piggybank_backup_YYYYMMDD_HHMMSS.db data/piggybank.db

# Restart
docker-compose up -d
```

### Upgrading

To update to the latest version:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart (data persists automatically)
docker-compose down
docker-compose up -d --build
```

Your database at `./data/piggybank.db` will automatically work with the new version. Schema updates are applied automatically on startup.

## License

MIT
