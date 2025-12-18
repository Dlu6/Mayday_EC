---
sidebar_position: 2
---

# API Integration Guide

This technical reference provides comprehensive information about integrating with the MHU Helpline system through its API endpoints, including authentication, available methods, data formats, and best practices.

## API Overview

The MHU Helpline API allows external systems to interact with the call center platform, enabling integration with CRM systems, custom applications, reporting tools, and other business systems.

### API Architecture

- **REST API**: Primary interface using standard HTTP methods
- **WebSocket API**: For real-time events and notifications
- **Authentication**: JWT-based authentication system
- **Data Format**: JSON for request and response payloads
- **Rate Limiting**: Limits on API requests per time period
- **Versioning**: API versioning to ensure compatibility

## Authentication

### Obtaining API Credentials

To access the API, you need to obtain credentials:

1. Log in to the MHU Helpline admin portal
2. Navigate to **Integrations → API Keys**
3. Click **Generate New API Key**
4. Provide a name and description for the key
5. Select the appropriate permission scopes
6. Save the generated API key securely

### Authentication Methods

The API supports two authentication methods:

#### API Key Authentication

For server-to-server integrations:

```http
GET /api/v1/resource HTTP/1.1
Host: api.your-server-ip
X-API-Key: your_api_key_here
```

#### JWT Authentication

For user-context operations:

1. Obtain a JWT token by authenticating:

```http
POST /api/v1/auth/token HTTP/1.1
Host: api.your-server-ip
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

2. Use the token in subsequent requests:

```http
GET /api/v1/resource HTTP/1.1
Host: api.your-server-ip
Authorization: Bearer your_jwt_token_here
```

### Token Lifecycle

- Tokens are valid for 24 hours by default
- Refresh tokens can be used to obtain new access tokens
- Tokens can be revoked through the admin portal

## API Endpoints

### Call Management

#### Get Active Calls

Retrieve a list of currently active calls:

```http
GET /api/v1/calls/active
```

Response:

```json
{
  "calls": [
    {
      "id": "call123456",
      "caller_id": "+1234567890",
      "agent_id": "agent001",
      "queue_id": "support",
      "start_time": "2023-03-07T10:15:30Z",
      "duration": 125,
      "status": "in-progress"
    }
    // Additional calls...
  ],
  "total": 5
}
```

#### Initiate Outbound Call

Start an outbound call:

```http
POST /api/v1/calls/outbound
Content-Type: application/json

{
  "agent_id": "agent001",
  "destination": "+1234567890",
  "caller_id": "+9876543210",
  "priority": 1,
  "variables": {
    "case_id": "case12345",
    "client_name": "John Doe"
  }
}
```

Response:

```json
{
  "call_id": "call789012",
  "status": "initiating",
  "agent_id": "agent001",
  "destination": "+1234567890"
}
```

#### End Call

Terminate an active call:

```http
POST /api/v1/calls/{call_id}/end
```

Response:

```json
{
  "success": true,
  "call_id": "call789012",
  "end_time": "2023-03-07T10:25:45Z",
  "duration": 615
}
```

### Agent Management

#### Get Agent Status

Retrieve the current status of agents:

```http
GET /api/v1/agents/status
```

Response:

```json
{
  "agents": [
    {
      "id": "agent001",
      "name": "Jane Smith",
      "status": "available",
      "current_call_id": null,
      "time_in_status": 300,
      "queues": ["support", "crisis"]
    }
    // Additional agents...
  ]
}
```

#### Update Agent Status

Change an agent's status:

```http
PUT /api/v1/agents/{agent_id}/status
Content-Type: application/json

{
  "status": "on-break",
  "reason_code": "lunch"
}
```

Response:

```json
{
  "success": true,
  "agent_id": "agent001",
  "previous_status": "available",
  "current_status": "on-break",
  "timestamp": "2023-03-07T12:00:00Z"
}
```

### Queue Management

#### Get Queue Statistics

Retrieve current queue statistics:

```http
GET /api/v1/queues/stats
```

Response:

```json
{
  "queues": [
    {
      "id": "support",
      "name": "Support Queue",
      "calls_waiting": 3,
      "longest_wait_time": 145,
      "average_wait_time": 87,
      "available_agents": 2,
      "sla_current": 92.5
    }
    // Additional queues...
  ]
}
```

#### Update Queue Configuration

Modify queue settings:

```http
PUT /api/v1/queues/{queue_id}
Content-Type: application/json

{
  "max_wait_time": 300,
  "announcement_id": "announce123",
  "strategy": "round-robin"
}
```

Response:

```json
{
  "success": true,
  "queue_id": "support",
  "updated_fields": ["max_wait_time", "announcement_id", "strategy"]
}
```

### Client Data

#### Search Clients

Search for client records:

```http
GET /api/v1/clients/search?query=john+doe
```

Response:

```json
{
  "clients": [
    {
      "id": "client001",
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john.doe@example.com",
      "last_contact": "2023-03-01T15:30:00Z"
    }
    // Additional clients...
  ],
  "total": 3
}
```

#### Create Client Session

Create a new client session:

```http
POST /api/v1/clients/{client_id}/sessions
Content-Type: application/json

{
  "agent_id": "agent001",
  "call_id": "call789012",
  "session_type": "support",
  "notes": "Client called about anxiety issues",
  "priority": "medium",
  "tags": ["anxiety", "first-time-caller"]
}
```

Response:

```json
{
  "session_id": "session456789",
  "client_id": "client001",
  "agent_id": "agent001",
  "start_time": "2023-03-07T10:15:30Z",
  "status": "in-progress"
}
```

### Reporting

#### Generate Call Report

Generate a report of call activity:

```http
POST /api/v1/reports/calls
Content-Type: application/json

{
  "start_date": "2023-03-01T00:00:00Z",
  "end_date": "2023-03-07T23:59:59Z",
  "queues": ["support", "crisis"],
  "metrics": ["total_calls", "average_handle_time", "abandonment_rate"],
  "group_by": "day",
  "format": "json"
}
```

Response:

```json
{
  "report_id": "report123456",
  "status": "generating",
  "estimated_completion": "2023-03-07T14:05:00Z"
}
```

#### Get Report Status

Check the status of a report generation:

```http
GET /api/v1/reports/{report_id}/status
```

Response:

```json
{
  "report_id": "report123456",
  "status": "completed",
  "download_url": "https://api.your-server-ip/reports/download/report123456.json",
  "expires_at": "2023-03-14T14:00:00Z"
}
```

## WebSocket API

### Connecting to the WebSocket

To receive real-time events:

```javascript
const socket = new WebSocket("wss://api.your-server-ip/ws");

socket.onopen = function (event) {
  // Authenticate with the WebSocket
  socket.send(
    JSON.stringify({
      type: "auth",
      api_key: "your_api_key_here",
    })
  );
};

socket.onmessage = function (event) {
  const data = JSON.parse(event.data);
  // Handle the event based on its type
  switch (data.type) {
    case "call.new":
      handleNewCall(data.call);
      break;
    case "agent.status_changed":
      handleAgentStatusChange(data.agent);
      break;
    // Handle other event types...
  }
};
```

### Event Types

The WebSocket API emits various event types:

#### Call Events

- `call.new`: A new call has entered the system
- `call.queued`: A call has been placed in a queue
- `call.connected`: A call has been connected to an agent
- `call.ended`: A call has ended
- `call.transferred`: A call has been transferred

#### Agent Events

- `agent.logged_in`: An agent has logged in
- `agent.logged_out`: An agent has logged out
- `agent.status_changed`: An agent's status has changed
- `agent.call_assigned`: A call has been assigned to an agent

#### Queue Events

- `queue.threshold_exceeded`: A queue has exceeded a configured threshold
- `queue.sla_breach`: Service level agreement has been breached
- `queue.empty`: A queue has become empty
- `queue.config_changed`: Queue configuration has changed

## Data Models

### Call Object

```json
{
  "id": "call123456",
  "caller_id": "+1234567890",
  "destination": "+9876543210",
  "direction": "inbound",
  "status": "in-progress",
  "start_time": "2023-03-07T10:15:30Z",
  "answer_time": "2023-03-07T10:16:45Z",
  "end_time": null,
  "duration": 125,
  "wait_time": 75,
  "agent_id": "agent001",
  "queue_id": "support",
  "recording_url": "https://recordings.your-server-ip/call123456.mp3",
  "tags": ["priority", "returning-caller"],
  "variables": {
    "case_id": "case12345",
    "ivr_path": "1-3-2"
  }
}
```

### Agent Object

```json
{
  "id": "agent001",
  "username": "jsmith",
  "name": "Jane Smith",
  "email": "jane.smith@your-server-ip",
  "extension": "1001",
  "status": "available",
  "status_timestamp": "2023-03-07T09:30:00Z",
  "roles": ["agent", "supervisor"],
  "skills": {
    "support": 80,
    "crisis": 90,
    "technical": 60
  },
  "queues": ["support", "crisis"],
  "current_call_id": null,
  "statistics": {
    "calls_today": 12,
    "average_handle_time": 240,
    "available_time": 3600
  }
}
```

### Queue Object

```json
{
  "id": "support",
  "name": "Support Queue",
  "extension": "2000",
  "strategy": "round-robin",
  "timeout": 300,
  "announcement_id": "announce123",
  "music_on_hold_id": "moh456",
  "max_callers": 20,
  "agents": ["agent001", "agent002", "agent003"],
  "statistics": {
    "calls_waiting": 3,
    "longest_wait_time": 145,
    "average_wait_time": 87,
    "handled_today": 45,
    "abandoned_today": 5,
    "sla_today": 92.5
  },
  "operating_hours": {
    "monday": { "start": "09:00", "end": "17:00" },
    "tuesday": { "start": "09:00", "end": "17:00" }
    // Other days...
  }
}
```

## Error Handling

### Error Responses

API errors follow a consistent format:

```json
{
  "error": true,
  "code": "invalid_credentials",
  "message": "The provided API key is invalid or has expired",
  "status": 401,
  "request_id": "req123456"
}
```

### Common Error Codes

- `invalid_credentials`: Authentication failed
- `insufficient_permissions`: Lacking permission for the requested operation
- `resource_not_found`: The requested resource doesn't exist
- `validation_error`: Request data failed validation
- `rate_limit_exceeded`: Too many requests in a given time period
- `server_error`: An unexpected server error occurred

### Best Practices for Error Handling

1. Always check for error responses
2. Log the `request_id` for troubleshooting
3. Implement exponential backoff for rate limiting
4. Handle authentication errors by refreshing tokens
5. Provide meaningful error messages to users

## Rate Limiting

The API implements rate limiting to ensure system stability:

- **Standard Tier**: 60 requests per minute
- **Premium Tier**: 300 requests per minute
- **Enterprise Tier**: Custom limits based on needs

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1678189800
```

When rate limits are exceeded, the API returns a 429 Too Many Requests status code.

## Webhooks

### Configuring Webhooks

To receive notifications at your endpoints:

1. Navigate to **Integrations → Webhooks**
2. Click **Add Webhook**
3. Provide:
   - **URL**: Your endpoint that will receive the webhook
   - **Events**: Select which events to receive
   - **Secret**: A shared secret for verifying webhook authenticity

### Webhook Payload

Webhook payloads follow this format:

```json
{
  "event_type": "call.ended",
  "timestamp": "2023-03-07T11:45:30Z",
  "webhook_id": "webhook789",
  "data": {
    // Event-specific data
    "call_id": "call123456",
    "duration": 450,
    "agent_id": "agent001",
    "disposition": "completed"
  }
}
```

### Verifying Webhooks

Webhooks include a signature header for verification:

```
X-MHU-Signature: sha256=5257a869e7bdf3ecbd7687cf1bfcc2e5a9990629e44d72b23114c452d7eba2e2
```

To verify the signature:

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

## Implementation Examples

### JavaScript/Node.js

```javascript
const axios = require("axios");

// Configure API client
const apiClient = axios.create({
  baseURL: "https://api.your-server-ip/api/v1",
  headers: {
    "X-API-Key": "your_api_key_here",
    "Content-Type": "application/json",
  },
});

// Get active calls
async function getActiveCalls() {
  try {
    const response = await apiClient.get("/calls/active");
    return response.data.calls;
  } catch (error) {
    console.error(
      "Error fetching active calls:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Update agent status
async function updateAgentStatus(agentId, status, reasonCode) {
  try {
    const response = await apiClient.put(`/agents/${agentId}/status`, {
      status,
      reason_code: reasonCode,
    });
    return response.data;
  } catch (error) {
    console.error(
      "Error updating agent status:",
      error.response?.data || error.message
    );
    throw error;
  }
}
```

### Python

```python
import requests

# API configuration
API_BASE_URL = 'https://api.your-server-ip/api/v1'
API_KEY = 'your_api_key_here'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Get queue statistics
def get_queue_stats():
    try:
        response = requests.get(f'{API_BASE_URL}/queues/stats', headers=headers)
        response.raise_for_status()
        return response.json()['queues']
    except requests.exceptions.RequestException as e:
        print(f"Error fetching queue stats: {e}")
        return None

# Create client session
def create_client_session(client_id, agent_id, call_id, session_data):
    try:
        payload = {
            'agent_id': agent_id,
            'call_id': call_id,
            **session_data
        }
        response = requests.post(
            f'{API_BASE_URL}/clients/{client_id}/sessions',
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error creating client session: {e}")
        return None
```

## Best Practices

### Security

- Store API keys securely, never in client-side code
- Implement proper error handling for authentication failures
- Use HTTPS for all API communications
- Rotate API keys periodically
- Limit API key permissions to only what's needed

### Performance

- Implement caching for frequently accessed data
- Use pagination for large data sets
- Minimize the number of API calls
- Batch operations when possible
- Handle rate limiting gracefully

### Reliability

- Implement retry logic with exponential backoff
- Log all API interactions for troubleshooting
- Monitor API usage and response times
- Set up alerts for API failures
- Test your integration thoroughly

## API Changelog

### v1.2.0 (2023-02-15)

- Added WebSocket support for real-time events
- Introduced new endpoints for client session management
- Improved rate limiting with tiered approach
- Added support for custom report generation

### v1.1.0 (2022-11-10)

- Added webhook functionality
- Expanded agent management capabilities
- Improved error reporting
- Added bulk operations for efficiency

### v1.0.0 (2022-08-01)

- Initial API release
- Basic call, agent, and queue management
- Reporting capabilities
- Authentication system

## Support and Resources

- **API Documentation**: Full documentation available at https://api.your-server-ip/docs
- **Support Email**: api-support@your-server-ip
- **Issue Reporting**: Submit issues through the developer portal
- **Rate Limit Increases**: Contact your account manager for custom rate limits
- **Sample Code**: Additional examples available in the developer portal
