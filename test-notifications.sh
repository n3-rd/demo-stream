#!/bin/bash

# Test script for notification endpoints
BASE_URL="http://localhost:3001"

echo "Testing FCM Token Storage..."
echo "=============================="

# Test storing FCM token
echo "1. Storing FCM token for representative..."
curl -X POST "$BASE_URL/api/store-fcm-token" \
  -H "Content-Type: application/json" \
  -d '{
    "rep_id": "550e8400-e29b-41d4-a716-446655440000",
    "fcm_token": "test_fcm_token_12345"
  }'

echo -e "\n\n2. Testing duplicate token storage (should update)..."
curl -X POST "$BASE_URL/api/store-fcm-token" \
  -H "Content-Type: application/json" \
  -d '{
    "rep_id": "550e8400-e29b-41d4-a716-446655440000",
    "fcm_token": "updated_fcm_token_67890"
  }'

echo -e "\n\n3. Testing notification sending..."
curl -X POST "$BASE_URL/api/notify-rep" \
  -H "Content-Type: application/json" \
  -d '{
    "rep_id": "550e8400-e29b-41d4-a716-446655440000",
    "room_id": "room_123"
  }'

echo -e "\n\n4. Testing with invalid rep_id..."
curl -X POST "$BASE_URL/api/notify-rep" \
  -H "Content-Type: application/json" \
  -d '{
    "rep_id": "invalid-uuid",
    "room_id": "room_123"
  }'

echo -e "\n\nTests completed!" 