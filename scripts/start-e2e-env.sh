#!/bin/bash

# Start E2E Testing Environment
# SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
# SPDX-License-Identifier: MIT

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE_BASE="infra/docker/docker-compose.yml"
COMPOSE_FILE_E2E="infra/docker/docker-compose.e2e.yml"
BASE_URL="http://localhost:8080"
TIMEOUT=120

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print header
print_header() {
    echo ""
    print_status $BLUE "=================================="
    print_status $BLUE "$1"
    print_status $BLUE "=================================="
    echo ""
}

# Check if Docker is running
check_docker() {
    print_status $BLUE "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_status $RED "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_status $GREEN "✅ Docker is running"
}

# Check if required files exist
check_files() {
    print_status $BLUE "Checking configuration files..."

    local missing_files=0

    if [ ! -f "$COMPOSE_FILE_BASE" ]; then
        print_status $RED "❌ Missing: $COMPOSE_FILE_BASE"
        missing_files=1
    fi

    if [ ! -f "$COMPOSE_FILE_E2E" ]; then
        print_status $RED "❌ Missing: $COMPOSE_FILE_E2E"
        missing_files=1
    fi

    if [ ! -f "infra/docker/nginx-dev.conf" ]; then
        print_status $RED "❌ Missing: infra/docker/nginx-dev.conf"
        missing_files=1
    fi

    if [ ! -f "apps/frontend/vite.config.ts" ]; then
        print_status $RED "❌ Missing: apps/frontend/vite.config.ts"
        missing_files=1
    fi

    if [ $missing_files -eq 1 ]; then
        print_status $RED "Some required files are missing. Please check the configuration."
        exit 1
    fi

    print_status $GREEN "✅ All configuration files found"
}

# Clean up existing containers
cleanup() {
    print_status $BLUE "Cleaning up existing containers..."
    docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E down -v 2>/dev/null || true
    print_status $GREEN "✅ Cleanup complete"
}

# Start services
start_services() {
    print_header "Starting E2E Environment"

    print_status $BLUE "Building and starting services..."
    docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E up --build -d

    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Services started successfully"
    else
        print_status $RED "❌ Failed to start services"
        exit 1
    fi
}

# Wait for service to be healthy
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    print_status $BLUE "Waiting for $service to be healthy..."

    while [ $attempt -le $max_attempts ]; do
        local health=$(docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E ps --format json | jq -r ".[] | select(.Service==\"$service\") | .Health")

        if [ "$health" == "healthy" ]; then
            print_status $GREEN "✅ $service is healthy"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo ""
    print_status $RED "❌ $service did not become healthy in time"
    print_status $YELLOW "Showing logs for $service:"
    docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E logs --tail=50 $service
    return 1
}

# Wait for application to be ready
wait_for_application() {
    print_header "Waiting for Application"

    print_status $BLUE "Checking if application is ready at $BASE_URL..."

    local attempt=1
    local max_attempts=$((TIMEOUT / 2))

    while [ $attempt -le $max_attempts ]; do
        # Check if we can reach the homepage
        if curl -f -s "$BASE_URL" > /dev/null 2>&1; then
            print_status $GREEN "✅ Application is accessible at $BASE_URL"
            return 0
        fi

        # Check if we can reach the API
        if curl -f -s "$BASE_URL/api/health" > /dev/null 2>&1; then
            print_status $YELLOW "⚠️  API is accessible but frontend may not be ready"
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo ""
    print_status $RED "❌ Application is not responding at $BASE_URL"
    print_status $YELLOW "This may indicate a configuration issue with Nginx or the services"
    return 1
}

# Verify routing
verify_routing() {
    print_header "Verifying Routing"

    # Test API endpoint
    print_status $BLUE "Testing API routing..."
    if curl -f -s "$BASE_URL/api/health" > /dev/null 2>&1; then
        print_status $GREEN "✅ API routing works: $BASE_URL/api/health"
    else
        print_status $RED "❌ API routing failed: $BASE_URL/api/health"
        print_status $YELLOW "Checking backend logs:"
        docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E logs --tail=20 backend
        return 1
    fi

    # Test frontend
    print_status $BLUE "Testing frontend routing..."
    if curl -f -s "$BASE_URL" | grep -q "Privacy Advisor" 2>/dev/null; then
        print_status $GREEN "✅ Frontend routing works: $BASE_URL"
    else
        print_status $RED "❌ Frontend routing failed: $BASE_URL"
        print_status $YELLOW "Checking frontend logs:"
        docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E logs --tail=20 frontend
        return 1
    fi

    print_status $GREEN "✅ All routing tests passed"
}

# Show service status
show_status() {
    print_header "Service Status"
    docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E ps
}

# Show URLs
show_urls() {
    print_header "Access URLs"
    echo ""
    print_status $GREEN "🌐 Application (via Nginx):    $BASE_URL"
    print_status $GREEN "🔧 API Health Check:           $BASE_URL/api/health"
    print_status $BLUE "📊 Backend Direct:             http://localhost:5001/api/health"
    print_status $BLUE "🎨 Frontend Direct (HMR):      http://localhost:5173"
    print_status $BLUE "🗄️  PostgreSQL:                 localhost:5432"
    print_status $BLUE "📮 Redis:                       localhost:6379"
    echo ""
}

# Show next steps
show_next_steps() {
    print_header "Next Steps"
    echo ""
    print_status $GREEN "E2E environment is ready! You can now:"
    echo ""
    print_status $BLUE "1. Run E2E tests:"
    echo "   pnpm test:e2e"
    echo ""
    print_status $BLUE "2. Run specific test suite:"
    echo "   pnpm test:e2e:core"
    echo "   pnpm test:e2e:performance"
    echo ""
    print_status $BLUE "3. Watch logs:"
    echo "   docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E logs -f"
    echo ""
    print_status $BLUE "4. Stop environment:"
    echo "   docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E down"
    echo ""
    print_status $YELLOW "5. View configuration docs:"
    echo "   docs/E2E_TESTING_SETUP.md"
    echo "   docs/VITE_CONFIG_REFERENCE.md"
    echo ""
}

# Show logs on failure
show_logs_on_failure() {
    print_header "Error - Showing Recent Logs"
    docker compose -f $COMPOSE_FILE_BASE -f $COMPOSE_FILE_E2E logs --tail=50
}

# Main execution
main() {
    print_header "Privacy Advisor E2E Environment Setup"

    # Change to project root
    cd "$(dirname "$0")/.." || exit 1

    # Check prerequisites
    check_docker
    check_files

    # Clean up and start fresh
    cleanup
    start_services

    # Wait for services to be healthy
    print_header "Waiting for Services"
    if ! wait_for_service "db"; then
        show_logs_on_failure
        exit 1
    fi

    if ! wait_for_service "redis"; then
        show_logs_on_failure
        exit 1
    fi

    if ! wait_for_service "backend"; then
        show_logs_on_failure
        exit 1
    fi

    if ! wait_for_service "nginx"; then
        show_logs_on_failure
        exit 1
    fi

    # Wait for application to be ready
    if ! wait_for_application; then
        show_logs_on_failure
        exit 1
    fi

    # Verify routing works correctly
    if ! verify_routing; then
        show_logs_on_failure
        exit 1
    fi

    # Show final status
    show_status
    show_urls
    show_next_steps

    print_status $GREEN "✅ E2E environment is ready!"
}

# Run main function
main "$@"
