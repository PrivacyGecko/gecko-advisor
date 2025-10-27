#!/bin/bash
#
# SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
# SPDX-License-Identifier: MIT
#
# Stop Nginx reverse proxy for E2E testing
#
# Usage:
#   ./tests/e2e/scripts/stop-nginx.sh

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
NGINX_CONF="$E2E_DIR/nginx.conf"
NGINX_PID_FILE="$E2E_DIR/.nginx.pid"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Privacy Advisor - Stop Nginx Reverse Proxy       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Nginx is running via PID file
if [ -f "$NGINX_PID_FILE" ]; then
    PID=$(cat "$NGINX_PID_FILE")
    echo -e "${BLUE}→ Found Nginx PID file: $PID${NC}"

    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${BLUE}→ Stopping Nginx (PID: $PID)...${NC}"

        # Try graceful shutdown first
        if nginx -s quit -c "$NGINX_CONF" 2>/dev/null; then
            echo -e "${GREEN}✓ Nginx stopped gracefully${NC}"
        else
            # If graceful shutdown fails, try stop signal
            if nginx -s stop -c "$NGINX_CONF" 2>/dev/null; then
                echo -e "${GREEN}✓ Nginx stopped${NC}"
            else
                # If that fails, kill the process
                echo -e "${YELLOW}⚠ Forcing Nginx to stop...${NC}"
                kill -9 "$PID" 2>/dev/null || true
                echo -e "${GREEN}✓ Nginx killed${NC}"
            fi
        fi

        # Wait for process to stop
        for i in {1..5}; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done

        rm -f "$NGINX_PID_FILE"
    else
        echo -e "${YELLOW}⚠ Nginx process $PID is not running${NC}"
        rm -f "$NGINX_PID_FILE"
    fi
else
    # No PID file, try to find and stop any Nginx processes
    echo -e "${BLUE}→ No PID file found, searching for Nginx processes...${NC}"

    # Find Nginx master process using our config
    NGINX_PIDS=$(pgrep -f "nginx.*$NGINX_CONF" 2>/dev/null || true)

    if [ -n "$NGINX_PIDS" ]; then
        echo -e "${BLUE}→ Found Nginx processes: $NGINX_PIDS${NC}"

        # Try graceful shutdown
        if nginx -s quit -c "$NGINX_CONF" 2>/dev/null; then
            echo -e "${GREEN}✓ Nginx stopped gracefully${NC}"
        else
            # Try stop signal
            if nginx -s stop -c "$NGINX_CONF" 2>/dev/null; then
                echo -e "${GREEN}✓ Nginx stopped${NC}"
            else
                # Force kill
                echo -e "${YELLOW}⚠ Forcing Nginx to stop...${NC}"
                for pid in $NGINX_PIDS; do
                    kill -9 "$pid" 2>/dev/null || true
                done
                echo -e "${GREEN}✓ Nginx killed${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠ No Nginx processes found${NC}"
    fi
fi

# Check if port 8080 is still in use
sleep 1
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Warning: Port 8080 is still in use${NC}"
    echo ""
    echo "Process using port 8080:"
    lsof -Pi :8080 -sTCP:LISTEN
else
    echo -e "${GREEN}✓ Port 8080 is now free${NC}"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
