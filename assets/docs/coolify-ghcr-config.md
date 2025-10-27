# Coolify GHCR Configuration Quick Reference

## Configuration Changes for Using Pre-built Images

### 1. Compose File Path

**Location:** Coolify Project Settings → Build Configuration

**Change from:**
```
infra/docker/docker-compose.yml:infra/docker/docker-compose.stage.yml
```

**Change to:**
```
infra/docker/docker-compose.yml:infra/docker/docker-compose.stage.ghcr.yml
```

### 2. Environment Variables

**Location:** Coolify Project Settings → Environment Variables

**Add this variable:**
```bash
GITHUB_REPOSITORY_OWNER=pothamsetty
```

### 3. Verify Image Configuration

The new compose override file uses these images:
- Frontend: `ghcr.io/pothamsetty/privacy-advisor-frontend:stage-latest`
- Backend: `ghcr.io/pothamsetty/privacy-advisor-backend:stage-latest`
- Worker: `ghcr.io/pothamsetty/privacy-advisor-worker:stage-latest`

All images are **public** (no authentication needed).

### 4. Deploy

After updating configuration:
1. Trigger a new deployment in Coolify
2. Watch logs - you should see "Pulling image ghcr.io/..." instead of build steps
3. Deployment should complete in ~1-2 minutes

### Expected Deployment Behavior

**Before (On-server builds):**
```
Building backend...
[+] Building 180.7s
... (15-20 minutes)
```

**After (Pre-built images):**
```
Pulling backend...
sha256:abc123... Pulling fs layer
sha256:abc123... Download complete
... (1-2 minutes)
```

### Troubleshooting

**Issue: "Error response from daemon: pull access denied"**
- **Cause:** Package is still private
- **Fix:** Go to https://github.com/pothamsetty?tab=packages → Make packages public

**Issue: "no such image"**
- **Cause:** Tag doesn't exist
- **Fix:** Verify GitHub Actions built successfully, check package has `stage-latest` tag

**Issue: Old image cached**
- **Cause:** Docker using cached image
- **Fix:** SSH to server, run `docker image rm ghcr.io/pothamsetty/privacy-advisor-*:stage-latest`

### Rollback

If you need to go back to on-server builds:
1. Change compose file path back to `docker-compose.stage.yml`
2. Remove `GITHUB_REPOSITORY_OWNER` variable
3. Redeploy
