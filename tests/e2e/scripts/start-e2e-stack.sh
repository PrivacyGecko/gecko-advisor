#!/bin/bash
#
# SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
# SPDX-License-Identifier: MIT
#
# Start complete E2E testing stack (backend + frontend + nginx)
#
# Usage:
#   ./tests/e2e/scripts/start-e2e-stack.sh
#
# This script will:
#   1. Check prerequisites (Node.js, pnpm, Nginx, PostgreSQL, Redis)
#   2. Start backend service on port 5000
#   3. Start frontend service on port 5173
#   4. Start Nginx reverse proxy on port 8080
#   5. Verify all services are healthy

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$E2E_DIR")")"

# PID files for cleanup
BACKEND_PID_FILE="$E2E_DIR/.backend.pid"
FRONTEND_PID_FILE="$E2E_DIR/.frontend.pid"
NGINX_PID_FILE="$E2E_DIR/.nginx.pid"

echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Privacy Advisor - Start E2E Testing Stack        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${BLUE}→ Shutting down E2E stack...${NC}"

    # Stop Nginx
    if [ -f "$NGINX_PID_FILE" ]; then
        NGINX_PID=$(cat "$NGINX_PID_FILE")
        echo -e "${BLUE}→ Stopping Nginx (PID: $NGINX_PID)...${NC}"
        kill "$NGINX_PID" 2>/dev/null || true
        rm -f "$NGINX_PID_FILE"
    fi

    # Stop frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        echo -e "${BLUE}→ Stopping Frontend (PID: $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
        rm -f "$FRONTEND_PID_FILE"
    fi

    # Stop backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        echo -e "${BLUE}→ Stopping Backend (PID: $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null || true
        rm -f "$BACKEND_PID_FILE"
    fi

    echo -e "${GREEN}✓ E2E stack stopped${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Check prerequisites
echo -e "${BLUE}═══ Checking Prerequisites ═══${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Error: Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js:${NC} $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}✗ Error: pnpm is not installed${NC}"
    echo "Install: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✓ pnpm:${NC} $(pnpm --version)"

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗ Error: Nginx is not installed${NC}"
    echo "Install: brew install nginx (macOS) or sudo apt install nginx (Linux)"
    exit 1
fi
echo -e "${GREEN}✓ Nginx:${NC} $(nginx -v 2>&1)"

# Check PostgreSQL connection
echo -e "${BLUE}→ Checking PostgreSQL...${NC}"
if pg_isready -h localhost -p 5432 &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
elif command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL may not be running on localhost:5432${NC}"
    echo -e "${YELLOW}  Start with: brew services start postgresql (macOS)${NC}"
    echo -e "${YELLOW}           or: sudo service postgresql start (Linux)${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL client not found, skipping check${NC}"
fi

# Check Redis connection
echo -e "${BLUE}→ Checking Redis...${NC}"
if redis-cli -h localhost -p 6379 ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis is running${NC}"
elif command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠ Redis may not be running on localhost:6379${NC}"
    echo -e "${YELLOW}  Start with: brew services start redis (macOS)${NC}"
    echo -e "${YELLOW}           or: sudo service redis start (Linux)${NC}"
else
    echo -e "${YELLOW}⚠ Redis client not found, skipping check${NC}"
fi

echo ""

# Check if services are already running
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 5000 is already in use (Backend)${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 5173 is already in use (Frontend)${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 8080 is already in use (Nginx)${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to project root
cd "$PROJECT_ROOT"

# Start services
echo -e "${BLUE}═══ Starting Services ═══${NC}"
echo ""

# 1. Start Backend
echo -e "${BLUE}→ Starting Backend (port 5000)...${NC}"
cd "$PROJECT_ROOT/apps/backend"

# Create log directory
mkdir -p "$E2E_DIR/logs"

# Start backend in background
PORT=5000 pnpm dev > "$E2E_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
echo -e "${BLUE}→ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s -f http://localhost:5000/api/healthz > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Backend failed to start within 30 seconds${NC}"
        echo "Check logs: tail -f $E2E_DIR/logs/backend.log"
        cleanup
        exit 1
    fi
    sleep 1
done

# 2. Start Frontend
echo ""
echo -e "${BLUE}→ Starting Frontend (port 5173)...${NC}"
cd "$PROJECT_ROOT/apps/frontend"

# Start frontend in background
FRONTEND_PORT=5173 pnpm dev > "$E2E_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to be ready
echo -e "${BLUE}→ Waiting for frontend to be ready...${NC}"
for i in {1..60}; do
    if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Frontend failed to start within 60 seconds${NC}"
        echo "Check logs: tail -f $E2E_DIR/logs/frontend.log"
        cleanup
        exit 1
    fi
    sleep 1
done

# 3. Start Nginx
echo ""
echo -e "${BLUE}→ Starting Nginx (port 8080)...${NC}"
cd "$E2E_DIR"

# Start nginx
nginx -c "$E2E_DIR/nginx.conf"

# Get Nginx PID
sleep 2
NGINX_PID=$(pgrep -f "nginx.*$E2E_DIR/nginx.conf" | head -1)
if [ -n "$NGINX_PID" ]; then
    echo "$NGINX_PID" > "$NGINX_PID_FILE"
    echo -e "${GREEN}✓ Nginx started (PID: $NGINX_PID)${NC}"
else
    echo -e "${RED}✗ Failed to start Nginx${NC}"
    cleanup
    exit 1
fi

# Wait for Nginx to be ready
echo -e "${BLUE}→ Waiting for Nginx to be ready...${NC}"
for i in {1..10}; do
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Nginx is ready${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ Nginx failed to start within 10 seconds${NC}"
        cleanup
        exit 1
    fi
    sleep 1
done

# Verify stack
echo ""
echo -e "${BLUE}═══ Verifying Stack ═══${NC}"
echo ""

if command -v node &> /dev/null && [ -f "$SCRIPT_DIR/verify-stack.js" ]; then
    node "$SCRIPT_DIR/verify-stack.js"
else
    # Basic verification
    echo -e "${BLUE}→ Running basic health checks...${NC}"

    # Check Nginx
    if curl -s -f http://localhost:8080/health > /dev/null; then
        echo -e "${GREEN}✓ Nginx health check passed${NC}"
    else
        echo -e "${RED}✗ Nginx health check failed${NC}"
    fi

    # Check Backend via Nginx
    if curl -s -f http://localhost:8080/api/healthz > /dev/null; then
        echo -e "${GREEN}✓ Backend health check passed (via Nginx)${NC}"
    else
        echo -e "${RED}✗ Backend health check failed (via Nginx)${NC}"
    fi

    # Check Frontend via Nginx
    if curl -s -f http://localhost:8080 > /dev/null; then
        echo -e "${GREEN}✓ Frontend health check passed (via Nginx)${NC}"
    else
        echo -e "${RED}✗ Frontend health check failed (via Nginx)${NC}"
    fi
fi

# Success message
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  E2E Stack Running Successfully!                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Services:"
echo -e "  ${GREEN}✓${NC} Backend:  http://localhost:5000  (PID: $BACKEND_PID)"
echo -e "  ${GREEN}✓${NC} Frontend: http://localhost:5173  (PID: $FRONTEND_PID)"
echo -e "  ${GREEN}✓${NC} Nginx:    http://localhost:8080  (PID: $NGINX_PID)"
echo ""
echo "Access your application at: ${CYAN}http://localhost:8080${NC}"
echo ""
echo "Logs:"
echo "  Backend:  tail -f $E2E_DIR/logs/backend.log"
echo "  Frontend: tail -f $E2E_DIR/logs/frontend.log"
echo "  Nginx:    tail -f /var/log/nginx/error.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait indefinitely (until user presses Ctrl+C)
while true; do
    sleep 1
done
