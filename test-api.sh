#!/bin/bash

# Demo Stream API Testing Script
# Usage: ./test-api.sh

BASE_URL="http://localhost:3001"

echo "🚀 Demo Stream API Testing Script"
echo "=================================="

# Test Authentication
echo ""
echo "📝 Testing Authentication..."
echo "----------------------------"

# Login
echo "Testing login..."
http POST $BASE_URL/api/auth/login \
  email=user@example.com \
  password=password123

# Register
echo ""
echo "Testing registration..."
http POST $BASE_URL/api/auth/register \
  name="Test Company" \
  email=test@company.com \
  phone=+1234567890 \
  website=https://test.com

# Test Room Management
echo ""
echo "🏠 Testing Room Management..."
echo "----------------------------"

# Create Room
echo "Testing room creation..."
http POST $BASE_URL/api/room/create \
  videoUrl=https://example.com/video.mp4 \
  videoName="Sample Video"

# Join Room
echo ""
echo "Testing room join..."
http POST $BASE_URL/api/room/join \
  roomId=room-abc123

# Create Room with Content
echo ""
echo "Testing room with content creation..."
http POST $BASE_URL/api/room/manage \
  title="Test Room" \
  is_active=true \
  "host_content[]=content1,content2" \
  "representative_content[]=content3,content4" \
  representative=rep1,rep2

# Test Content Management
echo ""
echo "📁 Testing Content Management..."
echo "-------------------------------"

# Upload Content
echo "Testing content upload..."
http POST $BASE_URL/api/upload/content \
  title="My Video" \
  description="Video description" \
  type=video \
  library_type=host \
  file@/path/to/video.mp4 \
  representative=rep1

# Update Content
echo ""
echo "Testing content update..."
http PUT $BASE_URL/api/content-library/content123 \
  title="Updated Title" \
  description="Updated description" \
  active=true

# Toggle Content Active Status
echo ""
echo "Testing content toggle..."
http PUT $BASE_URL/api/content-library/content123 \
  active=false

# Test AI Assistants
echo ""
echo "🤖 Testing AI Assistants..."
echo "---------------------------"

# Create AI Assistant
echo "Testing AI assistant creation..."
http POST $BASE_URL/api/ai-assistants \
  name="My Assistant" \
  description="AI assistant description" \
  type=chatbot \
  configuration='{"key":"value"}' \
  is_active=true \
  viewrooom_connections=viewroom1,viewroom2

# Update AI Assistant
echo ""
echo "Testing AI assistant update..."
http PUT $BASE_URL/api/ai-assistants/assistant123 \
  name="Updated Assistant" \
  description="Updated description" \
  type=chatbot \
  configuration='{"updated":"config"}' \
  is_active=true

# Restore AI Assistant
echo ""
echo "Testing AI assistant restore..."
http PUT $BASE_URL/api/ai-assistants/assistant123 \
  status=true

# Remove File from AI Assistant
echo ""
echo "Testing file removal from AI assistant..."
http POST $BASE_URL/api/ai-assistants/assistant123/remove-file \
  fileIndex=0

# Test AI Room Designer
echo ""
echo "🎨 Testing AI Room Designer..."
echo "-----------------------------"

# Upload AI Room Design
echo "Testing AI room design upload..."
http POST $BASE_URL/api/ai-room-designer/create \
  title="Room Design" \
  description="Design description" \
  original_file@/path/to/original.png \
  generated_file@/path/to/generated.png

# Test Representatives
echo ""
echo "👥 Testing Representatives..."
echo "----------------------------"

# Get Representatives
echo "Testing get representatives..."
http GET $BASE_URL/api/representatives

# Create Representative
echo ""
echo "Testing representative creation..."
http POST $BASE_URL/api/representatives \
  name="John Doe" \
  email=john@company.com \
  phone=+1234567890 \
  is_active=true \
  schedule="9 AM - 5 PM"

# Update Representative
echo ""
echo "Testing representative update..."
http PUT $BASE_URL/api/representatives \
  id=rep123 \
  name="Updated Name" \
  email=updated@company.com \
  phone=+1234567890 \
  is_active=true \
  schedule="9 AM - 5 PM"

# Delete Representative
echo ""
echo "Testing representative deletion..."
http DELETE $BASE_URL/api/representatives \
  id=rep123

# Test Locations
echo ""
echo "📍 Testing Locations..."
echo "----------------------"

# Create Location
echo "Testing location creation..."
http POST $BASE_URL/api/locations \
  name="Main Office" \
  address="123 Main St" \
  city="City" \
  state="State" \
  zip_code=12345 \
  country="Country" \
  phone=+1234567890 \
  Mon="9:00 AM - 5:00 PM" \
  Tue="9:00 AM - 5:00 PM" \
  Wed="9:00 AM - 5:00 PM" \
  Thurs="9:00 AM - 5:00 PM" \
  Fri="9:00 AM - 5:00 PM" \
  Sat="Closed" \
  Sun="Closed" \
  is_active=true

# Update Location
echo ""
echo "Testing location update..."
http PUT $BASE_URL/api/locations/location123 \
  name="Updated Office" \
  address="456 Updated St" \
  city="Updated City" \
  state="Updated State" \
  zip_code=54321 \
  country="Updated Country" \
  phone=+1234567890 \
  Mon="8:00 AM - 6:00 PM" \
  Tue="8:00 AM - 6:00 PM" \
  Wed="8:00 AM - 6:00 PM" \
  Thurs="8:00 AM - 6:00 PM" \
  Fri="8:00 AM - 6:00 PM" \
  Sat="10:00 AM - 2:00 PM" \
  Sun="Closed" \
  is_active=true

# Delete Location
echo ""
echo "Testing location deletion..."
http DELETE $BASE_URL/api/locations/location123

# Test Room Info Updates
echo ""
echo "📋 Testing Room Info Updates..."
echo "-------------------------------"

# Update Room Info
echo "Testing room info update..."
http PUT $BASE_URL/api/room/room-abc123/info \
  title="Updated Room Title" \
  description="Updated description" \
  is_active=true \
  host_content=content1,content2 \
  representative_content=content3,content4 \
  representative=rep1,rep2

# Request Quote
echo ""
echo "Testing quote request..."
http POST $BASE_URL/api/room/room-abc123/quote \
  first_name=John \
  last_name=Doe \
  email=john@example.com \
  phone=+1234567890 \
  company="Test Company" \
  message="Quote request"

# Send Email Invitation
echo ""
echo "Testing email invitation..."
http POST $BASE_URL/api/room/send-email \
  name="Recipient Name" \
  receipient=recipient@example.com \
  url=https://room-url.com \
  uid=user123

# Test Video Deletion (Superuser Only)
echo ""
echo "🗑️ Testing Video Deletion..."
echo "----------------------------"

echo "Testing video deletion..."
http DELETE $BASE_URL/api/room/delete-video \
  videoId=video123

echo ""
echo "✅ API Testing Complete!"
echo "========================"
echo ""
echo "📚 Documentation files created:"
echo "  - api-documentation.md (Comprehensive API docs)"
echo "  - demo-stream-api.http (HTTPie collection)"
echo "  - openapi.yaml (OpenAPI/Swagger spec)"
echo "  - test-api.sh (This testing script)"
echo ""
echo "🌐 To view API docs with Swagger UI:"
echo "  1. Install swagger-ui: npm install -g swagger-ui"
echo "  2. Run: swagger-ui openapi.yaml"
echo ""
echo "📖 To use with HTTPie:"
echo "  - Use demo-stream-api.http with HTTPie"
echo "  - Or run individual commands from test-api.sh" 