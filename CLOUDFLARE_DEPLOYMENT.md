# Cloudflare Pages Deployment Guide

This guide explains how to deploy the Piggybank application to Cloudflare Pages free tier.

## Overview

The application has been migrated to run on Cloudflare Pages with the following architecture:

- **Frontend**: Astro with Cloudflare adapter (hybrid mode for static pages)
- **API**: Cloudflare Pages Functions (serverless)
- **Database**: Cloudflare D1 (serverless SQLite)
- **Scheduled Jobs**: Cloudflare Cron Triggers (daily interest calculation)

## Prerequisites

1. A Cloudflare account (free tier is sufficient)
2. Node.js 18+ and npm installed
3. Wrangler CLI installed globally: `npm install -g wrangler`
4. Git repository connected to Cloudflare Pages

## Step 1: Install Dependencies

```bash
cd frontend
npm install
```

## Step 2: Create D1 Database

```bash
# Create the D1 database
wrangler d1 create piggybank-db

# This will output a database_id. Copy it for the next step.
```

Update `wrangler.toml` in the project root with your database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "piggybank-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID from above
```

## Step 3: Initialize Database Schema

```bash
# Apply the database migration
wrangler d1 execute piggybank-db --file=./frontend/migrations/0001_initial_schema.sql
```

Verify the schema was created:

```bash
wrangler d1 execute piggybank-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

You should see `accounts` and `transactions` tables.

## Step 4: Local Development

To test locally with D1:

```bash
cd frontend
npm run dev
```

For local development with a real D1 database:

```bash
wrangler pages dev --d1=DB=piggybank-db dist
```

## Step 5: Build the Application

```bash
cd frontend
npm run build
```

This creates the `dist` folder with your static site and Pages Functions.

## Step 6: Deploy to Cloudflare Pages

### Option A: Using Wrangler CLI

```bash
# From the project root
wrangler pages deploy frontend/dist --project-name=piggybank
```

### Option B: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository
4. Configure build settings:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`
5. Add environment variable bindings:
   - **D1 database**: Bind `DB` to your `piggybank-db` database
6. Deploy!

## Step 7: Configure Cron Triggers

Cron triggers for Cloudflare Pages are configured in `wrangler.toml`:

```toml
[triggers]
crons = ["0 1 * * *"]  # Runs daily at 1:00 AM UTC
```

After deployment, verify the cron trigger in the Cloudflare Dashboard:

1. Go to your Pages project
2. Navigate to **Settings** → **Functions**
3. Verify the scheduled trigger is active

## Step 8: Verify Deployment

Test your deployment:

```bash
# List accounts
curl https://your-app.pages.dev/api/accounts

# Create an account
curl -X POST https://your-app.pages.dev/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Account", "interest_rate": 0.05, "compounding_period": "monthly", "initial_balance": 100}'
```

## Database Management

### View Data

```bash
# List all accounts
wrangler d1 execute piggybank-db --command="SELECT * FROM accounts"

# List all transactions
wrangler d1 execute piggybank-db --command="SELECT * FROM transactions"
```

### Backup Database

```bash
# Export database to SQL
wrangler d1 export piggybank-db --output=backup.sql
```

### Restore Database

```bash
# Import from SQL file
wrangler d1 execute piggybank-db --file=backup.sql
```

## API Endpoints

All API endpoints are available at `/api/*`:

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/accounts/:id/statistics` - Get account statistics
- `POST /api/accounts/:id/calculate-interest` - Manually trigger interest calculation

### Transactions
- `GET /api/accounts/:accountId/transactions` - List transactions
- `POST /api/accounts/:accountId/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

## Monitoring

Monitor your application in the Cloudflare Dashboard:

1. **Analytics**: View requests, bandwidth, and errors
2. **Logs**: Real-time function logs at **Pages** → **[Your Project]** → **Functions**
3. **D1 Analytics**: Database query metrics at **D1** → **[Your Database]** → **Metrics**

## Cost Optimization (Free Tier Limits)

Cloudflare Pages free tier includes:

- ✅ Unlimited requests
- ✅ Unlimited bandwidth
- ✅ 500 builds per month
- ✅ D1: 5GB storage, 5 million reads/day, 100k writes/day
- ✅ Functions: 100,000 requests/day
- ✅ Cron Triggers: 3 per project (we use 1)

## Troubleshooting

### Build Failures

Check build logs in the Cloudflare Dashboard. Common issues:

- Missing dependencies: Ensure all dependencies are in `package.json`
- TypeScript errors: Run `npm run build` locally first

### Function Errors

View function logs in the dashboard:

```bash
# Or use wrangler
wrangler pages deployment tail
```

### Database Issues

```bash
# Test database connection
wrangler d1 execute piggybank-db --command="SELECT 1"

# Check table structure
wrangler d1 execute piggybank-db --command="PRAGMA table_info(accounts)"
```

## Environment Variables

No environment variables are required for basic operation. All configuration is in `wrangler.toml`.

For custom configurations, add to Cloudflare Pages settings:

- Dashboard → Pages → [Your Project] → Settings → Environment variables

## Production Considerations

### 1. Enable Production Database

Uncomment the production configuration in `wrangler.toml`:

```toml
[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "piggybank-db-production"
database_id = "YOUR_PRODUCTION_DATABASE_ID_HERE"
```

Create a separate production database:

```bash
wrangler d1 create piggybank-db-production
wrangler d1 execute piggybank-db-production --file=./frontend/migrations/0001_initial_schema.sql
```

### 2. Custom Domain

Add a custom domain in Cloudflare Pages:

1. Dashboard → Pages → [Your Project] → Custom domains
2. Add your domain
3. Update DNS records as instructed

### 3. Access Control

For private deployments, add Cloudflare Access:

1. Dashboard → Zero Trust → Access → Applications
2. Create a new application
3. Add policies to restrict access

## Migration from Docker

If migrating from the Docker setup:

### Export existing data:

```bash
# From the backend container
sqlite3 /app/data/piggybank.db .dump > export.sql
```

### Import to D1:

```bash
# Clean up the SQL file (remove Docker-specific statements if any)
# Then import
wrangler d1 execute piggybank-db --file=export.sql
```

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Functions Documentation](https://developers.cloudflare.com/pages/platform/functions/)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

## Support

For issues:

1. Check Cloudflare Dashboard logs
2. Review this documentation
3. Check Cloudflare Community forums
4. Open an issue in the project repository
