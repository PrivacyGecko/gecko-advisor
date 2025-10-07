#!/bin/bash

# Rate Limiting Test Script for Privacy Advisor
# Tests IP-based rate limiting for anonymous and authenticated users

set -e

# Configuration
API_URL="${API_URL:-http://localhost:5000}"
V2_SCAN_URL="${API_URL}/v2/scan/url"
TEST_URL="https://example.com"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((TESTS_PASSED++))
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((TESTS_FAILED++))
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Extract field from JSON response
extract_json_field() {
  local json="$1"
  local field="$2"
  echo "$json" | grep -o "\"$field\":[^,}]*" | head -1 | sed 's/.*://; s/"//g'
}

# Test 1: Anonymous user - First scan (should succeed)
test_anonymous_first_scan() {
  log_info "Test 1: Anonymous user - First scan"

  response=$(curl -s -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${TEST_URL}\"}")

  scans_used=$(extract_json_field "$response" "scansUsed")
  scans_remaining=$(extract_json_field "$response" "scansRemaining")

  if [ "$scans_used" = "1" ] && [ "$scans_remaining" = "2" ]; then
    log_success "First scan succeeded with correct rate limit (1/3 used, 2 remaining)"
  else
    log_error "Expected scansUsed=1, scansRemaining=2, got scansUsed=$scans_used, scansRemaining=$scans_remaining"
  fi
}

# Test 2: Anonymous user - Second scan (should succeed)
test_anonymous_second_scan() {
  log_info "Test 2: Anonymous user - Second scan"

  response=$(curl -s -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${TEST_URL}\"}")

  scans_used=$(extract_json_field "$response" "scansUsed")
  scans_remaining=$(extract_json_field "$response" "scansRemaining")

  if [ "$scans_used" = "2" ] && [ "$scans_remaining" = "1" ]; then
    log_success "Second scan succeeded with correct rate limit (2/3 used, 1 remaining)"
  else
    log_error "Expected scansUsed=2, scansRemaining=1, got scansUsed=$scans_used, scansRemaining=$scans_remaining"
  fi
}

# Test 3: Anonymous user - Third scan (should succeed)
test_anonymous_third_scan() {
  log_info "Test 3: Anonymous user - Third scan"

  response=$(curl -s -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${TEST_URL}\"}")

  scans_used=$(extract_json_field "$response" "scansUsed")
  scans_remaining=$(extract_json_field "$response" "scansRemaining")

  if [ "$scans_used" = "3" ] && [ "$scans_remaining" = "0" ]; then
    log_success "Third scan succeeded with correct rate limit (3/3 used, 0 remaining)"
  else
    log_error "Expected scansUsed=3, scansRemaining=0, got scansUsed=$scans_used, scansRemaining=$scans_remaining"
  fi
}

# Test 4: Anonymous user - Fourth scan (should be rate limited)
test_anonymous_rate_limited() {
  log_info "Test 4: Anonymous user - Fourth scan (should be rate limited)"

  response=$(curl -s -w "\n%{http_code}" -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${TEST_URL}\"}")

  # Extract status code (last line) and body (everything before)
  status_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  title=$(extract_json_field "$body" "title")

  if [ "$status_code" = "429" ] && [[ "$title" == *"Daily Limit Reached"* ]]; then
    log_success "Fourth scan correctly rate limited with 429 status"
  else
    log_error "Expected 429 status with 'Daily Limit Reached', got status=$status_code, title=$title"
  fi
}

# Test 5: Authenticated free user - First scan
test_authenticated_free_first_scan() {
  log_info "Test 5: Authenticated free user - First scan"

  if [ -z "$TEST_USER_TOKEN" ]; then
    log_warning "Skipping authenticated user test - TEST_USER_TOKEN not set"
    log_warning "To test authenticated users: export TEST_USER_TOKEN='your-jwt-token'"
    return
  fi

  response=$(curl -s -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TEST_USER_TOKEN" \
    -d "{\"url\": \"${TEST_URL}\"}")

  scans_used=$(extract_json_field "$response" "scansUsed")
  scans_remaining=$(extract_json_field "$response" "scansRemaining")

  if [ "$scans_used" = "1" ] && [ "$scans_remaining" = "2" ]; then
    log_success "Authenticated free user first scan succeeded (1/3 used)"
  else
    log_error "Expected scansUsed=1, scansRemaining=2, got scansUsed=$scans_used, scansRemaining=$scans_remaining"
  fi
}

# Test 6: Pro user - Unlimited scans (no rate limit)
test_pro_user_unlimited() {
  log_info "Test 6: Pro user - Unlimited scans"

  if [ -z "$TEST_PRO_TOKEN" ]; then
    log_warning "Skipping Pro user test - TEST_PRO_TOKEN not set"
    log_warning "To test Pro users: export TEST_PRO_TOKEN='your-pro-jwt-token'"
    return
  fi

  # Make 5 scans rapidly
  for i in {1..5}; do
    response=$(curl -s -X POST "$V2_SCAN_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TEST_PRO_TOKEN" \
      -d "{\"url\": \"${TEST_URL}\"}")

    rate_limit=$(extract_json_field "$response" "rateLimit")

    if [ "$rate_limit" = "null" ] || [ -z "$rate_limit" ]; then
      continue
    else
      log_error "Pro user scan $i returned rate limit info (should be null)"
      return
    fi
  done

  log_success "Pro user completed 5 scans without rate limiting"
}

# Test 7: Pro user - Private scan option
test_pro_private_scan() {
  log_info "Test 7: Pro user - Private scan option"

  if [ -z "$TEST_PRO_TOKEN" ]; then
    log_warning "Skipping Pro private scan test - TEST_PRO_TOKEN not set"
    return
  fi

  response=$(curl -s -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TEST_PRO_TOKEN" \
    -d "{\"url\": \"${TEST_URL}\", \"isPrivate\": true}")

  slug=$(extract_json_field "$response" "slug")

  if [ -n "$slug" ]; then
    log_success "Pro user created private scan successfully"
  else
    log_error "Pro user private scan failed"
  fi
}

# Test 8: Rate limit info includes reset time
test_rate_limit_reset_time() {
  log_info "Test 8: Rate limit response includes reset time"

  # Make one scan to get rate limit info
  response=$(curl -s -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${TEST_URL}\"}")

  reset_at=$(extract_json_field "$response" "resetAt")

  if [[ "$reset_at" =~ [0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2} ]]; then
    log_success "Rate limit includes valid resetAt timestamp: $reset_at"
  else
    log_error "Invalid or missing resetAt timestamp: $reset_at"
  fi
}

# Test 9: 429 response includes upgrade URL
test_rate_limit_upgrade_url() {
  log_info "Test 9: Rate limit error includes upgrade URL"

  # First exhaust the rate limit
  for i in {1..3}; do
    curl -s -X POST "$V2_SCAN_URL" \
      -H "Content-Type: application/json" \
      -d "{\"url\": \"${TEST_URL}\"}" > /dev/null
  done

  # Now check the 429 response
  response=$(curl -s -X POST "$V2_SCAN_URL" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${TEST_URL}\"}")

  upgrade_url=$(extract_json_field "$response" "upgradeUrl")

  if [ "$upgrade_url" = "/pricing" ]; then
    log_success "Rate limit error includes upgrade URL: $upgrade_url"
  else
    log_error "Missing or invalid upgrade URL: $upgrade_url"
  fi
}

# Main test execution
main() {
  echo ""
  log_info "========================================="
  log_info "Privacy Advisor Rate Limiting Tests"
  log_info "========================================="
  log_info "API URL: $API_URL"
  log_info "Test URL: $TEST_URL"
  echo ""

  # Wait for API to be ready
  log_info "Checking if API is available..."
  if ! curl -s -f "${API_URL}/health" > /dev/null 2>&1; then
    log_error "API is not available at $API_URL"
    log_error "Make sure the backend is running with: pnpm dev"
    exit 1
  fi
  log_success "API is available"
  echo ""

  # Run anonymous user tests
  log_info "=== Anonymous User Tests ==="
  test_anonymous_first_scan
  test_anonymous_second_scan
  test_anonymous_third_scan
  test_anonymous_rate_limited
  test_rate_limit_reset_time
  test_rate_limit_upgrade_url
  echo ""

  # Run authenticated user tests if token is provided
  if [ -n "$TEST_USER_TOKEN" ]; then
    log_info "=== Authenticated Free User Tests ==="
    test_authenticated_free_first_scan
    echo ""
  fi

  # Run Pro user tests if token is provided
  if [ -n "$TEST_PRO_TOKEN" ]; then
    log_info "=== Pro User Tests ==="
    test_pro_user_unlimited
    test_pro_private_scan
    echo ""
  fi

  # Summary
  echo ""
  log_info "========================================="
  log_info "Test Summary"
  log_info "========================================="
  log_success "Tests Passed: $TESTS_PASSED"

  if [ $TESTS_FAILED -gt 0 ]; then
    log_error "Tests Failed: $TESTS_FAILED"
    exit 1
  else
    log_success "All tests passed!"
    exit 0
  fi
}

# Run main
main
