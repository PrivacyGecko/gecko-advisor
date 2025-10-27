#!/bin/bash
# SPDX-License-Identifier: MIT

# Run E2E tests locally with Docker Compose setup
# This script mimics the GitHub Actions workflow environment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting E2E Test Environment${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
E2E_DIR="$( dirname "$SCRIPT_DIR" )"
PROJECT_ROOT="$( dirname "$( dirname "$E2E_DIR" )" )"

cd "$PROJECT_ROOT"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    
    # Stop application
    if [ -f app.pid ]; then
        kill $(cat app.pid) 2>/dev/null || true
        rm app.pid
    fi
    
    # Stop Docker containers
    cd "$E2E_DIR"
    docker-compose -f docker-compose.test.yml down
    
    # Stop Nginx if running standalone
    docker stop nginx-e2e 2>/dev/null || true
    docker rm nginx-e2e 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

trap cleanup EXIT INT TERM

# Parse arguments
BROWSER="${BROWSER:-chromium}"
SUITE="${SUITE:-}"
HEADLESS="${HEADLESS:-true}"

while [[ $# -gt 0 ]]; do
    case $1 in
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --suite)
            SUITE="$2"
            shift 2
            ;;
        --headless)
            HEADLESS="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}📦 Starting infrastructure services...${NC}"
cd "$E2E_DIR"
docker-compose -f docker-compose.test.yml up -d postgres redis

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
timeout 60 bash -c 'until docker exec privacy-advisor-test-db pg_isready -U postgres 2>/dev/null; do sleep 2; done'
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

echo -e "${YELLOW}⏳ Waiting for Redis...${NC}"
timeout 60 bash -c 'until docker exec privacy-advisor-test-redis redis-cli ping 2>/dev/null; do sleep 2; done'
echo -e "${GREEN}✅ Redis is ready${NC}"

# Setup environment
cd "$PROJECT_ROOT"
echo -e "${GREEN}🔧 Setting up test environment...${NC}"
cp .env.example .env.test
cat >> .env.test << ENVEOF
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/privacy_advisor_test
REDIS_URL=redis://localhost:6379
E2E_BASE_URL=http://localhost:8080
ENVEOF

# Install dependencies and generate Prisma client
echo -e "${GREEN}📥 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

echo -e "${GREEN}🔨 Generating Prisma client...${NC}"
pnpm prisma:generate

# Run database migrations
echo -e "${GREEN}🗃️  Running database migrations...${NC}"
pnpm exec prisma migrate deploy --schema=infra/prisma/schema.prisma

# Seed database
echo -e "${GREEN}🌱 Seeding test database...${NC}"
pnpm seed

# Build application
echo -e "${GREEN}🏗️  Building application...${NC}"
pnpm build

# Start application in background
echo -e "${GREEN}🚀 Starting application...${NC}"
nohup pnpm dev > app.log 2>&1 &
echo $! > app.pid

# Wait for backend
echo -e "${YELLOW}⏳ Waiting for backend (port 5000)...${NC}"
timeout 60 bash -c 'until curl -f http://localhost:5000/api/health 2>/dev/null; do sleep 2; done'
echo -e "${GREEN}✅ Backend is ready${NC}"

# Wait for frontend
echo -e "${YELLOW}⏳ Waiting for frontend (port 5173)...${NC}"
timeout 60 bash -c 'until curl -f http://localhost:5173 2>/dev/null; do sleep 2; done'
echo -e "${GREEN}✅ Frontend is ready${NC}"

# Start Nginx
echo -e "${GREEN}🌐 Starting Nginx reverse proxy...${NC}"
docker run -d \
    --name nginx-e2e \
    --network host \
    -v "$E2E_DIR/nginx.conf:/etc/nginx/nginx.conf:ro" \
    nginx:alpine

# Wait for Nginx
echo -e "${YELLOW}⏳ Waiting for Nginx (port 8080)...${NC}"
timeout 30 bash -c 'until curl -f http://localhost:8080/health 2>/dev/null; do sleep 1; done'
echo -e "${GREEN}✅ Nginx is ready${NC}"

# Verify proxy is working
echo -e "${GREEN}🔍 Verifying proxy configuration...${NC}"
curl -f http://localhost:8080/api/health
echo -e "${GREEN}✅ Backend proxy is working${NC}"

# Run E2E tests
echo -e "\n${GREEN}🧪 Running E2E tests${NC}"
echo -e "Browser: ${YELLOW}$BROWSER${NC}"
echo -e "Suite: ${YELLOW}${SUITE:-all}${NC}"
echo -e "Headless: ${YELLOW}$HEADLESS${NC}\n"

TEST_CMD="pnpm exec playwright test --project=$BROWSER"

if [ -n "$SUITE" ]; then
    TEST_CMD="$TEST_CMD --grep=$SUITE"
fi

if [ "$HEADLESS" = "false" ]; then
    TEST_CMD="$TEST_CMD --headed"
fi

export E2E_BASE_URL=http://localhost:8080

# Run tests and capture exit code
set +e
eval $TEST_CMD
TEST_EXIT_CODE=$?
set -e

# Display results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
else
    echo -e "\n${RED}❌ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
    echo -e "${YELLOW}📋 Check the test results and logs for details${NC}"
    
    if [ -f app.log ]; then
        echo -e "\n${YELLOW}Last 50 lines of application log:${NC}"
        tail -50 app.log
    fi
fi

exit $TEST_EXIT_CODE
