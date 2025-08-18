#!/bin/bash

# Test script for Room Scheduling API
BASE_URL="http://localhost:3001"

echo "Testing Room Scheduling API..."
echo "=============================="

# Test 1: Schedule a room
echo "1. Scheduling a room..."
curl -X POST "$BASE_URL/api/schedule-room" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product Demo Meeting",
    "representative_ids": ["550e8400-e29b-41d4-a716-446655440000"],
    "schedule_time": "2024-12-25T14:00:00.000Z",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "room_id": "demo-room-123",
    "additional_information": "Product demonstration for new client",
    "meeting_duration": 90,
    "join_before_minutes": 10
  }'

echo -e "\n\n2. Fetching scheduled rooms..."
curl -X GET "$BASE_URL/api/schedule-room"

echo -e "\n\n3. Fetching scheduled rooms for specific date..."
curl -X GET "$BASE_URL/api/schedule-room?date=2024-12-25"

echo -e "\n\n4. Fetching scheduled rooms for specific room..."
curl -X GET "$BASE_URL/api/schedule-room?room_id=demo-room-123"

echo -e "\n\n5. Updating a scheduled room..."
curl -X PUT "$BASE_URL/api/schedule-room?room_id=demo-room-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Product Demo Meeting",
    "meeting_duration": 120
  }'

echo -e "\n\n6. Deleting a scheduled room..."
curl -X DELETE "$BASE_URL/api/schedule-room?room_id=demo-room-123"

echo -e "\n\nTests completed!" 