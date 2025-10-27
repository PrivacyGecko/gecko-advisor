#!/bin/bash

# Verify E2E Configuration Script
# SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
# SPDX-License-Identifier: MIT

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Print functions
print_status() {
    echo -e "${1}${2}${NC}"
}

print_header() {
    echo ""
    print_status $BLUE "=================================="
    print_status $BLUE "$1"
    print_status $BLUE "=================================="
}

check_pass() {
    print_status $GREEN "✅ $1"
    PASSED=$((PASSED + 1))
}

check_fail() {
    print_status $RED "❌ $1"
    FAILED=$((FAILED + 1))
}

check_warn() {
    print_status $YELLOW "⚠️  $1"
    WARNINGS=$((WARNINGS + 1))
}

# Check if file exists
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        check_pass "$description exists: $file"
        return 0
    else
        check_fail "$description missing: $file"
        return 1
    fi
}

# Check if string exists in file
check_content() {
    local file=$1
    local pattern=$2
    local description=$3

    if [ ! -f "$file" ]; then
        check_fail "File not found: $file"
        return 1
    fi

    if grep -q "$pattern" "$file"; then
        check_pass "$description in $file"
        return 0
    else
        check_fail "$description NOT found in $file"
        return 1
    fi
}

# Check Vite configuration
check_vite_config() {
    print_header "Checking Vite Configuration"

    local vite_config="apps/frontend/vite.config.ts"

    check_file "$vite_config" "Vite config file"

    check_content "$vite_config" "host.*0\.0\.0\.0" "host: '0.0.0.0'"
    check_content "$vite_config" "VITE_API_PROXY_TARGET" "Configurable proxy target"
    check_content "$vite_config" "cors.*:" "CORS configuration"
    check_content "$vite_config" "hmr.*:" "HMR configuration"
    check_content "$vite_config" "preview.*:" "Preview configuration"

    # Check for hardcoded localhost:5000 in Vite config (should use env var)
    if grep -q "target.*'http://localhost:5000'" "$vite_config"; then
        if grep -q "process\.env\.VITE_API_PROXY_TARGET" "$vite_config"; then
            check_pass "Proxy target uses environment variable with fallback"
        else
            check_warn "Proxy target hardcoded (should use VITE_API_PROXY_TARGET)"
        fi
    fi
}

# Check Nginx configurations
check_nginx_configs() {
    print_header "Checking Nginx Configurations"

    check_file "infra/docker/nginx.conf" "Production Nginx config"
    check_file "infra/docker/nginx-dev.conf" "Development Nginx config"

    # Check production config
    check_content "infra/docker/nginx.conf" "location /api/" "API proxy in production config"
    check_content "infra/docker/nginx.conf" "proxy_pass.*backend:5000" "Backend proxy target"

    # Check dev config
    check_content "infra/docker/nginx-dev.conf" "location /api/" "API proxy in dev config"
    check_content "infra/docker/nginx-dev.conf" "location /ws" "WebSocket proxy for HMR"
    check_content "infra/docker/nginx-dev.conf" "proxy_pass.*frontend:5173" "Frontend dev server proxy"
}

# Check Docker Compose files
check_docker_compose() {
    print_header "Checking Docker Compose Files"

    check_file "infra/docker/docker-compose.yml" "Base docker-compose"
    check_file "infra/docker/docker-compose.e2e.yml" "E2E docker-compose"
    check_file "infra/docker/Dockerfile.frontend.dev" "Frontend dev Dockerfile"

    # Check E2E compose
    check_content "infra/docker/docker-compose.e2e.yml" "nginx:" "Nginx service in E2E compose"
    check_content "infra/docker/docker-compose.e2e.yml" "frontend:" "Frontend service in E2E compose"
    check_content "infra/docker/docker-compose.e2e.yml" "8080:80" "Port 8080 exposed for E2E"
    check_content "infra/docker/docker-compose.e2e.yml" "nginx-dev.conf" "Dev Nginx config mounted"

    # Check frontend dev Dockerfile
    if grep -q "host" "infra/docker/Dockerfile.frontend.dev" && grep -q "0.0.0.0" "infra/docker/Dockerfile.frontend.dev"; then
        check_pass "Vite dev server uses --host 0.0.0.0 in Dockerfile"
    else
        check_fail "Vite dev server should use --host 0.0.0.0 in Dockerfile"
    fi
}

# Check frontend API calls
check_frontend_api() {
    print_header "Checking Frontend API Integration"

    local api_file="apps/frontend/src/lib/api.ts"

    check_file "$api_file" "Frontend API client"

    # Check for relative URLs (good)
    if grep -q "fetch('/api/" "$api_file"; then
        check_pass "API calls use relative URLs (/api/...)"
    else
        check_warn "API calls may not use relative URLs"
    fi

    # Check for hardcoded localhost URLs (bad)
    if grep -q "fetch('http://localhost" "$api_file"; then
        check_fail "Hardcoded localhost URLs found in API client"
    else
        check_pass "No hardcoded localhost URLs in API client"
    fi

    # Check for hardcoded port 5000 URLs (bad)
    if grep -q "localhost:5000" "$api_file"; then
        check_fail "Hardcoded localhost:5000 found in API client"
    else
        check_pass "No hardcoded backend port in API client"
    fi
}

# Check Playwright configuration
check_playwright_config() {
    print_header "Checking Playwright Configuration"

    local playwright_config="tests/e2e/playwright.config.ts"

    check_file "$playwright_config" "Playwright config"

    check_content "$playwright_config" "E2E_BASE_URL" "E2E_BASE_URL environment variable"
    check_content "$playwright_config" "localhost:8080" "Default baseURL uses port 8080"
}

# Check documentation
check_documentation() {
    print_header "Checking Documentation"

    check_file "docs/E2E_TESTING_SETUP.md" "E2E testing setup guide"
    check_file "docs/VITE_CONFIG_REFERENCE.md" "Vite config reference"
    check_file "VITE_E2E_CONFIGURATION_SUMMARY.md" "Configuration summary"
}

# Check helper scripts
check_scripts() {
    print_header "Checking Helper Scripts"

    local start_script="scripts/start-e2e-env.sh"

    check_file "$start_script" "E2E startup script"

    if [ -f "$start_script" ] && [ -x "$start_script" ]; then
        check_pass "E2E startup script is executable"
    elif [ -f "$start_script" ]; then
        check_warn "E2E startup script exists but is not executable (run: chmod +x $start_script)"
    fi

    check_content "$start_script" "docker-compose.e2e.yml" "Script uses E2E compose file"
    check_content "$start_script" "localhost:8080" "Script checks port 8080"
}

# Check environment variables
check_env_vars() {
    print_header "Checking Environment Variable Configuration"

    local env_example=".env.example"

    check_file "$env_example" "Root .env.example"

    check_content "$env_example" "FRONTEND_PUBLIC_URL" "Frontend public URL"
    check_content "$env_example" "BACKEND_PORT" "Backend port configuration"
    check_content "$env_example" "ALLOW_ORIGIN" "CORS origin configuration"

    # Check frontend .env.example
    local frontend_env="apps/frontend/.env.example"
    if [ -f "$frontend_env" ]; then
        check_pass "Frontend .env.example exists"
        if grep -q "VITE_" "$frontend_env"; then
            check_pass "Frontend env has VITE_ prefixed variables"
        fi
    else
        check_warn "Frontend .env.example not found (optional)"
    fi
}

# Check for common mistakes
check_common_mistakes() {
    print_header "Checking for Common Mistakes"

    # Check for hardcoded URLs in frontend pages
    if find apps/frontend/src/pages -name "*.tsx" -exec grep -l "http://localhost:5000" {} \; | grep -q .; then
        check_fail "Hardcoded backend URL found in frontend pages"
    else
        check_pass "No hardcoded backend URLs in frontend pages"
    fi

    # Check for hardcoded URLs in components
    if find apps/frontend/src/components -name "*.tsx" -exec grep -l "http://localhost:5000" {} \; | grep -q .; then
        check_fail "Hardcoded backend URL found in frontend components"
    else
        check_pass "No hardcoded backend URLs in frontend components"
    fi

    # Check if Vite config has both host bindings
    local server_host=$(grep -A 5 "server.*{" apps/frontend/vite.config.ts | grep -c "host.*'0\.0\.0\.0'")
    local preview_host=$(grep -A 5 "preview.*{" apps/frontend/vite.config.ts | grep -c "host.*'0\.0\.0\.0'")

    if [ "$server_host" -gt 0 ] && [ "$preview_host" -gt 0 ]; then
        check_pass "Both dev and preview servers bind to 0.0.0.0"
    else
        check_warn "Both dev and preview servers should bind to 0.0.0.0 (dev: $server_host, preview: $preview_host)"
    fi
}

# Summary
print_summary() {
    print_header "Verification Summary"

    local total=$((PASSED + FAILED + WARNINGS))

    echo ""
    print_status $GREEN "✅ Passed:   $PASSED/$total"
    print_status $RED "❌ Failed:   $FAILED/$total"
    print_status $YELLOW "⚠️  Warnings: $WARNINGS/$total"
    echo ""

    if [ $FAILED -eq 0 ]; then
        print_status $GREEN "🎉 Configuration verification passed!"
        print_status $BLUE "You can now run: ./scripts/start-e2e-env.sh"
        return 0
    else
        print_status $RED "⚠️  Configuration has issues that need to be fixed."
        print_status $YELLOW "Please review the failed checks above."
        return 1
    fi
}

# Main execution
main() {
    print_header "Privacy Advisor E2E Configuration Verification"

    # Change to project root
    cd "$(dirname "$0")/.." || exit 1

    # Run all checks
    check_vite_config
    check_nginx_configs
    check_docker_compose
    check_frontend_api
    check_playwright_config
    check_documentation
    check_scripts
    check_env_vars
    check_common_mistakes

    # Print summary
    print_summary
}

# Run main function
main "$@"
