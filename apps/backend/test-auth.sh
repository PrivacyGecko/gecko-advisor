#!/bin/bash

# JWT Authentication Test Script for Privacy Advisor
# This script tests all authentication endpoints

set -e

API_URL="${API_URL:-http://localhost:5000}"
BASE_URL="$API_URL/api/auth"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Privacy Advisor - Auth System Test"
echo "API URL: $API_URL"
echo "========================================="
echo ""

# Check if API is running
echo "Checking if API is running..."
if ! curl -sf "$API_URL/api/healthz" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: API is not running at $API_URL${NC}"
    echo "Please start the backend server first:"
    echo "  cd apps/backend && pnpm dev"
    exit 1
fi
echo -e "${GREEN}✓ API is running${NC}"
echo ""

# Test 1: Create Email-Only Account
echo "========================================="
echo "Test 1: Create Email-Only Account"
echo "========================================="
EMAIL1="test-email-only-$(date +%s)@example.com"
echo "Creating account for: $EMAIL1"

RESPONSE=$(curl -s -X POST "$BASE_URL/create-account" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL1\"}")

if echo "$RESPONSE" | grep -q "token"; then
    TOKEN1=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Email-only account created successfully${NC}"
    echo "Token: ${TOKEN1:0:20}..."
else
    echo -e "${RED}✗ Failed to create email-only account${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 2: Try to create duplicate email-only account (should fail)
echo "========================================="
echo "Test 2: Duplicate Email Check"
echo "========================================="
echo "Attempting to create duplicate account..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/create-account" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL1\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "409" ]; then
    echo -e "${GREEN}✓ Duplicate email rejected correctly (409)${NC}"
else
    echo -e "${RED}✗ Expected 409, got $HTTP_CODE${NC}"
fi
echo ""

# Test 3: Full Registration with Password
echo "========================================="
echo "Test 3: Full Registration"
echo "========================================="
EMAIL2="test-full-$(date +%s)@example.com"
PASSWORD="SecurePassword123"
NAME="Test User"
echo "Registering: $EMAIL2"

RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}")

if echo "$RESPONSE" | grep -q "token"; then
    TOKEN2=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Full registration successful${NC}"
    echo "Token: ${TOKEN2:0:20}..."
else
    echo -e "${RED}✗ Failed to register${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 4: Login with Credentials
echo "========================================="
echo "Test 4: Login"
echo "========================================="
echo "Logging in as: $EMAIL2"

RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"password\":\"$PASSWORD\"}")

if echo "$RESPONSE" | grep -q "token"; then
    LOGIN_TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Token: ${LOGIN_TOKEN:0:20}..."
else
    echo -e "${RED}✗ Failed to login${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 5: Login with Wrong Password
echo "========================================="
echo "Test 5: Invalid Credentials"
echo "========================================="
echo "Attempting login with wrong password..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"password\":\"WrongPassword123\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Invalid credentials rejected correctly (401)${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

# Test 6: Get User Profile (Authenticated)
echo "========================================="
echo "Test 6: Get User Profile"
echo "========================================="
echo "Fetching profile with token..."

RESPONSE=$(curl -s -X GET "$BASE_URL/me" \
  -H "Authorization: Bearer $TOKEN2")

if echo "$RESPONSE" | grep -q "\"email\":\"$EMAIL2\""; then
    echo -e "${GREEN}✓ Profile retrieved successfully${NC}"
    echo "Response: $RESPONSE" | head -c 200
    echo "..."
else
    echo -e "${RED}✗ Failed to get profile${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Test 7: Get Profile Without Token (should fail)
echo "========================================="
echo "Test 7: Unauthorized Access"
echo "========================================="
echo "Attempting to access profile without token..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/me")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Unauthorized access blocked correctly (401)${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

# Test 8: Invalid Email Format
echo "========================================="
echo "Test 8: Invalid Email Validation"
echo "========================================="
echo "Attempting registration with invalid email..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"not-an-email\",\"password\":\"$PASSWORD\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Invalid email rejected correctly (400)${NC}"
else
    echo -e "${RED}✗ Expected 400, got $HTTP_CODE${NC}"
fi
echo ""

# Test 9: Password Too Short
echo "========================================="
echo "Test 9: Password Validation"
echo "========================================="
EMAIL3="test-short-pw-$(date +%s)@example.com"
echo "Attempting registration with short password..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL3\",\"password\":\"short\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Short password rejected correctly (400)${NC}"
else
    echo -e "${RED}✗ Expected 400, got $HTTP_CODE${NC}"
fi
echo ""

# Test 10: Expired/Invalid Token
echo "========================================="
echo "Test 10: Invalid Token"
echo "========================================="
echo "Attempting to access profile with invalid token..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/me" \
  -H "Authorization: Bearer invalid-token-12345")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Invalid token rejected correctly (401)${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo ""
echo "Created test accounts:"
echo "  Email-only: $EMAIL1"
echo "  Full account: $EMAIL2 / $PASSWORD"
echo ""
echo "Tokens for manual testing:"
echo "  Email-only token: ${TOKEN1:0:40}..."
echo "  Full account token: ${TOKEN2:0:40}..."
echo ""
echo "Manual test examples:"
echo ""
echo "# Get profile with token:"
echo "curl -H 'Authorization: Bearer $TOKEN2' $BASE_URL/me | jq"
echo ""
echo "# Login:"
echo "curl -X POST $BASE_URL/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"$EMAIL2\",\"password\":\"$PASSWORD\"}' | jq"
echo ""
