#!/bin/bash
# Test rate limiting for scan status endpoint

set -e

API_URL="${API_URL:-https://stageapi.geckoadvisor.com}"
SCAN_ID="${1:-}"

if [ -z "$SCAN_ID" ]; then
  echo "Usage: $0 <scan-id>"
  echo "Example: $0 abc123def456"
  exit 1
fi

echo "Testing rate limiting for scan status endpoint"
echo "API URL: $API_URL"
echo "Scan ID: $SCAN_ID"
echo ""

# Test 1: Poll status 60 times (1 per second)
echo "Test 1: Poll status 60 times (should all succeed)"
echo "---------------------------------------------------"
SUCCESS_COUNT=0
ERROR_COUNT=0

for i in {1..60}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/scan/$SCAN_ID/status")

  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo "[$i/60] ✓ 200 OK"
  else
    ERROR_COUNT=$((ERROR_COUNT + 1))
    echo "[$i/60] ✗ $HTTP_CODE ERROR"
  fi

  sleep 1
done

echo ""
echo "Test 1 Results:"
echo "Success: $SUCCESS_COUNT/60"
echo "Errors: $ERROR_COUNT/60"
echo ""

# Test 2: Rapid fire 100 requests (should hit rate limit)
echo "Test 2: Rapid fire 100 requests (should hit limit after 300)"
echo "--------------------------------------------------------------"
SUCCESS_COUNT=0
RATE_LIMIT_COUNT=0

for i in {1..100}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/scan/$SCAN_ID/status")

  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
  fi

  # Show progress every 10 requests
  if [ $((i % 10)) -eq 0 ]; then
    echo "[$i/100] Success: $SUCCESS_COUNT | Rate Limited: $RATE_LIMIT_COUNT"
  fi
done

echo ""
echo "Test 2 Results:"
echo "Success: $SUCCESS_COUNT/100"
echo "Rate Limited: $RATE_LIMIT_COUNT/100"
echo ""

# Test 3: Check rate limit headers
echo "Test 3: Check rate limit headers"
echo "---------------------------------"
RESPONSE=$(curl -s -v "$API_URL/api/v1/scan/$SCAN_ID/status" 2>&1)
echo "$RESPONSE" | grep -i "ratelimit" || echo "No RateLimit headers found"
echo ""

# Summary
echo "========================================="
echo "SUMMARY"
echo "========================================="
echo ""
echo "Expected behavior:"
echo "- Test 1: All 60 requests should succeed (60/60)"
echo "- Test 2: First ~100 should succeed, rest rate limited"
echo "- Test 3: Should show RateLimit-Limit: 300"
echo ""
echo "If Test 1 shows errors, rate limit is too strict."
echo "If Test 2 never rate limits, rate limit is not enforced."
