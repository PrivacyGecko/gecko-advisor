#!/bin/bash

# E2E Test Runner Script
# SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
# SPDX-License-Identifier: MIT

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BROWSER="chromium"
TEST_SUITE="all"
HEADLESS=true
WORKERS=1
BASE_URL="http://localhost:8080"
OUTPUT_DIR="test-results"
REPORT_FORMAT="html"

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -b, --browser BROWSER        Browser to use (chromium, firefox, webkit) [default: chromium]"
    echo "  -s, --suite SUITE           Test suite to run (all, core, performance, accessibility, security, license) [default: all]"
    echo "  -u, --url URL               Base URL for testing [default: http://localhost:8080]"
    echo "  -w, --workers NUM           Number of parallel workers [default: 1]"
    echo "  -h, --headless BOOL         Run in headless mode [default: true]"
    echo "  -o, --output DIR            Output directory [default: test-results]"
    echo "  -r, --report FORMAT         Report format (html, json, junit) [default: html]"
    echo "  --help                      Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --suite core --browser firefox"
    echo "  $0 --suite performance --workers 2"
    echo "  $0 --suite accessibility --headless false"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -s|--suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -r|--report)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if application is running
check_application() {
    print_status $BLUE "Checking if application is running at $BASE_URL..."

    for i in {1..30}; do
        if curl -f "$BASE_URL" >/dev/null 2>&1 || curl -f "$BASE_URL/health" >/dev/null 2>&1; then
            print_status $GREEN "✅ Application is running"
            return 0
        fi
        print_status $YELLOW "⏳ Waiting for application... (attempt $i/30)"
        sleep 2
    done

    print_status $RED "❌ Application is not responding at $BASE_URL"
    print_status $YELLOW "💡 Make sure to run 'make dev' or 'pnpm dev' before running tests"
    exit 1
}

# Function to get test pattern based on suite
get_test_pattern() {
    case $TEST_SUITE in
        "core")
            echo "core-scanning-journey"
            ;;
        "performance")
            echo "performance-validation"
            ;;
        "accessibility")
            echo "accessibility-mobile"
            ;;
        "security")
            echo "security-error-handling"
            ;;
        "license")
            echo "license-compliance"
            ;;
        "benchmarking")
            echo "performance-benchmarking"
            ;;
        "all")
            echo ""
            ;;
        *)
            print_status $RED "❌ Unknown test suite: $TEST_SUITE"
            print_status $YELLOW "Available suites: all, core, performance, accessibility, security, license, benchmarking"
            exit 1
            ;;
    esac
}

# Function to install dependencies if needed
install_dependencies() {
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/@playwright" ]; then
        print_status $BLUE "📦 Installing dependencies..."
        pnpm install
    fi

    # Install Playwright browsers
    print_status $BLUE "🌐 Installing Playwright browsers..."
    pnpm exec playwright install "$BROWSER" --with-deps
}

# Function to run tests
run_tests() {
    local test_pattern=$(get_test_pattern)
    local grep_option=""

    if [ ! -z "$test_pattern" ]; then
        grep_option="--grep=$test_pattern"
    fi

    # Build playwright command
    local cmd=(
        "pnpm" "exec" "playwright" "test"
        "--project=$BROWSER"
        "--workers=$WORKERS"
        "--output-dir=$OUTPUT_DIR"
    )

    # Add grep option if specified
    if [ ! -z "$grep_option" ]; then
        cmd+=("$grep_option")
    fi

    # Add headless option
    if [ "$HEADLESS" = "false" ]; then
        cmd+=("--headed")
    fi

    # Add report format
    case $REPORT_FORMAT in
        "html")
            cmd+=("--reporter=html")
            ;;
        "json")
            cmd+=("--reporter=json")
            ;;
        "junit")
            cmd+=("--reporter=junit")
            ;;
        *)
            cmd+=("--reporter=html,json")
            ;;
    esac

    # Set environment variables
    export E2E_BASE_URL="$BASE_URL"
    export CI=true

    print_status $BLUE "🧪 Running $TEST_SUITE tests with $BROWSER..."
    print_status $BLUE "Command: ${cmd[*]}"

    # Run the tests
    if "${cmd[@]}"; then
        print_status $GREEN "✅ Tests completed successfully!"
        return 0
    else
        print_status $RED "❌ Some tests failed"
        return 1
    fi
}

# Function to generate reports
generate_reports() {
    print_status $BLUE "📊 Generating test reports..."

    # Generate performance report if performance tests were run
    if [[ "$TEST_SUITE" == "all" || "$TEST_SUITE" == "performance" || "$TEST_SUITE" == "benchmarking" ]]; then
        if [ -f "tests/e2e/scripts/generate-performance-report.js" ]; then
            node tests/e2e/scripts/generate-performance-report.js
        fi
    fi

    # Generate accessibility report if accessibility tests were run
    if [[ "$TEST_SUITE" == "all" || "$TEST_SUITE" == "accessibility" ]]; then
        if [ -f "tests/e2e/scripts/generate-accessibility-report.js" ]; then
            node tests/e2e/scripts/generate-accessibility-report.js
        fi
    fi

    # Show report locations
    if [ -d "$OUTPUT_DIR" ]; then
        print_status $GREEN "📋 Test results available in: $OUTPUT_DIR"
    fi

    if [ -f "playwright-report/index.html" ]; then
        print_status $GREEN "📄 HTML report: playwright-report/index.html"
    fi

    if [ -f "performance-summary.md" ]; then
        print_status $GREEN "⚡ Performance report: performance-summary.md"
    fi

    if [ -f "accessibility-summary.md" ]; then
        print_status $GREEN "♿ Accessibility report: accessibility-summary.md"
    fi
}

# Main execution
main() {
    print_status $BLUE "🎭 Privacy Advisor E2E Test Runner"
    print_status $BLUE "=================================="
    print_status $BLUE "Browser: $BROWSER"
    print_status $BLUE "Test Suite: $TEST_SUITE"
    print_status $BLUE "Base URL: $BASE_URL"
    print_status $BLUE "Workers: $WORKERS"
    print_status $BLUE "Headless: $HEADLESS"
    echo ""

    # Change to project root if we're in tests/e2e/scripts
    if [[ $(basename $(pwd)) == "scripts" ]]; then
        cd ../../..
    fi

    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "tests/e2e" ]; then
        print_status $RED "❌ Please run this script from the project root directory"
        exit 1
    fi

    # Install dependencies
    install_dependencies

    # Check if application is running
    check_application

    # Run tests
    if run_tests; then
        # Generate reports
        generate_reports

        print_status $GREEN "🎉 All done! Check the reports above for detailed results."
        exit 0
    else
        print_status $RED "💥 Tests failed. Check the output above for details."

        # Still generate reports for failed tests
        generate_reports

        exit 1
    fi
}

# Run main function
main "$@"