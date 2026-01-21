# Upgrading Piggybank

This guide explains how to safely upgrade your Piggybank installation while preserving your data.

## Quick Upgrade (Recommended)

Your data is automatically preserved during upgrades thanks to Docker volume mounting. To upgrade:

```bash
# Navigate to piggybank directory
cd piggybank

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

**That's it!** Your database at `./data/piggybank.db` will be automatically used by the new version.

## How Data Persistence Works

### Docker Volume Mounting

The `docker-compose.yml` file mounts your local `./data/` directory into the container:

```yaml
volumes:
  - ./data:/app/data
```

This means:
- Your database file lives on the **host machine** at `./data/piggybank.db`
- The container reads/writes to this file
- When you destroy and recreate the container, the file remains on the host
- New container versions automatically use the existing database

### Schema Migrations

The database schema is automatically updated on application startup:

1. **Automatic Table Creation**: Tables are created with `CREATE TABLE IF NOT EXISTS`
2. **No Downtime**: Schema updates don't require manual intervention
3. **Backward Compatible**: New versions are designed to work with existing data

### What Happens During Upgrade

```
1. docker-compose down
   └─> Container stops, but ./data/piggybank.db remains on host

2. docker-compose up -d --build
   ├─> New container is built
   ├─> ./data/ is mounted into new container
   ├─> Application starts and sees existing database
   └─> Schema updates (if any) are applied automatically
```

## Pre-Upgrade Checklist

Before upgrading, it's good practice to:

1. **Create a backup**:
   ```bash
   cp data/piggybank.db data/backups/pre_upgrade_$(date +%Y%m%d_%H%M%S).db
   ```

2. **Check for breaking changes** in the [release notes](https://github.com/JoelLewis/piggybank/releases)

3. **Verify disk space**:
   ```bash
   df -h .
   ```

## Rollback

If something goes wrong, you can rollback:

```bash
# Stop the application
docker-compose down

# Restore previous database backup
cp data/backups/pre_upgrade_YYYYMMDD_HHMMSS.db data/piggybank.db

# Checkout previous version
git log --oneline  # Find the commit hash
git checkout <previous-commit-hash>

# Rebuild with old version
docker-compose up -d --build
```

## Troubleshooting

### "Database is locked" error

This can happen if the container didn't shut down cleanly:

```bash
# Force stop all containers
docker-compose down -v

# Restart
docker-compose up -d
```

### Database corruption

Restore from backup:

```bash
# Stop application
docker-compose down

# Check available backups
ls -lh data/backups/

# Restore a backup
cp data/backups/piggybank_backup_YYYYMMDD_HHMMSS.db data/piggybank.db

# Restart
docker-compose up -d
```

### Schema mismatch errors

This is rare but can happen if you manually modified the database:

```bash
# Export your data first
docker-compose exec backend sqlite3 /app/data/piggybank.db ".dump" > backup.sql

# Rename old database
mv data/piggybank.db data/piggybank.db.old

# Restart (fresh database will be created)
docker-compose restart backend

# Then restore data manually or contact support
```

## Migration from Other Systems

### From SQLite to PostgreSQL (Future)

Currently only SQLite is supported. If PostgreSQL support is added:

1. Export existing data:
   ```bash
   docker-compose exec backend sqlite3 /app/data/piggybank.db ".dump" > export.sql
   ```

2. Use migration script (to be provided)

3. Update `docker-compose.yml` to use PostgreSQL

## Best Practices

1. **Regular Backups**: Automated daily backups run at 2:00 AM, but manual backups before upgrades are recommended
2. **Test Upgrades**: If possible, test on a copy of your data first
3. **Read Release Notes**: Check for any special upgrade instructions
4. **Monitor Logs**: After upgrade, check logs: `docker-compose logs -f backend`
5. **Keep Backups**: Maintain at least one known-good backup outside the `./data/` directory

## Version-Specific Notes

### v1.x to v2.x (Future)

_No breaking changes yet. This section will be updated when major versions are released._

## Getting Help

If you encounter issues during upgrade:

1. Check logs: `docker-compose logs backend`
2. Open an issue: https://github.com/JoelLewis/piggybank/issues
3. Include:
   - Your Docker version: `docker --version`
   - Your Docker Compose version: `docker-compose --version`
   - Error messages from logs
   - Steps you took before the error occurred
