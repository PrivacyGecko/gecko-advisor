#!/bin/bash

# Test Rate Limiting for Privacy Advisor
# Tests 3 scans/day for free tier and unlimited for Pro tier

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"
BACKEND_DIR="/Users/pothamsettyk/Projects/Privacy-Advisor/apps/backend"

echo "🔍 Privacy Advisor - Rate Limiting Test Suite"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to make API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local headers=$4
  
  curl -s -X "$method" "$API_BASE_URL$endpoint" \
    -H "Content-Type: application/json" \
    $headers \
    ${data:+-d "$data"}
}

# Test 1: Anonymous user - First scan should work
echo "Test 1: Anonymous user - First scan"
response=$(api_call POST "/api/v2/scan" '{"url":"https://example.com"}')
if echo "$response" | jq -e '.scanId' > /dev/null 2>&1; then
  rate_limit=$(echo "$response" | jq -r '.rateLimit')
  scans_used=$(echo "$rate_limit" | jq -r '.scansUsed')
  scans_remaining=$(echo "$rate_limit" | jq -r '.scansRemaining')
  
  if [ "$scans_used" = "1" ] && [ "$scans_remaining" = "2" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - First scan succeeded (1/3 used)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} - Rate limit info incorrect (got $scans_used used, $scans_remaining remaining)"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ FAILED${NC} - First scan failed: $response"
  ((TESTS_FAILED++))
fi
echo ""

# Test 2: Anonymous user - Second scan should work
echo "Test 2: Anonymous user - Second scan"
response=$(api_call POST "/api/v2/scan" '{"url":"https://test.com"}')
if echo "$response" | jq -e '.scanId' > /dev/null 2>&1; then
  scans_used=$(echo "$response" | jq -r '.rateLimit.scansUsed')
  scans_remaining=$(echo "$response" | jq -r '.rateLimit.scansRemaining')
  
  if [ "$scans_used" = "2" ] && [ "$scans_remaining" = "1" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Second scan succeeded (2/3 used)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} - Rate limit info incorrect"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Second scan failed"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3: Anonymous user - Third scan should work
echo "Test 3: Anonymous user - Third scan"
response=$(api_call POST "/api/v2/scan" '{"url":"https://demo.com"}')
if echo "$response" | jq -e '.scanId' > /dev/null 2>&1; then
  scans_used=$(echo "$response" | jq -r '.rateLimit.scansUsed')
  scans_remaining=$(echo "$response" | jq -r '.rateLimit.scansRemaining')
  
  if [ "$scans_used" = "3" ] && [ "$scans_remaining" = "0" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Third scan succeeded (3/3 used)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} - Rate limit info incorrect"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Third scan failed"
  ((TESTS_FAILED++))
fi
echo ""

# Test 4: Anonymous user - Fourth scan should be blocked (429)
echo "Test 4: Anonymous user - Fourth scan (should be blocked)"
response=$(api_call POST "/api/v2/scan" '{"url":"https://blocked.com"}')
status=$(echo "$response" | jq -r '.status')

if [ "$status" = "429" ]; then
  detail=$(echo "$response" | jq -r '.detail')
  echo -e "${GREEN}✓ PASSED${NC} - Fourth scan blocked with 429: $detail"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAILED${NC} - Fourth scan should have been blocked (got status: $status)"
  ((TESTS_FAILED++))
fi
echo ""

# Test 5: Create free account
echo "Test 5: Create free account and test rate limiting"
email="test-$(date +%s)@example.com"
response=$(api_call POST "/api/auth/create-account" "{\"email\":\"$email\"}")
token=$(echo "$response" | jq -r '.token')

if [ -n "$token" ] && [ "$token" != "null" ]; then
  echo -e "${GREEN}✓ PASSED${NC} - Free account created"
  ((TESTS_PASSED++))
  
  # Test with auth token (new identifier, should have fresh limit)
  echo "  Testing authenticated scan..."
  response=$(api_call POST "/api/v2/scan" '{"url":"https://authenticated.com"}' "-H \"Authorization: Bearer $token\"")
  
  if echo "$response" | jq -e '.scanId' > /dev/null 2>&1; then
    scans_used=$(echo "$response" | jq -r '.rateLimit.scansUsed')
    scans_remaining=$(echo "$response" | jq -r '.rateLimit.scansRemaining')
    echo -e "  ${GREEN}✓${NC} Authenticated scan succeeded (${scans_used}/3 used, ${scans_remaining} remaining)"
  else
    echo -e "  ${RED}✗${NC} Authenticated scan failed"
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Could not create free account"
  ((TESTS_FAILED++))
fi
echo ""

# Test 6: Pro user bypass (requires manual setup)
echo "Test 6: Pro user unlimited scans (manual verification required)"
echo -e "${YELLOW}⚠ MANUAL TEST${NC} - Update a user to Pro in database and test:"
echo "  1. Update user: UPDATE \"User\" SET subscription = 'PRO', \"subscriptionStatus\" = 'ACTIVE' WHERE email = 'test@example.com';"
echo "  2. Login and get token"
echo "  3. Make multiple scans (should all succeed without rate limit)"
echo ""

# Summary
echo "=============================================="
echo "Test Results:"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All automated tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
