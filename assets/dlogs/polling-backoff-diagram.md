# Exponential Backoff Flow Diagram

## Normal Polling Flow (No Rate Limiting)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SCAN STARTED                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                   ┌───────────┐
                   │ Progress: │
                   │   0-30%   │
                   │  Poll: 3s │
                   └─────┬─────┘
                         │ wait 3 seconds
                         ▼
                   ┌───────────┐
                   │ Progress: │
                   │  30-70%   │
                   │ Poll: 2.5s│
                   └─────┬─────┘
                         │ wait 2.5 seconds
                         ▼
                   ┌───────────┐
                   │ Progress: │
                   │ 70-100%   │
                   │  Poll: 2s │
                   └─────┬─────┘
                         │ wait 2 seconds
                         ▼
                   ┌───────────┐
                   │   DONE    │
                   │ Stop Poll │
                   └───────────┘

Total Time: ~30-60 seconds
Total Requests: ~12-20
Success Rate: 100%
```

---

## Rate Limiting Flow (With Exponential Backoff)

```
┌─────────────────────────────────────────────────────────────────┐
│                         SCAN STARTED                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Normal Polling Begins │
            │   Poll every 2-3s      │
            └────────┬───────────────┘
                     │
                     │ Request #1-10: Success (200 OK)
                     │ Request #11-14: Success (200 OK)
                     │
                     ▼
            ┌────────────────────────┐
            │  Request #15: 429 ❌   │
            │   RATE LIMIT HIT!      │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │  Backoff Level: 1      │
            │  Wait: 2 seconds       │
            │  Show info banner      │
            └────────┬───────────────┘
                     │ wait 2s
                     ▼
            ┌────────────────────────┐
            │  Request #16: 429 ❌   │ (still rate limited)
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │  Backoff Level: 2      │
            │  Wait: 4 seconds       │
            └────────┬───────────────┘
                     │ wait 4s
                     ▼
            ┌────────────────────────┐
            │  Request #17: 429 ❌   │ (still rate limited)
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │  Backoff Level: 3      │
            │  Wait: 8 seconds       │
            └────────┬───────────────┘
                     │ wait 8s
                     ▼
            ┌────────────────────────┐
            │  Request #18: 200 ✅   │ (rate limit cleared!)
            │  Reset backoff to 0    │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │  Resume Normal Polling │
            │  Wait: 2-3s per stage  │
            │  Hide info banner      │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │       SCAN DONE        │
            │      Stop Polling      │
            └────────────────────────┘

Total Time: ~40-90 seconds (with rate limiting)
Total Requests: ~15-25
Success Rate: 100% (graceful handling)
User Experience: Transparent, informed
```

---

## Exponential Backoff Timeline

```
Time →   0s    2s    4s    6s    10s   18s   26s   34s   42s   50s
         │     │     │     │     │     │     │     │     │     │
Req #1   ●─────●─────●─────●─────●─────●─────●─────●─────●─────●
         200   200   200   200   200   200   200   200   200   200
         OK    OK    OK    OK    OK    OK    OK    OK    OK    OK

         Normal polling at 2s intervals → All successful
         ═══════════════════════════════════════════════════════════


Time →   0s    2s    4s    6s    10s   14s   20s   28s   36s   50s
         │     │     │     │     │     │     │     │     │     │
Req #1   ●─────●─────●─────●─────●─────●─────●─────●─────●─────●
         200   200   200   200   200   429   429   429   200   200
         OK    OK    OK    OK    OK    ❌    ❌    ❌    ✅    OK
                                       │     │     │     │
                                       │     │     │     └─ Success! Reset to 2s
                                       │     │     └─ Wait 8s (2^3 = 8)
                                       │     └─ Wait 4s (2^2 = 4)
                                       └─ Wait 2s (2^1 = 2)

         With rate limiting → Exponential backoff → Auto recovery
         ═══════════════════════════════════════════════════════════
```

---

## Backoff Calculation Table

| Attempt | Consecutive 429s | Formula | Wait Time | Total Elapsed |
|---------|------------------|---------|-----------|---------------|
| **1** (first 429) | 1 | `2000 * 2^(1-1)` | 2s | 2s |
| **2** (second 429) | 2 | `2000 * 2^(2-1)` | 4s | 6s |
| **3** (third 429) | 3 | `2000 * 2^(3-1)` | 8s | 14s |
| **4** (fourth 429) | 4 | `2000 * 2^(4-1)` | 15s (capped) | 29s |
| **5+** (ongoing) | 5+ | `min(2000 * 2^n, 15000)` | 15s (max) | +15s each |

**Maximum backoff:** 15 seconds (prevents excessive delays)
**Maximum duration:** 5 minutes (then gives up if still rate limited)
**Auto-reset:** On any successful 200 response

---

## State Transitions

```
                    ┌──────────────────────────┐
                    │   INITIAL STATE          │
                    │ consecutiveRateLimits=0  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  First Request (200 OK)  │
                    │  consecutiveRateLimits=0 │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  More Requests (200 OK)  │
                    │  consecutiveRateLimits=0 │
                    └──┬─────────────────────┬─┘
                       │                     │
             (200 OK)  │                     │  (429 Error)
                       │                     │
                       ▼                     ▼
            ┌──────────────────┐   ┌────────────────────┐
            │ Continue Normal  │   │  RATE LIMITED      │
            │ Polling 2-3s     │   │  consecutiveRate   │
            │ Interval         │   │  Limits++          │
            └──────────────────┘   └────────┬───────────┘
                                             │
                                             │
                    ┌────────────────────────▼────────────────┐
                    │         Calculate Backoff               │
                    │  interval = min(2000 * 2^count, 15000)  │
                    └────────────────────┬────────────────────┘
                                         │
                                         │
                    ┌────────────────────▼─────────────────┐
                    │     Wait (exponential interval)      │
                    │     Show info banner to user         │
                    │     Log warning to console           │
                    └────────────────────┬─────────────────┘
                                         │
                    ┌────────────────────▼────────────────┐
                    │        Retry Request                │
                    └──┬──────────────────────────────┬───┘
                       │                              │
             (200 OK)  │                              │  (429 Again)
                       │                              │
                       ▼                              │
            ┌──────────────────────┐                  │
            │  RECOVERY             │                  │
            │  consecutiveRate      │                  │
            │  Limits = 0           │                  │
            │  Hide info banner     │                  │
            │  Resume normal poll   │                  │
            └───────────────────────┘                  │
                                                       │
                                                       │
                                    ┌──────────────────▼────────┐
                                    │  Increase Backoff Level   │
                                    │  consecutiveRateLimits++  │
                                    │  (loop to calculate)      │
                                    └───────────────────────────┘

```

---

## User Experience Flow

### Scenario 1: Normal Scan (No Rate Limiting)

```
┌─────────────────────────────────────────────────────────┐
│ USER STARTS SCAN                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scanning in Progress"                              │
│ Progress: [●●●○○○○○○○] 30%                             │
│ Status: "Analyzing content" 🔍                          │
└────────────┬────────────────────────────────────────────┘
             │ (polling every 3s)
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scanning in Progress"                              │
│ Progress: [●●●●●●○○○○] 60%                             │
│ Status: "Checking trackers" 🎯                          │
└────────────┬────────────────────────────────────────────┘
             │ (polling every 2.5s)
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scanning in Progress"                              │
│ Progress: [●●●●●●●●●○] 90%                             │
│ Status: "Finalizing report" ✅                          │
└────────────┬────────────────────────────────────────────┘
             │ (polling every 2s)
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scan Complete!"                                    │
│ Progress: [●●●●●●●●●●] 100%                            │
│ Button: "View Report" → Navigate to /r/slug            │
└─────────────────────────────────────────────────────────┘

✅ Smooth experience, predictable timing, ~30-60 seconds
```

---

### Scenario 2: Scan with Rate Limiting

```
┌─────────────────────────────────────────────────────────┐
│ USER STARTS SCAN                                        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scanning in Progress"                              │
│ Progress: [●●●●○○○○○○] 40%                             │
│ Status: "Analyzing content" 🔍                          │
└────────────┬────────────────────────────────────────────┘
             │ (polling normally)
             │ Request #14 succeeds...
             │ Request #15 → 429 ❌
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scanning in Progress"                              │
│ Progress: [●●●●○○○○○○] 40% (same)                      │
│ Status: "Analyzing content" 🔍                          │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ℹ️  Automatic Rate Limit Protection              │   │
│ │                                                  │   │
│ │ We're automatically slowing down status checks  │   │
│ │ to respect server limits. Your scan is still    │   │
│ │ running normally. We'll automatically speed up  │   │
│ │ again once the rate limit clears.               │   │
│ └─────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────┘
             │ (waiting 2s... then 4s... then 8s...)
             │ Console: "[Polling] Rate limited. Backing off..."
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scanning in Progress"                              │
│ Progress: [●●●●●●○○○○] 60%                             │
│ Status: "Checking trackers" 🎯                          │
│                                                         │
│ (Info banner removed - rate limit cleared)             │
└────────────┬────────────────────────────────────────────┘
             │ (back to normal polling)
             │ Console: "[Polling] Rate limit cleared..."
             ▼
┌─────────────────────────────────────────────────────────┐
│ UI: "Scan Complete!"                                    │
│ Progress: [●●●●●●●●●●] 100%                            │
│ Button: "View Report" → Navigate to /r/slug            │
└─────────────────────────────────────────────────────────┘

✅ Transparent handling, user informed, scan completes successfully
⏱️ Slightly longer total time (+10-30s) but better than error state
```

---

## Console Logging Examples

### Normal Polling (Success)
```javascript
// No special logging, just standard React Query debug logs
[QueryClient] Query ['scan', 'abc123'] data updated
[QueryClient] Query ['scan', 'abc123'] data updated (progress: 45%)
[QueryClient] Query ['scan', 'abc123'] data updated (progress: 67%)
[QueryClient] Query ['scan', 'abc123'] data updated (status: done)
```

### Rate Limited (Backoff)
```javascript
[QueryClient] Query ['scan', 'abc123'] failed: Rate limit exceeded
⚠️ [Polling] Rate limited. Backing off to 2000ms. Attempt 1

// 2 seconds later
[QueryClient] Query ['scan', 'abc123'] retry attempt 1
[QueryClient] Query ['scan', 'abc123'] failed: Rate limit exceeded
⚠️ [Polling] Rate limited. Backing off to 4000ms. Attempt 2

// 4 seconds later
[QueryClient] Query ['scan', 'abc123'] retry attempt 2
[QueryClient] Query ['scan', 'abc123'] failed: Rate limit exceeded
⚠️ [Polling] Rate limited. Backing off to 8000ms. Attempt 3

// 8 seconds later
[QueryClient] Query ['scan', 'abc123'] retry attempt 3
[QueryClient] Query ['scan', 'abc123'] data updated (progress: 52%)
ℹ️ [Polling] Rate limit cleared. Resetting to normal interval.
```

### Maximum Rate Limit Duration
```javascript
⚠️ [Polling] Rate limited. Backing off to 2000ms. Attempt 1
⚠️ [Polling] Rate limited. Backing off to 4000ms. Attempt 2
⚠️ [Polling] Rate limited. Backing off to 8000ms. Attempt 3
⚠️ [Polling] Rate limited. Backing off to 15000ms. Attempt 4
⚠️ [Polling] Rate limited. Backing off to 15000ms. Attempt 5
⚠️ [Polling] Rate limited. Backing off to 15000ms. Attempt 6
...
❌ [Polling] Rate limited for too long. Stopping retries.
[QueryClient] Query ['scan', 'abc123'] errored permanently
```

---

## Algorithm Pseudocode

```python
# Initialize state
consecutiveRateLimits = 0
lastSuccessTime = currentTime()
MAX_BACKOFF = 15000  # 15 seconds
MAX_DURATION = 300000  # 5 minutes

function getPollingInterval(queryState):
    data = queryState.data
    error = queryState.error

    # Stop polling when done
    if data.status == 'done' or data.status == 'error':
        return False  # Stop polling

    # Handle rate limiting with exponential backoff
    if error and error.status == 429:
        consecutiveRateLimits += 1
        backoffInterval = min(2000 * (2 ** (consecutiveRateLimits - 1)), MAX_BACKOFF)
        log_warn(f"Rate limited. Backing off to {backoffInterval}ms")
        return backoffInterval

    # Reset on success
    if data and not error:
        if consecutiveRateLimits > 0:
            log_info("Rate limit cleared. Resetting to normal interval")
        consecutiveRateLimits = 0
        lastSuccessTime = currentTime()

    # Normal adaptive polling
    if not data:
        return 2000  # Initial fetch

    progress = data.progress or 0
    if progress < 30:
        return 3000  # Early stage
    elif progress < 70:
        return 2500  # Mid stage
    else:
        return 2000  # Final stage

function shouldRetry(failureCount, error):
    # Never retry 404 errors
    if error.message.includes('Scan not found'):
        return False

    # For rate limits, check timeout
    if error.status == 429:
        timeSinceSuccess = currentTime() - lastSuccessTime
        if timeSinceSuccess > MAX_DURATION:
            log_error("Rate limited for too long. Stopping retries")
            return False
        return True  # Keep retrying with backoff

    # Other errors: max 3 retries
    return failureCount < 3
```

---

## Key Takeaways

1. **Exponential Growth:** Each retry doubles the wait time (2s → 4s → 8s)
2. **Capped Maximum:** Never wait longer than 15 seconds
3. **Automatic Reset:** Success immediately returns to normal 2-3s polling
4. **User Transparency:** Banner informs users what's happening
5. **Graceful Degradation:** Scan completes successfully despite rate limiting
6. **Safety Timeout:** Gives up after 5 minutes of continuous rate limiting

This approach balances:
- ✅ Respectful API usage (exponential backoff)
- ✅ User experience (transparent, informative)
- ✅ Scan completion (automatic recovery)
- ✅ Performance (faster when possible, slower when needed)
