# Data Directory

This directory stores persistent data for the Piggybank application.

## Contents

- **`piggybank.db`** - SQLite database file containing all accounts and transactions
- **`backups/`** - Automated daily database backups

## Persistence

This directory is mounted as a Docker volume (`./data:/app/data`) to ensure data persists across:
- Container restarts
- Software updates
- Server reboots

## Backups

Automated backups are created daily at 2:00 AM and stored in the `backups/` subdirectory:
- Format: `piggybank_backup_YYYYMMDD_HHMMSS.db`
- Retention: 30 days (configurable via `RETENTION_DAYS` environment variable)
- Restoration: Copy any backup file to `piggybank.db` to restore

## Manual Backup

To manually backup your database:

```bash
# While container is running
docker-compose exec backend sqlite3 /app/data/piggybank.db ".backup /app/data/backups/manual_backup_$(date +%Y%m%d_%H%M%S).db"
```

Or from the host:

```bash
# Stop the container first
docker-compose down
# Copy the database file
cp data/piggybank.db data/backups/manual_backup_$(date +%Y%m%d_%H%M%S).db
# Restart
docker-compose up -d
```

## Recovery

To restore from a backup:

```bash
# Stop the container
docker-compose down

# Restore from backup
cp data/backups/piggybank_backup_YYYYMMDD_HHMMSS.db data/piggybank.db

# Restart
docker-compose up -d
```

## Important Notes

- **Never delete this directory** while data is important - it contains your only copy of the database
- The `.gitignore` file prevents accidentally committing database files to version control
- Database schema updates are handled automatically via migrations on startup
- First-time setup will create `piggybank.db` automatically
