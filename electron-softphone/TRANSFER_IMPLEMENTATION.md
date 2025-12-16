# Call Transfer Implementation Guide

## Overview

This document describes the robust call transfer mechanism implemented in the Mayday CRM softphone application. The implementation supports both blind (cold) transfers and attended (warm) transfers.

## Architecture

### 1. SIP Service Layer (`sipService.js`)

The SIP service handles the low-level SIP protocol operations for transfers:

#### Blind Transfer

```javascript
sipCallService.transferCall(targetExtension, "blind");
```

- Creates a SIP URI for the target extension
- Sends a REFER request to transfer the call
- Handles response callbacks (accept/reject/progress)
- Terminates the local session after successful transfer

#### Attended Transfer

```javascript
sipCallService.attendedTransfer(targetExtension);
```

- Places current call on hold
- Creates a consultation call to the target
- Allows agent to speak with target before completing transfer
- Can be completed or cancelled

### 2. UI Layer (`Appbar.jsx`)

The UI provides controls for initiating and managing transfers:

- Transfer dialog with agent selection
- Toggle between blind and attended transfer modes
- Real-time transfer status updates
- Error handling and user notifications

### 3. Server Layer (`amiService.js`)

The AMI service provides server-side transfer support:

```javascript
amiService.transferCall(channel, targetExtension, transferType);
```

- Uses Asterisk AMI for server-side transfers
- Supports blind transfers via Redirect action
- Provides fallback for cases where SIP.js transfer fails

## Key Features

### 1. Dialog Handling

The implementation addresses the "Dialog undefined" error by:

- Using `UserAgent.makeURI()` instead of string URIs
- Improved session state checking before transfer
- Better error messages for dialog-related failures
- Session delegate for tracking dialog creation
- Fallback to re-INVITE if dialog is missing

### Session Termination

The implementation uses proper SIP.js methods for ending sessions:

- `session.bye()` for established sessions
- `session.cancel()` for sessions being established
- `session.reject()` for incoming sessions
- No longer uses the incorrect `session.terminate()` method

### 2. Early Media Support

The implementation now supports provider early media:

- Removed custom ringback audio playback
- `tryPlayEarlyMediaFromPeerConnection()` function handles early media
- Provider's ringtones and messages play naturally
- Handles both 180 Ringing and 183 Session Progress

### 3. Hold/Unhold Functionality

For attended transfers:

```javascript
sipService.holdCall();
sipService.unholdCall();
```

- Supports both SIP.js built-in hold and fallback methods
- Manages audio track state for hold/unhold
- Maintains hold state across transfer operations

### 4. Transfer State Management

```javascript
sipCallService.getTransferState();
```

Returns:

- `canTransfer`: Whether current call can be transferred
- `currentSession`: Session details including dialog availability
- `hasDialog`: Specific check for dialog presence

## Error Handling

### Common Errors and Solutions

1. **"Dialog undefined"**

   - Cause: Session not fully established
   - Solution: Check session state and wait for establishment

2. **"Transfer timeout"**

   - Cause: No response from server
   - Solution: 30-second timeout with proper cleanup

3. **"Cannot transfer to yourself"**

   - Cause: Target extension same as current
   - Solution: UI validation prevents self-transfer

4. **"Cannot read properties of undefined (reading 'body')"**

   - Cause: NOTIFY handler trying to access message body incorrectly
   - Solution: Multiple fallback checks for body location in request object

5. **"Invalid session or no peer connection"**
   - Cause: Audio setup attempted on transferred/terminated session
   - Solution: Check transfer state before audio setup

## Transfer Flow

### Blind Transfer Flow

1. User selects target agent and clicks "Transfer"
2. System validates session state
3. REFER request sent to SIP server
4. Server responds with 202 Accepted
5. System waits for NOTIFY messages or BYE from server
6. On NOTIFY with "200 OK" or BYE received: Transfer complete
7. Local session terminated automatically by server
8. Call successfully transferred to target agent

### Attended Transfer Flow

1. User selects "Attended" transfer type
2. Current call placed on hold
3. Consultation call established with target
4. Agent speaks with target
5. Agent clicks "Complete Transfer" or "Cancel"
6. On complete: Both calls connected and terminated locally
7. On cancel: Consultation ended, original call resumed

## Testing

### Test Scenarios

1. **Basic Blind Transfer**

   - Make a call
   - Wait for connection
   - Transfer to another extension
   - Verify call reaches target

2. **Attended Transfer**

   - Make a call
   - Select attended transfer
   - Verify hold state
   - Complete consultation
   - Verify transfer completion

3. **Error Scenarios**
   - Transfer before call established
   - Transfer to invalid extension
   - Network interruption during transfer

## Debugging

### Enable Debug Logging

The implementation includes comprehensive logging:

```javascript
console.log("Transfer debug info:", {
  sessionState: state.currentSession.state,
  sessionId: state.currentSession.id,
  sessionType: state.currentSession.constructor.name,
  hasRefer: typeof state.currentSession.refer === "function",
  targetUri: targetUri.toString(),
});
```

### Common Debug Points

1. Check session state before transfer
2. Verify dialog availability
3. Monitor REFER request/response
4. Track transfer state changes
5. Observe hold/unhold operations

## Future Improvements

1. **Fallback Mechanisms**

   - AMI-based transfer when SIP REFER fails
   - Alternative transfer via re-INVITE

2. **Enhanced UI**

   - Visual transfer progress indicator
   - Transfer history in UI
   - Drag-and-drop transfer

3. **Advanced Features**
   - Multi-party transfers
   - Transfer to external numbers
   - Transfer with notes/context
