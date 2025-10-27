#!/bin/bash
#
# SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
# SPDX-License-Identifier: MIT
#
# Start Nginx reverse proxy for E2E testing
#
# Usage:
#   ./tests/e2e/scripts/start-nginx.sh [foreground|background]
#
# Examples:
#   ./tests/e2e/scripts/start-nginx.sh foreground  # Default, stays in terminal
#   ./tests/e2e/scripts/start-nginx.sh background  # Runs in background

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$E2E_DIR")")"
NGINX_CONF="$E2E_DIR/nginx.conf"
NGINX_PID_FILE="$E2E_DIR/.nginx.pid"

# Parse arguments
MODE="${1:-foreground}"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Privacy Advisor - Start Nginx Reverse Proxy      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗ Error: Nginx is not installed${NC}"
    echo ""
    echo "Install Nginx:"
    echo "  macOS:   brew install nginx"
    echo "  Ubuntu:  sudo apt-get install nginx"
    echo "  RHEL:    sudo yum install nginx"
    exit 1
fi

echo -e "${GREEN}✓ Nginx found:${NC} $(nginx -v 2>&1)"

# Check if Nginx config exists
if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${RED}✗ Error: Nginx config not found at $NGINX_CONF${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Nginx config found:${NC} $NGINX_CONF"

# Test Nginx configuration
echo -e "${BLUE}→ Testing Nginx configuration...${NC}"
if nginx -t -c "$NGINX_CONF" 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Error: Nginx configuration is invalid${NC}"
    nginx -t -c "$NGINX_CONF"
    exit 1
fi

# Check if Nginx is already running
if [ -f "$NGINX_PID_FILE" ]; then
    OLD_PID=$(cat "$NGINX_PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Nginx is already running (PID: $OLD_PID)${NC}"
        echo ""
        read -p "Stop existing Nginx and restart? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}→ Stopping existing Nginx...${NC}"
            nginx -s stop -c "$NGINX_CONF" 2>/dev/null || kill "$OLD_PID" 2>/dev/null || true
            sleep 2
            rm -f "$NGINX_PID_FILE"
        else
            echo -e "${YELLOW}→ Exiting without changes${NC}"
            exit 0
        fi
    else
        # PID file exists but process is not running
        rm -f "$NGINX_PID_FILE"
    fi
fi

# Check if port 8080 is available
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Error: Port 8080 is already in use${NC}"
    echo ""
    echo "Process using port 8080:"
    lsof -Pi :8080 -sTCP:LISTEN
    echo ""
    echo "To kill the process: kill -9 \$(lsof -t -i:8080)"
    exit 1
fi

# Check if backend is running
echo -e "${BLUE}→ Checking backend service...${NC}"
if curl -s -f http://localhost:5000/api/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port 5000${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Backend is not responding on port 5000${NC}"
    echo -e "${YELLOW}  Start backend with: pnpm --filter backend dev${NC}"
fi

# Check if frontend is running
echo -e "${BLUE}→ Checking frontend service...${NC}"
if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port 5173${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Frontend is not responding on port 5173${NC}"
    echo -e "${YELLOW}  Start frontend with: pnpm --filter frontend dev${NC}"
fi

echo ""
echo -e "${BLUE}→ Starting Nginx in $MODE mode...${NC}"

if [ "$MODE" == "background" ]; then
    # Start in background
    nginx -c "$NGINX_CONF"

    # Get PID
    sleep 1
    NGINX_PID=$(pgrep -f "nginx.*$NGINX_CONF" | head -1)

    if [ -n "$NGINX_PID" ]; then
        echo "$NGINX_PID" > "$NGINX_PID_FILE"
        echo -e "${GREEN}✓ Nginx started in background (PID: $NGINX_PID)${NC}"
        echo ""
        echo "Nginx is proxying:"
        echo "  http://localhost:8080/api/*  → http://localhost:5000/api/*  (Backend)"
        echo "  http://localhost:8080/*      → http://localhost:5173/*      (Frontend)"
        echo ""
        echo "Health check: curl http://localhost:8080/health"
        echo ""
        echo "To stop: nginx -s stop -c $NGINX_CONF"
        echo "     or: ./tests/e2e/scripts/stop-nginx.sh"
    else
        echo -e "${RED}✗ Error: Failed to start Nginx${NC}"
        exit 1
    fi
else
    # Start in foreground
    echo -e "${GREEN}✓ Starting Nginx in foreground...${NC}"
    echo ""
    echo "Nginx is proxying:"
    echo "  http://localhost:8080/api/*  → http://localhost:5000/api/*  (Backend)"
    echo "  http://localhost:8080/*      → http://localhost:5173/*      (Frontend)"
    echo ""
    echo "Health check: curl http://localhost:8080/health"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop Nginx${NC}"
    echo ""

    # Trap SIGINT and SIGTERM to clean up
    trap 'echo -e "\n${BLUE}→ Stopping Nginx...${NC}"; nginx -s stop -c "$NGINX_CONF"; rm -f "$NGINX_PID_FILE"; exit 0' SIGINT SIGTERM

    # Start in foreground
    nginx -c "$NGINX_CONF" -g 'daemon off;'
fi
