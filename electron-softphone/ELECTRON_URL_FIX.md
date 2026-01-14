# Electron URL Configuration Fix

## Problem

When running the Electron app, `window.location.origin` returns `file://` which causes WebSocket and API connections to fail with errors like:

- `WebSocket connection to 'ws://file/socket.io/...' failed: Error in connection establishment: net::ERR_NAME_NOT_RESOLVED`
- `net::ERR_SSL_PROTOCOL_ERROR` when trying to use non-secure WebSocket from HTTPS context

## Solution

We've implemented a centralized configuration system that properly handles URLs in both development and production environments, specifically accounting for Electron's file:// protocol.

## Changes Made

### 1. Core Services Updated

- **sipService.js**: Now uses WSS in production automatically
- **agentService.js**: Checks for file:// protocol and uses production URL
- **websocketService.js**: Same file:// protocol check
- **realtimeService.js**: Environment-aware URL selection
- **amiCallService.js**: Fixed to use production URL
- **Login.jsx**: Updated agent-online endpoint
- **Appbar.jsx**: Fixed extension fetch URL

### 2. Configuration Module

Created `src/config/environment.js` that provides:

- Centralized URL configuration
- Automatic environment detection
- File protocol safety checks
- Helper functions for API URLs

## Usage

### In Services

```javascript
import config from "../config/environment";

// Use the configuration
const socket = io(config.socketUrl, {
  /* options */
});
const response = await fetch(config.getApiUrl("/api/endpoint"));
```

### Environment Variables (Optional)

You can override defaults with environment variables:

- `VITE_API_URL`: Override API URL
- `VITE_SOCKET_URL`: Override Socket.IO URL
- `VITE_WS_URL`: Override WebSocket URL

### Production URLs

- API/Socket.IO: `http://192.168.1.14`
- SIP WebSocket: `ws://192.168.1.14:8088/ws`

## Testing

1. Build the Electron app: `npm run build`
2. Run in production mode
3. Check console - no more file:// errors
4. Verify connections:
   - SIP connects to wss://
   - Socket.IO connects to https://
   - API calls go to https://

## Future Improvements

- Consider using electron-store for persistent configuration
- Add connection retry logic with exponential backoff
- Implement connection status indicators in UI
