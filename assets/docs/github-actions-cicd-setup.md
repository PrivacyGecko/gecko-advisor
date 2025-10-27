# GitHub Actions CI/CD Setup Guide

This guide explains how to set up GitHub Actions to build Docker images and deploy via Coolify using GitHub Container Registry (GHCR).

## Problem Solved

**Issue:** On-server Docker builds on CCX13 (2 vCPU, 8GB RAM) cause deployment failures due to:
- Disk space exhaustion (`no space left on device`)
- CPU/RAM overload during parallel builds
- 15-20 minute build times blocking deployments

**Solution:** Build Docker images in GitHub Actions (8-core runners, 14GB RAM) and push to GHCR. Coolify pulls pre-built images in <2 minutes.

## Architecture

### Before (On-Server Builds)
```
Push to Git → Coolify → Build 3 images on CCX13 → Deploy
                         ↓
                    CPU/RAM overload
                    Disk space issues
                    15-20 min builds
```

### After (GitHub Actions CI/CD)
```
Push to Git → GitHub Actions → Build 3 images on GitHub (8 cores)
                              → Push to ghcr.io
                              ↓
              Coolify → Pull pre-built images → Deploy
                       (< 2 minutes)
```

## Setup Steps

### 1. Enable GitHub Packages

The workflows are already created:
- `.github/workflows/build-stage.yml` - Triggers on push to `stage` branch
- `.github/workflows/build-prod.yml` - Triggers on push to `main` branch or tags

These workflows automatically:
- Build frontend, backend, and worker images in parallel
- Use GitHub's build cache for fast rebuilds
- Push to `ghcr.io/pothamsetty/privacy-advisor-{service}:stage-latest`
- Tag with commit SHA for version tracking

### 2. Configure GitHub Repository

**2.1 Make Packages Public (Optional but Recommended)**

Go to: https://github.com/pothamsetty/Privacy-Advisor/packages

For each package (frontend, backend, worker):
1. Click package name
2. Click "Package settings"
3. Scroll to "Danger Zone"
4. Click "Change visibility" → "Public"

This allows Coolify to pull without authentication.

**Alternative:** Keep private and configure Coolify with GitHub PAT (see step 4).

### 3. Test GitHub Actions

**3.1 Push to Stage Branch**
```bash
git push origin stage
```

**3.2 Monitor Build**
- Go to: https://github.com/pothamsetty/Privacy-Advisor/actions
- Click on the running workflow
- Verify all 3 services build successfully (~5-8 minutes first run)

**3.3 Verify Images**
- Go to: https://github.com/pothamsetty?tab=packages
- Verify 3 packages exist:
  - `privacy-advisor-frontend`
  - `privacy-advisor-backend`
  - `privacy-advisor-worker`
- Each should have `stage-latest` tag

### 4. Configure Coolify for GHCR

**4.1 Update Compose File Path**

In Coolify project settings:
- Old: `COMPOSE_FILE=infra/docker/docker-compose.yml:infra/docker/docker-compose.stage.yml`
- New: `COMPOSE_FILE=infra/docker/docker-compose.yml:infra/docker/docker-compose.stage.ghcr.yml`

**4.2 Set Environment Variable**

Add to Coolify environment variables:
```bash
GITHUB_REPOSITORY_OWNER=pothamsetty
```

**4.3 Authentication (Only if packages are private)**

If packages are private, add GitHub PAT to Coolify:

1. Create GitHub Personal Access Token:
   - Go to: https://github.com/settings/tokens/new
   - Name: "Coolify GHCR Pull"
   - Scopes: `read:packages`
   - Expiration: 90 days (or No expiration)
   - Generate token

2. Add to Coolify project environment:
   ```bash
   GHCR_TOKEN=ghp_your_token_here
   ```

3. Add to docker-compose.stage.ghcr.yml (if needed):
   ```yaml
   services:
     frontend:
       image: ghcr.io/pothamsetty/privacy-advisor-frontend:stage-latest
       environment:
         - GHCR_TOKEN=${GHCR_TOKEN}
   ```

### 5. Clean Server Disk Space

Before first deployment with new images, clean up old builds:

**5.1 SSH into Server**
```bash
ssh root@65.108.148.246
```

**5.2 Clean Docker Resources**
```bash
# Remove all stopped containers
docker container prune -f

# Remove all unused images (WARNING: This removes ALL images)
docker image prune -a -f

# Remove all unused volumes
docker volume prune -f

# Remove build cache
docker builder prune -a -f

# Check disk space
df -h
```

**Expected Result:** Free up 5-10 GB

### 6. Deploy with Pre-built Images

**6.1 Trigger Deployment**
- Push changes to `stage` branch
- Wait for GitHub Actions to complete (~5-8 min)
- Coolify auto-deploys by pulling images (~1-2 min)

**6.2 Monitor Deployment**
- Coolify should show: "Pulling image ghcr.io/pothamsetty/privacy-advisor-frontend:stage-latest"
- No build steps (no "RUN pnpm install", etc.)
- Fast deployment (<2 minutes total)

## Workflow Details

### Stage Workflow (build-stage.yml)

**Triggers:**
- Push to `stage` branch
- Manual trigger via GitHub Actions UI

**Image Tags Created:**
- `stage-latest` - Always points to latest stage build
- `stage-{commit-sha}` - Specific commit version
- `stage` - Branch reference

**Build Time:** ~5-8 minutes (first run), ~2-3 minutes (cached)

### Production Workflow (build-prod.yml)

**Triggers:**
- Push to `main` branch
- Git tags matching `v*.*.*` (e.g., v1.0.0)
- Manual trigger via GitHub Actions UI

**Image Tags Created:**
- `prod-latest` - Always points to latest production build
- `prod-{commit-sha}` - Specific commit version
- `v1.0.0` - Semver tag (if triggered by git tag)
- `1.0` - Major.minor version (if triggered by git tag)

## Troubleshooting

### Issue: "Error response from daemon: pull access denied"

**Cause:** Packages are private and Coolify doesn't have authentication.

**Fix:**
1. Make packages public (recommended), OR
2. Add GHCR_TOKEN to Coolify environment

### Issue: "no such image"

**Cause:** GitHub Actions build hasn't completed or failed.

**Fix:**
1. Check GitHub Actions: https://github.com/pothamsetty/Privacy-Advisor/actions
2. Verify build completed successfully
3. Check package exists: https://github.com/pothamsetty?tab=packages

### Issue: Old image cached

**Cause:** Docker cached old image despite `pull_policy: always`.

**Fix:**
```bash
# On Coolify server
docker image rm ghcr.io/pothamsetty/privacy-advisor-frontend:stage-latest
docker image rm ghcr.io/pothamsetty/privacy-advisor-backend:stage-latest
docker image rm ghcr.io/pothamsetty/privacy-advisor-worker:stage-latest

# Redeploy in Coolify
```

## Benefits

✅ **No more disk space errors** - Builds happen in GitHub's infrastructure
✅ **Faster deployments** - 15-20 min → 1-2 min
✅ **No server overload** - CCX13 only pulls images, doesn't build
✅ **Build caching** - GitHub Actions caches layers for fast rebuilds
✅ **Version control** - Every commit gets a tagged image
✅ **Rollback capability** - Can deploy any previous commit SHA
✅ **Parallel builds** - All 3 services build simultaneously in GitHub

## Monitoring

### Check Build Status
```bash
# GitHub Actions
https://github.com/pothamsetty/Privacy-Advisor/actions

# GitHub Packages
https://github.com/pothamsetty?tab=packages
```

### Check Deployment
```bash
# On Coolify server
docker ps
docker images | grep ghcr.io

# Check which image is running
docker inspect frontend-container | grep "Image"
```

## Rollback Procedure

If a deployment fails, rollback to previous commit:

**Option 1: Via Git**
```bash
# Revert to previous commit
git revert HEAD
git push origin stage

# GitHub Actions builds old version
# Coolify auto-deploys
```

**Option 2: Via Image Tag**
Update docker-compose.stage.ghcr.yml:
```yaml
services:
  frontend:
    image: ghcr.io/pothamsetty/privacy-advisor-frontend:stage-abc1234  # Specific commit
```

## Maintenance

### Clean Old Images

GitHub Actions automatically manages build cache. To clean old package versions:

1. Go to: https://github.com/pothamsetty?tab=packages
2. Click package name
3. Click "Package settings"
4. Scroll to "Manage versions"
5. Delete old tags (keep last 5-10)

### Update Workflows

Workflows are in:
- `.github/workflows/build-stage.yml`
- `.github/workflows/build-prod.yml`

After updating, commit and push to trigger new builds.

## Cost Considerations

- **GitHub Actions:** 2,000 free minutes/month for private repos (plenty for this project)
- **GitHub Packages Storage:** 500MB free for private repos, unlimited for public
- **Bandwidth:** Unlimited for public packages

Recommendation: **Make packages public** to avoid any limits.

## Next Steps

After successful setup:

1. ✅ Verify all 3 packages building in GitHub Actions
2. ✅ Verify Coolify pulling images successfully
3. ✅ Clean up old Docker builds on server
4. ✅ Monitor first few deployments
5. ✅ Set up same process for production (main branch)
6. Document any team-specific customizations

## Support

- GitHub Actions docs: https://docs.github.com/en/actions
- GitHub Packages docs: https://docs.github.com/en/packages
- Coolify docs: https://coolify.io/docs
