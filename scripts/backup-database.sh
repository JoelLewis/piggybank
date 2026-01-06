#!/bin/bash
# Piggybank Database Backup Script
# This script creates timestamped backups of the SQLite database
# and maintains only the last 30 days of backups

set -e  # Exit on error

# Configuration
DB_PATH="${DB_PATH:-/home/user/piggybank/data/piggybank.db}"
BACKUP_DIR="${BACKUP_DIR:-/home/user/piggybank/data/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/piggybank_backup_$TIMESTAMP.db"

# Check if source database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH"
    exit 1
fi

# Create backup using SQLite's backup command (safer than cp for active databases)
if command -v sqlite3 &> /dev/null; then
    # Use SQLite's backup command for consistency
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
    echo "✓ Database backed up using SQLite backup command: $BACKUP_FILE"
else
    # Fallback to simple copy if sqlite3 not available
    cp "$DB_PATH" "$BACKUP_FILE"
    echo "✓ Database backed up using copy: $BACKUP_FILE"
fi

# Verify backup was created and is not empty
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file was not created"
    exit 1
fi

BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
if [ "$BACKUP_SIZE" -eq 0 ]; then
    echo "Error: Backup file is empty"
    exit 1
fi

echo "✓ Backup size: $(numfmt --to=iec --suffix=B $BACKUP_SIZE 2>/dev/null || echo "$BACKUP_SIZE bytes")"

# Remove backups older than retention period
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=0

if command -v find &> /dev/null; then
    # Use find command for more reliable deletion
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "piggybank_backup_*.db" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
else
    # Fallback: manual cleanup
    for file in "$BACKUP_DIR"/piggybank_backup_*.db; do
        if [ -f "$file" ]; then
            FILE_AGE_DAYS=$(( ($(date +%s) - $(stat -f%m "$file" 2>/dev/null || stat -c%Y "$file")) / 86400 ))
            if [ $FILE_AGE_DAYS -gt $RETENTION_DAYS ]; then
                rm "$file"
                ((DELETED_COUNT++))
            fi
        fi
    done
fi

echo "✓ Removed $DELETED_COUNT old backup(s)"

# Count remaining backups
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "piggybank_backup_*.db" -type f 2>/dev/null | wc -l)
echo "✓ Total backups: $TOTAL_BACKUPS"

# Calculate total backup storage size
if command -v du &> /dev/null; then
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "✓ Total backup storage: $TOTAL_SIZE"
fi

echo "✓ Backup completed successfully at $(date)"
