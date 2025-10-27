# Database Migration Guide for Coolify Deployment

**Project:** Privacy Advisor
**Platform:** Coolify v4
**Database:** PostgreSQL with Prisma ORM
**Last Updated:** 2025-10-06

---

## Overview

This guide explains how to run database migrations for Privacy Advisor when deployed on Coolify. Coolify handles the Docker container orchestration, but database migrations need to be executed manually or via deployment hooks.

---

## Quick Reference

### One-Time Manual Migration (After Deployment)

```bash
# SSH into your Coolify server
ssh user@your-coolify-server.com

# Find your backend container name
docker ps | grep privacy-advisor

# Run migration inside the backend container
docker exec <backend-container-name> npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma
```

### Using Makefile (If You Have Access)

```bash
# From your local machine with docker access to the Coolify host
make migrate ENV=stage
```

---

## Understanding Privacy Advisor's Migration Setup

### Architecture
- **Frontend**: Nginx serving static React build
- **Backend**: Node.js Express API with Prisma ORM
- **Worker**: BullMQ worker for background jobs
- **Database**: PostgreSQL (managed by Coolify or external)
- **Migrations**: Stored in `/infra/prisma/migrations/`

### Migration Flow
```
Local Development → Git Push → Coolify Pulls → Docker Build → Container Starts → Manual Migration
```

**IMPORTANT:** Coolify does **not** automatically run migrations. You must run them manually after deployment.

---

## Method 1: Manual Migration via Docker Exec (Recommended)

This is the most reliable method for Coolify deployments.

### Step 1: Access Your Coolify Server

```bash
# SSH into your Coolify server
ssh user@your-coolify-server.com
```

### Step 2: Find Your Backend Container

```bash
# List all running containers related to Privacy Advisor
docker ps | grep privacy-advisor

# Or filter specifically for backend
docker ps | grep backend

# Output will look like:
# abc123def456   privacy-advisor-backend   "docker-entrypoint..."   Up 10 minutes   0.0.0.0:5000->5000/tcp
```

**Note the container ID or name** (e.g., `privacy-advisor-backend-1` or `abc123def456`)

### Step 3: Run Prisma Migration

```bash
# Using container name
docker exec privacy-advisor-backend-1 npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma

# OR using container ID
docker exec abc123def456 npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from infra/prisma/schema.prisma
Datasource "db": PostgreSQL database "privacy", schema "public" at "db:5432"

5 migrations found in prisma/migrations

Applying migration `20251005000001_critical_performance_optimizations`
Applying migration `20251005000002_index_cleanup`

The following migrations have been applied:

migrations/
  └─ 20251005000001_critical_performance_optimizations/
      └─ migration.sql
  └─ 20251005000002_index_cleanup/
      └─ migration.sql

All migrations have been successfully applied.
```

### Step 4: Verify Migration Success

```bash
# Connect to your database container
docker exec -it privacy-advisor-db-1 psql -U postgres -d privacy

# Check migration status
SELECT migration_name, finished_at
FROM "_prisma_migrations"
ORDER BY finished_at DESC
LIMIT 5;

# Exit psql
\q
```

---

## Method 2: Using Coolify's Pre-Deploy Command

Coolify allows you to run commands before starting your application. However, **this is NOT recommended** for production because:
- Pre-deploy commands can fail silently
- They increase deployment time
- They run on every deployment, even if no migrations are needed

If you still want to use this method:

### Step 1: Configure in Coolify UI

1. Go to your **Backend** application in Coolify
2. Navigate to **Advanced** → **Build** settings
3. Add to **Pre-Deploy Command**:
   ```bash
   npx prisma migrate deploy --schema=/app/infra/prisma/schema.prisma
   ```

### Step 2: Deploy

When you deploy, migrations will run automatically before the container starts.

**⚠️ Warning:** This will BLOCK deployment if migrations fail!

---

## Method 3: Post-Deployment Script (Advanced)

Create a deployment hook that runs migrations after containers start.

### Step 1: Create Migration Script

Create `infra/scripts/run-migration.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Finding backend container..."
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)

if [ -z "$BACKEND_CONTAINER" ]; then
  echo "❌ Backend container not found!"
  exit 1
fi

echo "✅ Found backend container: $BACKEND_CONTAINER"
echo "🚀 Running Prisma migrations..."

docker exec "$BACKEND_CONTAINER" npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma

echo "✅ Migrations completed successfully!"
```

### Step 2: Make It Executable

```bash
chmod +x infra/scripts/run-migration.sh
```

### Step 3: Run After Each Deployment

```bash
# SSH to Coolify server
ssh user@your-coolify-server.com

# Run the script
./infra/scripts/run-migration.sh
```

---

## Method 4: Using Makefile Targets

If you have direct Docker access to your Coolify server (e.g., via SSH with Docker socket access):

### From Coolify Server

```bash
# Clone your repository or pull latest
cd /path/to/Privacy-Advisor

# Run migration for stage environment
make migrate ENV=stage

# Or for production
make migrate ENV=production
```

### How It Works

The Makefile target (line 41-42) runs:
```bash
docker exec privacy-advisor-backend-1 npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma || true
```

**Note:** The `|| true` prevents failure if container name doesn't match. Verify container name first.

---

## Common Issues & Troubleshooting

### Issue 1: Container Name Not Found

**Error:**
```
Error: No such container: privacy-advisor-backend-1
```

**Solution:**
```bash
# List all containers
docker ps

# Find the correct container name
docker ps | grep backend

# Use the actual container name
docker exec <actual-name> npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma
```

### Issue 2: Database Connection Failed

**Error:**
```
Error: Can't reach database server at `db:5432`
```

**Causes:**
- Database container not running
- Incorrect `DATABASE_URL` environment variable
- Network configuration issue

**Solution:**
```bash
# Check if database is running
docker ps | grep postgres

# Check backend environment variables
docker exec privacy-advisor-backend-1 env | grep DATABASE_URL

# Test database connectivity
docker exec privacy-advisor-backend-1 npx prisma db pull --schema=/app/infra/prisma/schema.prisma
```

### Issue 3: Permission Denied

**Error:**
```
Error: permission denied while trying to connect to the Docker daemon socket
```

**Solution:**
```bash
# Add your user to docker group (on Coolify server)
sudo usermod -aG docker $USER

# Log out and back in, or run
newgrp docker
```

### Issue 4: Migration Already Applied

**Warning:**
```
Prisma Migrate could not create the shadow database. Migration already applied.
```

**This is normal!** It means the migration was already run. No action needed.

### Issue 5: Schema Drift Detected

**Error:**
```
Drift detected: Your database schema is not in sync with your migration history.
```

**Solution:**
```bash
# Reset migration history (⚠️ CAUTION: Development only!)
docker exec privacy-advisor-backend-1 npx prisma migrate reset --schema=/app/infra/prisma/schema.prisma

# For production, resolve drift manually
docker exec privacy-advisor-backend-1 npx prisma migrate resolve --applied <migration_name> --schema=/app/infra/prisma/schema.prisma
```

---

## Best Practices for Coolify Deployments

### 1. Always Test Migrations in Staging First

```bash
# Deploy to stage environment first
git push origin stage

# SSH to Coolify and run migration on stage
docker exec privacy-advisor-backend-stage npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma

# Test application functionality
curl https://stage.geckoadvisor.com/api/health

# If successful, deploy to production
git push origin main
```

### 2. Backup Database Before Migrations

```bash
# Create backup before running migration
docker exec privacy-advisor-db-1 pg_dump -U postgres privacy > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Monitor Migration Progress

```bash
# In one terminal, watch logs
docker logs -f privacy-advisor-backend-1

# In another terminal, run migration
docker exec privacy-advisor-backend-1 npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma
```

### 4. Verify Application Health After Migration

```bash
# Check backend health
curl https://stage.geckoadvisor.com/api/health

# Check recent reports (tests database connectivity)
curl https://stage.geckoadvisor.com/api/reports/recent

# Check scan functionality
curl -X POST https://stage.geckoadvisor.com/api/scan/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 5. Document Your Deployment

Create a deployment checklist:

```markdown
## Deployment Checklist

- [ ] Code pushed to branch
- [ ] Coolify deployment triggered
- [ ] Containers started successfully
- [ ] Database migration executed
- [ ] Health check passed
- [ ] Test scan completed
- [ ] Report viewing works
- [ ] Monitoring alerts configured
```

---

## Rollback Procedure

If migration causes issues:

### 1. Identify the Migration to Rollback

```bash
# Check migration history
docker exec privacy-advisor-backend-1 npx prisma migrate status --schema=/app/infra/prisma/schema.prisma
```

### 2. Execute Rollback (If Available)

```bash
# If a rollback SQL file exists
docker exec -i privacy-advisor-db-1 psql -U postgres -d privacy < infra/prisma/migrations/ROLLBACK_<migration_name>.sql
```

### 3. Mark Migration as Rolled Back

```bash
docker exec privacy-advisor-backend-1 npx prisma migrate resolve --rolled-back <migration_name> --schema=/app/infra/prisma/schema.prisma
```

### 4. Restart Backend

```bash
docker restart privacy-advisor-backend-1
```

---

## Automated Migration Script for Coolify

Create `migrate-on-coolify.sh` in your project root:

```bash
#!/bin/bash
set -e

ENV=${1:-stage}
echo "🚀 Running migration for environment: $ENV"

# Find backend container
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --filter "name=$ENV" --format "{{.Names}}" | head -1)

if [ -z "$BACKEND_CONTAINER" ]; then
  echo "❌ Backend container not found for environment: $ENV"
  echo "Available containers:"
  docker ps --format "table {{.Names}}\t{{.Status}}"
  exit 1
fi

echo "✅ Found backend container: $BACKEND_CONTAINER"

# Run migration
echo "📊 Running Prisma migration..."
docker exec "$BACKEND_CONTAINER" npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma

# Verify migration
echo "🔍 Verifying migration status..."
docker exec "$BACKEND_CONTAINER" npx prisma migrate status --schema=/app/infra/prisma/schema.prisma

echo "✅ Migration completed successfully for $ENV!"
```

### Usage:

```bash
# Make executable
chmod +x migrate-on-coolify.sh

# Run for stage
./migrate-on-coolify.sh stage

# Run for production
./migrate-on-coolify.sh production
```

---

## Environment-Specific Considerations

### Development Environment
- Migrations run automatically via `make dev`
- Database can be reset freely
- Use `pnpm prisma:migrate` or `make migrate`

### Stage Environment (stage.geckoadvisor.com)
- Manual migration required after Coolify deployment
- Test migrations here before production
- Database backed up regularly
- Use `./migrate-on-coolify.sh stage`

### Production Environment (geckoadvisor.com)
- **CRITICAL:** Always backup before migration
- Run during maintenance window if possible
- Monitor closely after migration
- Have rollback plan ready
- Use `./migrate-on-coolify.sh production`

---

## Database Connection Details

### Environment Variables

Ensure these are set in Coolify:

```bash
# Backend and Worker containers need:
DATABASE_URL="postgresql://postgres:password@db:5432/privacy"

# For production, use external database:
DATABASE_URL="postgresql://user:password@external-db.com:5432/privacy"
```

### Verifying Database Connection

```bash
# Test connection from backend container
docker exec privacy-advisor-backend-1 npx prisma db pull --schema=/app/infra/prisma/schema.prisma

# Test from worker container
docker exec privacy-advisor-worker-1 npx prisma db pull --schema=/app/infra/prisma/schema.prisma
```

---

## Performance Optimizations Migration

Privacy Advisor includes critical performance optimization migrations. See `infra/prisma/migrations/DEPLOYMENT_GUIDE.md` for detailed instructions.

### Key Migration Files:
- `20251005000001_critical_performance_optimizations` - Adds covering indexes
- `20251005000002_index_cleanup` - Removes redundant indexes
- `ROLLBACK_20251005000001_critical_performance_optimizations.sql` - Emergency rollback

### Running Performance Migrations:

```bash
# Standard deployment
docker exec privacy-advisor-backend-1 npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma

# Verify index creation
docker exec -it privacy-advisor-db-1 psql -U postgres -d privacy -c "
  SELECT indexname FROM pg_indexes
  WHERE tablename IN ('Scan', 'Evidence', 'Issue')
  ORDER BY indexname;
"
```

---

## Summary

### Recommended Workflow for Coolify

1. **Push code to Git** → Coolify auto-deploys containers
2. **SSH into Coolify server**
3. **Run migration** using Docker exec
4. **Verify health** via API endpoints
5. **Monitor logs** for any issues

### Quick Commands Cheat Sheet

```bash
# Find backend container
docker ps | grep backend

# Run migration
docker exec <backend-container> npm exec --yes prisma migrate deploy -- --schema=/app/infra/prisma/schema.prisma

# Check migration status
docker exec <backend-container> npx prisma migrate status --schema=/app/infra/prisma/schema.prisma

# View logs
docker logs -f <backend-container>

# Health check
curl https://stage.geckoadvisor.com/api/health
```

---

## Additional Resources

- **Prisma Migrate Docs:** https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Coolify Docs:** https://coolify.io/docs
- **Project Makefile:** `/Makefile` (lines 41-45)
- **Migration Files:** `/infra/prisma/migrations/`
- **Deployment Guide:** `/infra/prisma/migrations/DEPLOYMENT_GUIDE.md`

---

**Need Help?**

Check project documentation:
- `/CLAUDE.md` - Project overview and commands
- `/README.md` - General project information
- `/infra/prisma/migrations/DEPLOYMENT_GUIDE.md` - Detailed migration guide

**Still stuck?** Check Coolify logs and Privacy Advisor backend logs for error details.
