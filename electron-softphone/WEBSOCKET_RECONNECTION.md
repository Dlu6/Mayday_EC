# WebSocket Reconnection System

## Overview

The WebSocket reconnection system provides **robust and efficient** reconnection for the electron-softphone client. It centralizes lifecycle management and automatically handles connection failures and network interruptions.

## Features

### 🚀 Production-Grade Reconnection

- **Exponential Backoff**: Intelligent retry delays (1s → 30s cap)
- **Max Attempts**: Configurable retry limits (default: 20)
- **Jitter**: Random variation to prevent connection storms
- **Smart State Management**: Prevents parallel attempts

### 🔌 Robust Connection Handling

- **Socket.IO**: Transport matches server protocol (/socket.io/)
- **Timeouts**: 15s connection timeout with cleanup
- **Health Monitoring**: Health checks every 30s
- **Heartbeat**: Keep-alive every 25s

### 📊 Real-Time Health Monitoring

- **Health Scoring**: 0-100% shown in Connection Health
- **Quality**: Derived from heartbeat and health checks
- **Indicators**: `WebSocketStatus` shows state, attempts, next retry

## Architecture

### Core Components

1. **WebSocket Service** (`src/services/websocketService.js`)
   - Centralized Socket.IO lifecycle
   - Reconnection with exponential backoff
   - Health monitoring and heartbeat
   - Emits events for UI

2. **useWebSocket Hook** (`src/hooks/useWebSocket.js`)
   - React hook exposing state/actions
   - Event handling + cleanup

3. **WebSocketStatus Component** (`src/components/WebSocketStatus.jsx`)
   - Displays status, health, next attempt
   - Manual reconnection button

## Usage

### Basic Integration

```jsx
import { useWebSocket } from "../hooks/useWebSocket";

const MyComponent = () => {
  const { isConnected, healthScore, send, forceReconnect } = useWebSocket();
  return (
    <div>
      <p>Connected: {String(isConnected)}</p>
      <p>Health: {healthScore}%</p>
      <button onClick={() => forceReconnect()}>Force Reconnect</button>
    </div>
  );
};
```

### Status Component

```jsx
import WebSocketStatus from "../components/WebSocketStatus";

<WebSocketStatus showDetails />
```

## Configuration

```js
// websocketService.js
this.config = {
  maxReconnectAttempts: 20,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterRange: 1000,
  healthCheckInterval: 30000,
  connectionTimeout: 15000,
  heartbeatInterval: 25000,
  unhealthyThreshold: 3,
};
```

Backoff delay:
```
delay = Math.min(baseDelay * backoffMultiplier^(attempt-1), maxDelay) + jitter
```

## Event System

Available events:

```js
// Connection
"connection:connected"
"connection:disconnected"
"connection:failed"
"connection:reconnecting"
"connection:reconnected"
"connection:max_attempts_reached"

// Auth
"connection:auth_required"
"connection:auth_failed"

// Health
"connection:health_degraded"
"connection:health_check"

// Messages
"message"
```

## Health Scoring

- Base: 100 when connected
- Deduct for consecutive failures (up to 30)
- Deduct for degraded/failed quality
- Deduct for high attempts (>5)

## Migration

- ✅ Centralized Socket.IO connection/reconnection
- ✅ Removed scattered reconnection logic
- ✅ Unified health monitoring and UI

## Troubleshooting

- Ensure auth token exists
- Verify server URL and `/socket.io/` path
- Check `maxReconnectAttempts` and timeouts

```js
// Quick checks
websocketService.getStatus();
websocketService.getHealthScore();
await websocketService.forceReconnection();
```

## Performance

- Lightweight heartbeats
- Cleared timers on disconnect
- Exponential backoff avoids storms

## Future Enhancements

- Connection pooling
- Advanced metrics
- External monitoring hooks

## Conclusion

Centralized Socket.IO reconnection delivers a production-ready foundation with self-healing behavior and clean UI integration.
