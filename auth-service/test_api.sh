#!/bin/bash

# Quick API Test Script for Auth Service
# This script tests all major endpoints

BASE_URL="http://localhost:8001"
EMAIL="test@example.com"
PASSWORD="testpassword123"

echo "=========================================="
echo "Auth Service API Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
curl -s -X GET "$BASE_URL/health" | python3 -m json.tool
echo ""
echo ""

# Test 2: Register a new user
echo -e "${YELLOW}Test 2: User Registration${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"full_name\": \"Test User\"
  }")

echo "$REGISTER_RESPONSE" | python3 -m json.tool
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', ''))")

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Registration failed - trying login instead${NC}"

    # Test 3: Login (if registration failed, user might already exist)
    echo ""
    echo -e "${YELLOW}Test 3: User Login${NC}"
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$EMAIL\",
        \"password\": \"$PASSWORD\"
      }")

    echo "$LOGIN_RESPONSE" | python3 -m json.tool
    echo ""

    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', ''))")
else
    echo -e "${GREEN}✅ Registration successful${NC}"
    echo ""
fi

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get access token. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Got access token${NC}"
echo ""

# Test 4: Get current user
echo -e "${YELLOW}Test 4: Get Current User${NC}"
curl -s -X GET "$BASE_URL/api/v1/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
echo ""
echo -e "${GREEN}✅ Got user info${NC}"
echo ""

# Test 5: Verify token
echo -e "${YELLOW}Test 5: Verify Token${NC}"
curl -s -X POST "$BASE_URL/api/v1/auth/verify" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$ACCESS_TOKEN\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✅ Token verified${NC}"
echo ""

# Test 6: Refresh token
echo -e "${YELLOW}Test 6: Refresh Access Token${NC}"
curl -s -X POST "$BASE_URL/api/v1/auth/refresh" \
  -H "Authorization: Bearer $REFRESH_TOKEN" | python3 -m json.tool
echo ""
echo -e "${GREEN}✅ Token refreshed${NC}"
echo ""

# Test 7: Logout
echo -e "${YELLOW}Test 7: Logout${NC}"
curl -s -X POST "$BASE_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
echo ""
echo -e "${GREEN}✅ Logged out${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}All tests completed!${NC}"
echo "=========================================="
echo ""
echo "To view API documentation, visit:"
echo "  Swagger UI: $BASE_URL/docs"
echo "  ReDoc:      $BASE_URL/redoc"
