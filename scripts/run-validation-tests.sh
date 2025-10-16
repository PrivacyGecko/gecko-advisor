#!/bin/bash
#
# SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
# SPDX-License-Identifier: MIT
#
# Comprehensive E2E Validation Test Runner
# Tests timeout/retry mechanism and responsive design
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Gecko Advisor E2E Validation Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Parse command line arguments
TEST_SUITE="${1:-all}"
BROWSER="${2:-chromium}"
HEADED="${3:-false}"

echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Test Suite: ${TEST_SUITE}"
echo -e "  Browser: ${BROWSER}"
echo -e "  Headed Mode: ${HEADED}\n"

# Navigate to project root
cd "$PROJECT_ROOT"

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Please install Node.js and npm/pnpm${NC}"
    exit 1
fi

# Create test results directory
mkdir -p test-results/screenshots
mkdir -p test-results/videos

echo -e "${BLUE}Installing Playwright browsers...${NC}"
npx playwright install "$BROWSER" --with-deps

# Determine which tests to run
case "$TEST_SUITE" in
  "timeout"|"timeout-retry")
    TEST_FILES="tests/e2e/tests/timeout-retry-validation.spec.ts"
    echo -e "${GREEN}Running Timeout & Retry Validation Tests${NC}\n"
    ;;

  "responsive"|"responsive-design")
    TEST_FILES="tests/e2e/tests/responsive-design-validation.spec.ts"
    echo -e "${GREEN}Running Responsive Design Validation Tests${NC}\n"
    ;;

  "functionality"|"cross-viewport")
    TEST_FILES="tests/e2e/tests/cross-viewport-functionality.spec.ts"
    echo -e "${GREEN}Running Cross-Viewport Functionality Tests${NC}\n"
    ;;

  "all")
    TEST_FILES="tests/e2e/tests/timeout-retry-validation.spec.ts tests/e2e/tests/responsive-design-validation.spec.ts tests/e2e/tests/cross-viewport-functionality.spec.ts"
    echo -e "${GREEN}Running All Validation Tests${NC}\n"
    ;;

  *)
    echo -e "${RED}Unknown test suite: $TEST_SUITE${NC}"
    echo -e "Usage: $0 [timeout|responsive|functionality|all] [chromium|firefox|webkit] [headed]"
    exit 1
    ;;
esac

# Build test command
TEST_CMD="npx playwright test $TEST_FILES --project=$BROWSER --reporter=html,list,json"

# Add headed mode if requested
if [ "$HEADED" = "true" ] || [ "$HEADED" = "headed" ]; then
  TEST_CMD="$TEST_CMD --headed"
fi

# Add serial execution for timeout tests to avoid rate limiting
if [ "$TEST_SUITE" = "timeout" ] || [ "$TEST_SUITE" = "all" ]; then
  TEST_CMD="$TEST_CMD --workers=1"
fi

echo -e "${BLUE}Executing: $TEST_CMD${NC}\n"
echo -e "${YELLOW}========================================${NC}\n"

# Run tests
START_TIME=$(date +%s)

if eval "$TEST_CMD"; then
  TEST_RESULT="PASSED"
  RESULT_COLOR=$GREEN
else
  TEST_RESULT="FAILED"
  RESULT_COLOR=$RED
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${RESULT_COLOR}Test Result: $TEST_RESULT${NC}"
echo -e "${YELLOW}Duration: ${DURATION}s${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Display results summary
echo -e "${BLUE}Test Artifacts:${NC}"
echo -e "  📸 Screenshots: test-results/screenshots/"
echo -e "  📊 HTML Report: playwright-report/index.html"
echo -e "  📋 JSON Report: test-results/e2e-results.json"
echo -e ""

# Open HTML report automatically
echo -e "${GREEN}Opening HTML report...${NC}"
npx playwright show-report &

# Generate summary
if [ -f "test-results/e2e-results.json" ]; then
  echo -e "\n${BLUE}Test Summary:${NC}"

  # Count tests (requires jq)
  if command -v jq &> /dev/null; then
    TOTAL_TESTS=$(jq '[.suites[].specs[]] | length' test-results/e2e-results.json)
    PASSED_TESTS=$(jq '[.suites[].specs[].tests[].results[] | select(.status == "passed")] | length' test-results/e2e-results.json)
    FAILED_TESTS=$(jq '[.suites[].specs[].tests[].results[] | select(.status == "failed")] | length' test-results/e2e-results.json)

    echo -e "  Total Tests: ${TOTAL_TESTS}"
    echo -e "  ${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "  ${RED}Failed: ${FAILED_TESTS}${NC}"
  fi
fi

echo -e "\n${GREEN}✓ Test execution complete!${NC}\n"

# List screenshots
SCREENSHOT_COUNT=$(find test-results/screenshots -type f -name "*.png" 2>/dev/null | wc -l)
echo -e "${BLUE}📸 Screenshots captured: ${SCREENSHOT_COUNT}${NC}"

if [ "$SCREENSHOT_COUNT" -gt 0 ]; then
  echo -e "\n${YELLOW}Recent screenshots:${NC}"
  find test-results/screenshots -type f -name "*.png" | head -10 | while read -r file; do
    echo -e "  - $(basename "$file")"
  done
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Validation tests completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

exit 0
