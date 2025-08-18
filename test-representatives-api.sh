#!/bin/bash

# Test script for Representatives API
BASE_URL="http://localhost:3001"

echo "Testing Representatives API..."
echo "=============================="

# Test 1: Get all representatives
echo "1. Getting all representatives..."
curl -X GET "$BASE_URL/api/representatives"

echo -e "\n\n2. Getting representatives by name..."
curl -X GET "$BASE_URL/api/representatives?name=John"

echo -e "\n\n3. Getting a specific representative by ID..."
curl -X GET "$BASE_URL/api/representatives/7545fc7e-8297-4b35-bd12-35b343aac936"

echo -e "\n\n4. Creating a new representative..."
curl -X POST "$BASE_URL/api/representatives" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Representative",
    "email": "test@example.com",
    "phone": "+1234567890",
    "is_active": true
  }'

echo -e "\n\n5. Updating a representative..."
curl -X PUT "$BASE_URL/api/representatives?id=7545fc7e-8297-4b35-bd12-35b343aac936" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Representative",
    "email": "updated@example.com"
  }'

echo -e "\n\nTests completed!" 