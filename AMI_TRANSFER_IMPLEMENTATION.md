# AMI-Based Call Transfer Implementation

## Overview

This implementation replaces the browser-based SIP.js transfer functionality with a more reliable server-side AMI (Asterisk Manager Interface) based approach. All call transfers are now handled through the Asterisk server, ensuring better reliability and control.

## Architecture Changes

### 1. **Backend (Server-Side)**

#### AMI Service Enhancement (`server/services/amiService.js`)

- Added `transferCall()` function supporting both blind and attended transfers:
  - **Blind Transfer**: Uses AMI `Redirect` action to immediately transfer the call
  - **Attended Transfer**: Uses AMI `Atxfer` action for consultation before transfer
- Added `getChannelForExtension()` to find active channels for a given extension
- Emits transfer events: `call:ami_transfer_complete`, `call:ami_transfer_failed`, `call:ami_attended_transfer_started`

#### Transfer Controller (`server/controllers/transferController.js`)

- Added `executeTransfer()` endpoint to handle transfer requests from the frontend
- Added `getAvailableAgentsForTransfer()` to fetch agents available for transfer
- Routes:
  - `POST /api/transfers/execute` - Execute a transfer
  - `GET /api/transfers/available-agents` - Get available agents

#### Call Monitoring Service (`server/services/callMonitoringService.js`)

- Added event handlers for AMI transfer events
- Updates call status when transfers occur
- Tracks transfer targets and types

### 2. **Frontend (Client-Side)**

#### SIP Service (`electron-softphone/src/services/sipService.js`)

- Replaced browser-based REFER implementation with API calls to server
- `transferCall()` now makes HTTP request to `/api/transfers/execute`
- Simplified attended transfer handling - server manages the complexity
- Added `getAvailableAgents()` to fetch agents from the new API

#### Appbar Component (`electron-softphone/src/components/Appbar.jsx`)

- Updated `fetchAvailableAgents()` to use the new AMI-based API
- No changes needed to `handleTransferCall()` - it continues to work with the updated service

#### Call State Hook (`electron-softphone/src/hooks/useCallState.js`)

- Fixed event listener names to match new events (`call:transfer_initiated`)

## How It Works

### Blind Transfer Flow:

1. User selects target extension and clicks "Transfer"
2. Frontend calls `sipCallService.transferCall(targetExtension, 'blind')`
3. SIP service makes API call to `/api/transfers/execute`
4. Server gets the channel for the current extension
5. Server executes AMI `Redirect` action
6. Call is immediately transferred to target extension
7. Frontend receives success response and updates UI

### Attended Transfer Flow:

1. User selects target extension and chooses "Attended Transfer"
2. Frontend calls `sipCallService.attendedTransfer(targetExtension)`
3. Current call is placed on hold (using existing hold functionality)
4. Server executes AMI `Atxfer` action
5. Consultation call is established with target
6. User can complete or cancel the transfer

## Benefits

1. **Reliability**: Server-controlled transfers are more reliable than browser-based
2. **Compatibility**: Works with all Asterisk configurations
3. **Visibility**: Better logging and monitoring of transfers
4. **Control**: Server can enforce business rules and permissions
5. **Simplicity**: Frontend code is simpler without complex SIP handling

## Testing

A test script is provided at `test-ami-transfer.js`:

```bash
# Test blind transfer
node test-ami-transfer.js blind

# Test attended transfer
node test-ami-transfer.js attended
```

## Configuration

No special configuration needed. The implementation uses existing AMI credentials from `.env`:

- `AMI_HOST`
- `AMI_PORT`
- `AMI_USERNAME`
- `AMI_PASSWORD`

## Troubleshooting

1. **Transfer fails with "No active channel found"**

   - Ensure the extension has an active call
   - Check that AMI is connected and receiving events

2. **Attended transfer not working**

   - Verify Asterisk supports `Atxfer` action
   - Check Asterisk features.conf for attended transfer settings

3. **Available agents not showing**
   - Ensure agents are registered and marked as available
   - Check call monitoring service is running

## Migration Notes

- The frontend API remains mostly unchanged
- Existing transfer UI continues to work
- No database migrations required
- Backward compatible with existing call history
