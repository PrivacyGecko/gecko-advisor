# Polling Fix - Quick Reference Guide

## TL;DR

**Problem:** Frontend polling `/api/scan/:id/status` every 1-1.5 seconds → 429 errors after ~14 requests
**Solution:** Increased intervals to 2-3 seconds + exponential backoff on 429 errors
**Result:** 40% fewer requests, graceful rate limit handling, better UX

---

## What Changed

### Polling Intervals

| Progress Stage | Before | After | Change |
|---------------|--------|-------|--------|
| Initial (0%) | 2s | 2s | Same |
| Early (0-30%) | 1.5s | 3s | +100% slower |
| Mid (30-70%) | 2s | 2.5s | +25% slower |
| Final (70-100%) | 1s | 2s | +100% slower |

### New Features

1. **Exponential Backoff:** 2s → 4s → 8s → 15s (max) on 429 errors
2. **Auto-Recovery:** Resets to 2s on successful response
3. **Better Errors:** Context-aware messages instead of generic "error"
4. **Info Banner:** Transparent communication during rate limiting
5. **Smart Retry:** Unlimited retries for 429, max 3 for other errors

---

## Files Modified

1. **`apps/frontend/src/lib/api.ts`** (Lines 26-133)
   - Added 429 detection in `getScanStatus()`
   - Rewrote `scanStatusQueryOptions()` with exponential backoff
   - Added state tracking and logging

2. **`apps/frontend/src/pages/Scan.tsx`** (Lines 22-92)
   - Added `isRateLimited` state
   - Enhanced error messages
   - Added informational banner

---

## How Exponential Backoff Works

```
429 Error #1 → Wait 2 seconds  → Retry
429 Error #2 → Wait 4 seconds  → Retry
429 Error #3 → Wait 8 seconds  → Retry
429 Error #4 → Wait 15 seconds → Retry (capped)
200 Success  → Reset to 2s     → Normal polling
```

**Formula:** `min(2000 * 2^(attempts-1), 15000)` milliseconds

**Safety:** Gives up after 5 minutes of continuous rate limiting

---

## User Experience

### Normal Scan
- Progress updates every 2-3 seconds
- Completes in 30-60 seconds
- ~12-20 total requests
- Smooth, predictable

### With Rate Limiting
- First 10-14 requests succeed
- 15th request hits 429
- Info banner appears explaining delay
- Automatic backoff (2s, 4s, 8s...)
- Recovers when rate limit clears
- Banner disappears
- Scan completes successfully
- Total time: +10-30 seconds

---

## Console Logs

### Normal Operation
```
[QueryClient] Query ['scan', 'abc'] data updated
```

### Rate Limited
```
⚠️ [Polling] Rate limited. Backing off to 2000ms. Attempt 1
⚠️ [Polling] Rate limited. Backing off to 4000ms. Attempt 2
ℹ️ [Polling] Rate limit cleared. Resetting to normal interval.
```

### Timeout
```
❌ [Polling] Rate limited for too long. Stopping retries.
```

---

## Testing Checklist

### Manual Testing
- [ ] Start a scan, verify 2-3s polling (check Network tab)
- [ ] Refresh page multiple times to trigger 429
- [ ] Confirm exponential backoff in console logs
- [ ] Verify info banner displays during rate limiting
- [ ] Confirm automatic recovery (banner disappears)
- [ ] Verify scan completes successfully
- [ ] Test error messages are clear
- [ ] Check mobile responsiveness of banner

### Automated Testing
```bash
cd apps/frontend
pnpm build     # Should pass
pnpm typecheck # Existing errors unrelated
pnpm lint      # Should pass
```

---

## Deployment

### Stage
```bash
# Build frontend
cd apps/frontend
pnpm build

# Deploy to stage
# (your deployment process here)
```

### Production
```bash
# After 24-48 hours stable on stage
# Same build and deployment process
```

---

## Monitoring

Watch for:
- 429 error rate in backend logs
- Average scan completion time (should be ~30-60s, up to 90s with rate limiting)
- User complaints about slow scans
- Console warnings about exponential backoff
- Scans timing out (shouldn't happen)

---

## Rollback

If needed:
```bash
git revert <commit-hash>
cd apps/frontend
pnpm build
# Redeploy
```

Previous aggressive polling resumes. Consider adjusting backend rate limiter instead.

---

## Future Improvements

### High Priority
- Adjust backend rate limiter to allow more status checks
- Or exclude `/api/scan/:id/status` from rate limiting

### Nice to Have
- WebSocket implementation for real-time updates
- Client-side caching (500ms)
- ML-based progress prediction
- User preference for polling speed

---

## Support

### Issues?
- Check browser console for polling logs
- Verify Network tab shows 2-3s intervals
- Look for 429 responses and exponential backoff
- Confirm info banner appears during rate limiting

### Questions?
- See full report: `assets/dlogs/polling-fix-report.md`
- See diagram: `assets/dlogs/polling-backoff-diagram.md`
- Check stage test report: `assets/dlogs/stage-test-report.md`

---

## Key Metrics

| Metric | Target | How to Check |
|--------|--------|--------------|
| **Average polling interval** | 2-3s | Network tab timestamps |
| **Requests per 30s** | ~12 | Count network requests |
| **429 error recovery** | Automatic | Console logs + banner |
| **Scan completion rate** | 95%+ | Monitor success/failure |
| **User error clarity** | High | User feedback |

---

**Status:** ✅ Ready for Stage Deployment
**Risk Level:** Low (graceful degradation, automatic recovery)
**Rollback:** Easy (single commit revert)
