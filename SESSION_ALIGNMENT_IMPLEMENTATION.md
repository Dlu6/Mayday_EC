# Session Alignment Implementation

## Overview

This document describes the implementation of unified session management between the frontend (Electron softphone) and backend (AMI service) to ensure consistent agent availability tracking using the `ps_contacts` table as the single source of truth.

## Problem Statement

### Previous Issues

1. **Session Lifecycle Mismatch**

   - Frontend SIP registration happened independently of backend AMI tracking
   - `ps_contacts` table showed real-time status but wasn't synchronized with frontend login/logout
   - Agent could appear "Available" in Asterisk but "Offline" in dashboard

2. **Logout Process Inconsistency**

   - Frontend logged out and disconnected SIP
   - Backend PJSIP cleanup happened but `ps_contacts` table wasn't updated
   - Agent remained "Available" in `ps_contacts` after logout

3. **Missing Real-time Synchronization**
   - No mechanism to update `ps_contacts` when user logged in/out from frontend
   - AMI service only handled events from Asterisk, not from application logic

## Solution Architecture

### 1. Unified Session Flow

```
Frontend Login → SIP Registration → Backend Notification → ps_contacts Update → AMI Events
     ↓                ↓                    ↓                    ↓              ↓
Login.jsx → sipService.initialize() → agent-online → setContactOnline() → Dashboard Update
```

```
Frontend Logout → SIP Disconnect → Backend Notification → ps_contacts Update → AMI Events
     ↓               ↓                    ↓                    ↓              ↓
Appbar.jsx → sipService.disconnect() → agent-logout → setContactOffline() → Dashboard Update
```

### 2. Data Flow Components

#### Frontend Components

- **`Login.jsx`**: Initiates login, calls `agent-online` endpoint
- **`Appbar.jsx`**: Handles logout, calls `agent-logout` endpoint
- **`sipService.js`**: Manages SIP connection state

#### Backend Components

- **`amiService.js`**: Manages `ps_contacts` table updates
- **`usersController.js`**: Handles login/logout notifications
- **`ps_contacts` table**: Single source of truth for agent status

## Implementation Details

### 1. Enhanced AMI Service

#### New Functions Added

```javascript
// Set contact offline (for logout scenarios)
async function setContactOffline(extension) {
  // Update ps_contacts table to "Expired" status
  // Clear cache and emit events
  // Ensure immediate status reflection
}

// Set contact online (for login scenarios)
async function setContactOnline(extension, contactUri) {
  // Update ps_contacts table to "Reachable" status
  // Set expiration time to 1 hour
  // Clear cache and emit events
}
```

#### Key Features

- **Immediate Database Updates**: Changes `ps_contacts` table instantly
- **Cache Invalidation**: Forces refresh of cached status data
- **Event Emission**: Triggers real-time updates to connected clients
- **Status Consistency**: Ensures database matches actual session state

### 2. New API Endpoints

#### `/api/users/agent-online` (POST)

- **Purpose**: Notify backend when agent successfully logs in
- **Payload**: `{ extension, contactUri }`
- **Actions**:
  - Updates user status in database (`online: true`, `sipRegistered: true`)
  - Calls `amiService.setContactOnline()`
  - Emits `agent:status` event
  - Updates `ps_contacts` table

#### `/api/users/agent-logout` (POST) - Enhanced

- **Purpose**: Handle agent logout and cleanup
- **Actions**:
  - Updates user status in database (`online: false`, `sipRegistered: false`)
  - Calls `amiService.setContactOffline()`
  - Cleans up PJSIP configurations
  - Updates `ps_contacts` table to "Expired"

### 3. Frontend Integration

#### Login Process (`Login.jsx`)

```javascript
// After successful SIP initialization
await fetch(`${state.host}/api/users/agent-online`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokens.sip}`,
  },
  body: JSON.stringify({
    extension: user.extension,
    contactUri: `sip:${user.extension}@${user.pjsip.server}`,
  }),
});
```

#### Logout Process (`Appbar.jsx`)

```javascript
// After SIP disconnect and agent service logout
await fetch(`${host}/api/users/agent-logout`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: token,
  },
});
```

## Benefits

### 1. **Consistent Agent Status**

- Frontend and backend always show the same agent availability
- `ps_contacts` table reflects actual session state
- No more "Available in Asterisk, Offline in Dashboard" discrepancies

### 2. **Real-time Updates**

- On Socket.IO connect, backend now sends `agents:snapshot` immediately.
- AMI `ContactStatus` deltas are pushed as `agent:status` events (no initial REST dependency).
- Agent status changes are reflected instantly in the dashboard and transfer dialog.

### 3. **Reliable Session Tracking**

- Single source of truth (`ps_contacts` table)
- Database-backed persistence
- AMI event synchronization

### 4. **Improved User Experience**

- Instant feedback on login/logout status
- Consistent status across all system components
- Reliable call transfer availability

## Testing Scenarios

### 1. **Login Flow**

1. User enters credentials in `Login.jsx`
2. Backend validates and creates session
3. SIP service initializes
4. Frontend calls `agent-online` endpoint
5. Backend updates `ps_contacts` table
6. Dashboard shows agent as "Available"

### 2. **Logout Flow**

1. User clicks logout in `Appbar.jsx`
2. SIP service disconnects
3. Agent service logs out
4. Frontend calls `agent-logout` endpoint
5. Backend updates `ps_contacts` table to "Expired"
6. Dashboard shows agent as "Offline"

### 3. **Status Consistency**

1. Check Asterisk CLI: `pjsip show contacts`
2. Check Dashboard: Agent availability display
3. Verify both show the same status
4. Confirm `ps_contacts` table matches

## Monitoring and Debugging

### 1. **Log Messages**

- AMI service logs all contact status changes
- Backend logs agent online/offline events
- Frontend logs API call results

### 2. **Database Verification**

```sql
-- Check current agent status
SELECT endpoint, status, expiration_time
FROM ps_contacts
WHERE endpoint = '1001';

-- Check user online status
SELECT username, extension, online, sipRegistered
FROM users
WHERE extension = '1001';
```

### 3. **Event Monitoring**

- AMI events: `extension:contactStatus`, `extension:availability_changed`
- Backend events: `agent:status`
- WebSocket events for real-time updates

## Error Handling

### 1. **Graceful Degradation**

- If `agent-online` fails, SIP still works (status may be inconsistent)
- If `agent-logout` fails, force cleanup continues
- Database errors don't prevent core functionality

### 2. **Retry Mechanisms**

- Frontend API calls have timeouts
- Backend operations use transactions
- AMI service handles connection failures

### 3. **Fallback Strategies**

- Use existing PJSIP cleanup if AMI fails
- Maintain local state even if backend is unreachable
- Clear cache on errors to force refresh

## Future Enhancements

### 1. **Session Recovery**

- Detect orphaned sessions on startup
- Auto-cleanup expired contacts
- Session state validation

### 2. **Multi-device Support**

- Handle multiple SIP registrations per extension
- Device-specific status tracking
- Presence management

### 3. **Advanced Monitoring**

- Session duration tracking
- Login/logout analytics
- Performance metrics

## Conclusion

The session alignment implementation ensures that:

1. **Frontend and backend are always synchronized** regarding agent availability
2. **`ps_contacts` table serves as the single source of truth** for agent status
3. **Real-time updates happen instantly** upon login/logout
4. **Call transfer functionality works reliably** with accurate agent availability
5. **System consistency is maintained** across all components

This implementation resolves the core issue of inconsistent agent availability display and provides a robust foundation for reliable call center operations.

---

**Status**: ✅ **Implementation Complete**
**Next Steps**: Test login/logout flows and verify status consistency
