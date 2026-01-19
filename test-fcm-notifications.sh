#!/bin/bash

# Comprehensive FCM Notification Test Script
# Usage: ./test-fcm-notifications.sh [rep_id] [room_id]
# 
# Note: rep_id must be a valid UUID that exists in the representatives table.
#       If you don't have a valid rep_id, create a representative first or
#       query the database to get an existing one.

BASE_URL="${BASE_URL:-http://localhost:3001}"
REP_ID="${1:-550e8400-e29b-41d4-a716-446655440000}"
ROOM_ID="${2:-room_test_123}"

# Validate UUID format
if [[ ! "$REP_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$ ]]; then
    echo -e "${RED}Error: Invalid UUID format for rep_id: $REP_ID${NC}"
    echo "Please provide a valid UUID that exists in the representatives table."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔥 FCM Notification Test Script${NC}"
echo "=================================="
echo -e "Base URL: ${GREEN}$BASE_URL${NC}"
echo -e "Rep ID: ${GREEN}$REP_ID${NC}"
echo -e "Room ID: ${GREEN}$ROOM_ID${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

# Helper function to print test results
print_result() {
    local test_name=$1
    local status=$2
    local response=$3
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        echo -e "${YELLOW}Response:${NC} $response"
        ((FAILED++))
    fi
    echo ""
}

# Test 1: Store FCM Token
echo -e "${BLUE}Test 1: Storing FCM Token${NC}"
echo "---------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/store-fcm-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"$REP_ID\",
    \"fcm_token\": \"test_fcm_token_$(date +%s)\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result "Store FCM Token" "pass" "$BODY"
else
    print_result "Store FCM Token" "fail" "HTTP $HTTP_CODE: $BODY"
fi

# Test 2: Store Empty Token (should fail)
echo -e "${BLUE}Test 2: Storing Empty Token (should fail)${NC}"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/store-fcm-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"$REP_ID\",
    \"fcm_token\": \"\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    print_result "Store Empty Token (validation)" "pass" "$BODY"
else
    print_result "Store Empty Token (validation)" "fail" "Expected 400, got $HTTP_CODE: $BODY"
fi

# Test 3: Store Null Token (should fail)
echo -e "${BLUE}Test 3: Storing Null Token (should fail)${NC}"
echo "------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/store-fcm-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"$REP_ID\",
    \"fcm_token\": null
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    print_result "Store Null Token (validation)" "pass" "$BODY"
else
    print_result "Store Null Token (validation)" "fail" "Expected 400, got $HTTP_CODE: $BODY"
fi

# Test 4: Update Existing Token
echo -e "${BLUE}Test 4: Updating Existing Token${NC}"
echo "-------------------------------"
NEW_TOKEN="updated_fcm_token_$(date +%s)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/store-fcm-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"$REP_ID\",
    \"fcm_token\": \"$NEW_TOKEN\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result "Update Existing Token" "pass" "$BODY"
else
    print_result "Update Existing Token" "fail" "HTTP $HTTP_CODE: $BODY"
fi

# Test 5: Send Notification (notify-rep)
echo -e "${BLUE}Test 5: Sending Notification (notify-rep)${NC}"
echo "----------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/notify-rep" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"$REP_ID\",
    \"room_id\": \"$ROOM_ID\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result "Send Notification (notify-rep)" "pass" "$BODY"
elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "${YELLOW}⚠️  Notification send failed (check Firebase config):${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    print_result "Send Notification (notify-rep)" "fail" "HTTP $HTTP_CODE: $BODY"
else
    print_result "Send Notification (notify-rep)" "fail" "HTTP $HTTP_CODE: $BODY"
fi

# Test 6: Send Notification with Invalid UUID Format (should fail)
echo -e "${BLUE}Test 6: Send Notification with Invalid UUID Format (should fail)${NC}"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/notify-rep" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"invalid-rep-id-12345\",
    \"room_id\": \"$ROOM_ID\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    print_result "Send Notification with Invalid UUID Format" "pass" "$BODY"
else
    print_result "Send Notification with Invalid UUID Format" "fail" "Expected 400, got $HTTP_CODE: $BODY"
fi

# Test 7: Send Rep Invite
echo -e "${BLUE}Test 7: Sending Representative Invite${NC}"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/send-rep-invite" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"$REP_ID\",
    \"room_id\": \"$ROOM_ID\",
    \"room_title\": \"Test Room\",
    \"user_name\": \"Test User\",
    \"invite_url\": \"https://example.com/room/$ROOM_ID\",
    \"send_methods\": {
      \"sms\": false,
      \"email\": false
    }
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result "Send Rep Invite" "pass" "$BODY"
elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "${YELLOW}⚠️  Invite send failed (check Firebase config):${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    print_result "Send Rep Invite" "fail" "HTTP $HTTP_CODE: $BODY"
else
    print_result "Send Rep Invite" "fail" "HTTP $HTTP_CODE: $BODY"
fi

# Test 8: Missing Required Fields
echo -e "${BLUE}Test 8: Missing Required Fields (should fail)${NC}"
echo "--------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/notify-rep" \
  -H "Content-Type: application/json" \
  -d "{
    \"rep_id\": \"$REP_ID\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    print_result "Missing Required Fields" "pass" "$BODY"
else
    print_result "Missing Required Fields" "fail" "Expected 400, got $HTTP_CODE: $BODY"
fi

# Summary
echo ""
echo "=================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the logs at logs/app.txt for details.${NC}"
    exit 1
fi

