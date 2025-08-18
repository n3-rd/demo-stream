# Room Scheduling API Documentation

## Overview
The Room Scheduling API allows you to programmatically schedule, manage, and query scheduled rooms for video meetings.

## Base URL
```
http://localhost:3001/api/schedule-room
```

## Endpoints

### 1. Schedule a Room (POST)

**Endpoint:** `POST /api/schedule-room`

**Request Body:**
```json
{
  "title": "Meeting Title",
  "representative_ids": ["uuid1", "uuid2"],
  "schedule_time": "2024-12-25T14:00:00.000Z",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "room_id": "unique-room-id",
  "additional_information": "Optional meeting notes",
  "meeting_duration": 60,
  "join_before_minutes": 15,
  "host_content": ["content1", "content2"],
  "representative_content": ["rep-content1"]
}
```

**Required Fields:**
- `title` - Meeting title
- `representative_ids` - Array of representative UUIDs
- `schedule_time` - ISO 8601 timestamp (must be in future)
- `customer_name` - Customer's full name
- `customer_email` - Customer's email address

**Optional Fields:**
- `customer_phone` - Customer's phone number
- `room_id` - Custom room identifier
- `additional_information` - Meeting notes
- `meeting_duration` - Duration in minutes (default: 60)
- `join_before_minutes` - Early join allowance (default: 15)
- `host_content` - Array of host content IDs
- `representative_content` - Array of representative content IDs

**Response:**
```json
{
  "success": true,
  "message": "Room scheduled successfully",
  "scheduled_room": {
    "id": "uuid",
    "title": "Meeting Title",
    "scheduleTime": "2024-12-25T14:00:00.000Z",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "meetingStatus": "scheduled"
  }
}
```

### 2. Get Scheduled Rooms (GET)

**Endpoint:** `GET /api/schedule-room`

**Query Parameters:**
- `room_id` - Filter by specific room ID
- `representative_id` - Filter by representative ID
- `date` - Filter by specific date (YYYY-MM-DD format)

**Examples:**
```bash
# Get all scheduled rooms
GET /api/schedule-room

# Get rooms for specific date
GET /api/schedule-room?date=2024-12-25

# Get rooms for specific representative
GET /api/schedule-room?representative_id=uuid

# Get specific room
GET /api/schedule-room?room_id=demo-room-123
```

**Response:**
```json
{
  "success": true,
  "scheduled_rooms": [
    {
      "id": "uuid",
      "title": "Meeting Title",
      "scheduleTime": "2024-12-25T14:00:00.000Z",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "meetingStatus": "scheduled"
    }
  ]
}
```

### 3. Update Scheduled Room (PUT)

**Endpoint:** `PUT /api/schedule-room?room_id={room_id}`

**Request Body:** Any fields to update
```json
{
  "title": "Updated Meeting Title",
  "meeting_duration": 90,
  "additional_information": "Updated notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Room updated successfully",
  "scheduled_room": {
    "id": "uuid",
    "title": "Updated Meeting Title",
    "meeting_duration": 90
  }
}
```

### 4. Delete Scheduled Room (DELETE)

**Endpoint:** `DELETE /api/schedule-room?room_id={room_id}`

**Response:**
```json
{
  "success": true,
  "message": "Scheduled room deleted successfully"
}
```

## Error Responses

**400 Bad Request:**
```json
{
  "error": "Missing required fields: title, representative_ids, schedule_time, customer_name, customer_email"
}
```

**409 Conflict:**
```json
{
  "error": "Time slot is already booked"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## Usage Examples

### JavaScript/Node.js
```javascript
// Schedule a room
const response = await fetch('/api/schedule-room', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Product Demo',
    representative_ids: ['rep-uuid'],
    schedule_time: '2024-12-25T14:00:00.000Z',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    room_id: 'demo-123'
  })
});

const result = await response.json();
console.log('Scheduled:', result.scheduled_room);
```

### Python
```python
import requests

# Schedule a room
data = {
    "title": "Product Demo",
    "representative_ids": ["rep-uuid"],
    "schedule_time": "2024-12-25T14:00:00.000Z",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "room_id": "demo-123"
}

response = requests.post('http://localhost:3001/api/schedule-room', json=data)
result = response.json()
print(f"Scheduled: {result['scheduled_room']}")
```

### cURL
```bash
curl -X POST "http://localhost:3001/api/schedule-room" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product Demo",
    "representative_ids": ["rep-uuid"],
    "schedule_time": "2024-12-25T14:00:00.000Z",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "room_id": "demo-123"
  }'
```

## Integration with Existing System

The scheduled rooms integrate with:
- **Room Management** - Creates actual meeting rooms
- **Representative System** - Assigns representatives to meetings
- **Customer Management** - Tracks customer information
- **Access Control** - Enforces meeting timing rules
- **Notifications** - Can trigger SMS/push notifications

## Testing

Use the provided test script:
```bash
chmod +x test-schedule-api.sh
./test-schedule-api.sh
```

## Notes

- All timestamps should be in ISO 8601 format
- Schedule times must be in the future
- Room IDs should be unique across the system
- The API automatically handles timezone conversions
- Representative IDs should reference existing representatives in the system 