# Demo Stream API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication
Most endpoints require authentication via PocketBase. Include the session cookie in requests.

## API Endpoints

### Authentication

#### POST /api/auth/login
**Description:** User login
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "type": "success",
  "data": {
    "user": {...},
    "success": true
  }
}
```

#### POST /api/auth/register
**Description:** User registration
**Body:**
```json
{
  "name": "Company Name",
  "email": "company@example.com",
  "phone": "+1234567890",
  "website": "https://example.com"
}
```

### Room Management

#### POST /api/room/create
**Description:** Create a new room
**Body:**
```form-data
videoUrl: "https://example.com/video.mp4"
videoName: "Sample Video"
```
**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room_id",
    "room_id": "room-abc123",
    "videoUrl": "https://example.com/video.mp4",
    "videoName": "Sample Video"
  }
}
```

#### POST /api/room/join
**Description:** Join an existing room
**Body:**
```form-data
roomId: "room-abc123"
```

#### POST /api/room/manage
**Description:** Create room with content management
**Body:**
```form-data
title: "Room Title"
is_active: "true"
host_content[]: "content_id_1,content_id_2"
representative_content[]: "content_id_3,content_id_4"
representative: "rep_id_1,rep_id_2"
```

#### DELETE /api/room/delete-video
**Description:** Delete a video (superuser only)
**Body:**
```form-data
videoId: "video_id"
```

#### PUT /api/room/[roomId]/info
**Description:** Update room information
**Body:**
```form-data
title: "Updated Room Title"
description: "Room description"
is_active: "true"
host_content: "content_id_1,content_id_2"
representative_content: "content_id_3,content_id_4"
representative: "rep_id_1,rep_id_2"
```

#### POST /api/room/[roomId]/quote
**Description:** Request a quote for a room
**Body:**
```form-data
first_name: "John"
last_name: "Doe"
email: "john@example.com"
phone: "+1234567890"
company: "Company Name"
message: "Quote request message"
```

#### POST /api/room/send-email
**Description:** Send room invitation email
**Body:**
```form-data
name: "Recipient Name"
receipient: "recipient@example.com"
url: "room_url"
uid: "user_id"
```

### Content Management

#### POST /api/upload/content
**Description:** Upload content to library
**Body:**
```form-data
title: "Content Title"
description: "Content description"
type: "video"
library_type: "host"
file: [binary file]
representative: "rep_id"
```

#### PUT /api/content-library/[id]
**Description:** Update content library item
**Body:**
```form-data
title: "Updated Title"
description: "Updated description"
active: "true"
```

#### DELETE /api/content-library/[id]
**Description:** Delete content library item

### AI Assistants

#### POST /api/ai-assistants
**Description:** Create AI assistant
**Body:**
```form-data
name: "Assistant Name"
description: "Assistant description"
type: "chatbot"
configuration: "config_json"
is_active: "true"
viewrooom_connections: "viewroom_id_1,viewroom_id_2"
```

#### PUT /api/ai-assistants/[id]
**Description:** Update AI assistant
**Body:**
```form-data
name: "Updated Name"
description: "Updated description"
type: "chatbot"
configuration: "updated_config"
is_active: "true"
status: "true" // for restore
```

#### DELETE /api/ai-assistants/[id]
**Description:** Delete AI assistant

#### POST /api/ai-assistants/[id]/remove-file
**Description:** Remove file from AI assistant
**Body:**
```form-data
fileIndex: "0"
```

### AI Room Designer

#### POST /api/ai-room-designer/create
**Description:** Upload AI room design
**Body:**
```form-data
title: "Room Design Title"
description: "Design description"
original_file: [binary file]
generated_file: [binary file]
```

### Representatives

#### GET /api/representatives
**Description:** Get all representatives

#### POST /api/representatives
**Description:** Create representative
**Body:**
```form-data
name: "Representative Name"
email: "rep@example.com"
phone: "+1234567890"
is_active: "true"
schedule: "9 AM - 5 PM"
```

#### PUT /api/representatives
**Description:** Update representative
**Body:**
```form-data
id: "rep_id"
name: "Updated Name"
email: "updated@example.com"
phone: "+1234567890"
is_active: "true"
schedule: "9 AM - 5 PM"
```

#### DELETE /api/representatives
**Description:** Delete representative
**Body:**
```form-data
id: "rep_id"
```

### Locations

#### POST /api/locations
**Description:** Create location
**Body:**
```form-data
name: "Location Name"
address: "123 Main St"
city: "City"
state: "State"
zip_code: "12345"
country: "Country"
phone: "+1234567890"
Mon: "9:00 AM - 5:00 PM"
Tue: "9:00 AM - 5:00 PM"
Wed: "9:00 AM - 5:00 PM"
Thurs: "9:00 AM - 5:00 PM"
Fri: "9:00 AM - 5:00 PM"
Sat: "Closed"
Sun: "Closed"
is_active: "true"
```

#### PUT /api/locations/[id]
**Description:** Update location
**Body:** Same as POST

#### DELETE /api/locations/[id]
**Description:** Delete location

## HTTPie Examples

### Login
```bash
http POST localhost:3001/api/auth/login email=user@example.com password=password123
```

### Create Room
```bash
http POST localhost:3001/api/room/create videoUrl=https://example.com/video.mp4 videoName="Sample Video"
```

### Upload Content
```bash
http POST localhost:3001/api/upload/content title="My Video" description="Video description" type=video library_type=host file@/path/to/video.mp4
```

### Create AI Assistant
```bash
http POST localhost:3001/api/ai-assistants name="My Assistant" description="AI assistant description" type=chatbot is_active=true
```

### Toggle Content Active Status
```bash
http PUT localhost:3001/api/content-library/content_id active=false
```

### Create Location
```bash
http POST localhost:3001/api/locations name="Main Office" address="123 Main St" city="City" state="State" zip_code=12345 country="Country" phone="+1234567890" Mon="9:00 AM - 5:00 PM" Tue="9:00 AM - 5:00 PM" Wed="9:00 AM - 5:00 PM" Thurs="9:00 AM - 5:00 PM" Fri="9:00 AM - 5:00 PM" Sat="Closed" Sun="Closed" is_active=true
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Success Responses

All endpoints return consistent success responses:

```json
{
  "success": true,
  "message": "Success description",
  "data": {...} // Optional data
}
``` 