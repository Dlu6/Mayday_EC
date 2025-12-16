# Asterisk AMI (Asterisk Manager Interface) Documentation

## Overview

The Asterisk Manager Interface (AMI) is a client/server protocol that allows external applications to control and monitor Asterisk. This document provides comprehensive information about AMI actions, events, and best practices for implementing call transfer functionality.

## Key AMI Actions for Call Transfer

### 1. Blind Transfer (Immediate Transfer)

```javascript
// Transfer a call immediately without consultation
const blindTransfer = {
  Action: "Redirect",
  Channel: "SIP/1010-00000001",
  Context: "from-internal",
  Exten: "1020",
  Priority: 1,
};

// Alternative using Transfer action
const blindTransferAlt = {
  Action: "Transfer",
  Channel: "SIP/1010-00000001",
  Context: "from-internal",
  Exten: "1020",
  Priority: 1,
};
```

### 2. Managed Transfer (Consultation Transfer)

```javascript
// Step 1: Create consultation call
const consultationCall = {
  Action: "Originate",
  Channel: "SIP/1020",
  Context: "from-internal",
  Exten: "s",
  Priority: 1,
  Callerid: "Transfer <1010>",
  Variable: "TRANSFER_TYPE=consultation",
};

// Step 2: Bridge the calls when consultation is answered
const bridgeCalls = {
  Action: "Bridge",
  Channel1: "SIP/1010-00000001", // Original call
  Channel2: "SIP/1020-00000002", // Consultation call
};
```

### 3. Transfer to Queue

```javascript
// Transfer call to a specific queue
const transferToQueue = {
  Action: "Redirect",
  Channel: "SIP/1010-00000001",
  Context: "from-queue",
  Exten: "queue_name",
  Priority: 1,
};
```

### 4. Transfer to External Number

```javascript
// Transfer to external number through trunk
const transferToExternal = {
  Action: "Redirect",
  Channel: "SIP/1010-00000001",
  Context: "from-trunk",
  Exten: "+1234567890",
  Priority: 1,
};
```

## Essential AMI Actions

### Channel Management

```javascript
// Get active channels
const getChannels = {
  Action: "CoreShowChannels",
};

// Get channel information
const getChannelInfo = {
  Action: "GetVar",
  Channel: "SIP/1010-00000001",
  Variable: "CHANNEL",
};

// Hangup channel
const hangupChannel = {
  Action: "Hangup",
  Channel: "SIP/1010-00000001",
};
```

### Call Monitoring

```javascript
// Monitor a call
const monitorCall = {
  Action: "Monitor",
  Channel: "SIP/1010-00000001",
  File: "call_recording",
  Format: "wav",
  Mix: true,
};

// Stop monitoring
const stopMonitor = {
  Action: "StopMonitor",
  Channel: "SIP/1010-00000001",
};
```

### Queue Operations

```javascript
// Get queue status
const getQueueStatus = {
  Action: "QueueStatus",
  Queue: "support",
};

// Add member to queue
const addQueueMember = {
  Action: "QueueAdd",
  Queue: "support",
  Interface: "SIP/1010",
  MemberName: "Agent 1010",
  Penalty: 0,
};
```

## AMI Events for Real-time Updates

### Call Events

```javascript
// New channel created
{
  Event: "Newchannel",
  Channel: "SIP/1010-00000001",
  ChannelState: "6",
  ChannelStateDesc: "Up",
  CallerIDNum: "1010",
  CallerIDName: "Agent 1010",
  Uniqueid: "1703123456.1"
}

// Channel bridged (calls connected)
{
  Event: "Bridge",
  Channel1: "SIP/1010-00000001",
  Channel2: "SIP/1020-00000002",
  Uniqueid1: "1703123456.1",
  Uniqueid2: "1703123456.2"
}

// Channel hung up
{
  Event: "Hangup",
  Channel: "SIP/1010-00000001",
  Cause: "16",
  Cause-txt: "Normal Clearing",
  Uniqueid: "1703123456.1"
}
```

### Queue Events

```javascript
// Caller joins queue
{
  Event: "QueueCallerJoin",
  Queue: "support",
  Position: "1",
  Count: "3",
  Uniqueid: "1703123456.1"
}

// Agent connects to call
{
  Event: "AgentConnect",
  Queue: "support",
  Agent: "SIP/1010",
  Uniqueid: "1703123456.1"
}
```

## Implementation Best Practices

### 1. Connection Management

```javascript
class AMIClient {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async connect() {
    try {
      // Implement connection logic
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit("connected");
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async executeAction(action) {
    if (!this.connected) {
      throw new Error("AMI not connected");
    }

    // Implement action execution
    return await this.sendAction(action);
  }
}
```

### 2. Event Handling

```javascript
class AMIEventHandler {
  constructor(amiClient) {
    this.amiClient = amiClient;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.amiClient.on("event", (event) => {
      switch (event.Event) {
        case "Newchannel":
          this.handleNewChannel(event);
          break;
        case "Bridge":
          this.handleBridge(event);
          break;
        case "Hangup":
          this.handleHangup(event);
          break;
        // Add more event handlers
      }
    });
  }

  handleNewChannel(event) {
    // Handle new channel creation
    console.log(`New channel: ${event.Channel}`);
  }
}
```

### 3. Call Transfer Implementation

```javascript
class CallTransferManager {
  constructor(amiClient) {
    this.amiClient = amiClient;
    this.activeTransfers = new Map();
  }

  async blindTransfer(channel, targetExtension) {
    try {
      const action = {
        Action: "Redirect",
        Channel: channel,
        Context: "from-internal",
        Exten: targetExtension,
        Priority: 1,
      };

      const response = await this.amiClient.executeAction(action);

      if (response.Response === "Success") {
        this.activeTransfers.set(channel, {
          type: "blind",
          target: targetExtension,
          timestamp: new Date(),
          status: "completed",
        });

        return { success: true, response };
      } else {
        throw new Error(`Transfer failed: ${response.Message}`);
      }
    } catch (error) {
      console.error("Blind transfer error:", error);
      throw error;
    }
  }

  async managedTransfer(originalChannel, targetExtension) {
    try {
      // Step 1: Create consultation call
      const consultationAction = {
        Action: "Originate",
        Channel: `SIP/${targetExtension}`,
        Context: "from-internal",
        Exten: "s",
        Priority: 1,
        Callerid: "Transfer <1010>",
        Variable: "TRANSFER_TYPE=consultation",
      };

      const consultationResponse = await this.amiClient.executeAction(
        consultationAction
      );

      if (consultationResponse.Response === "Success") {
        // Step 2: Wait for consultation to answer
        // Step 3: Bridge the calls
        // Implementation details...

        return { success: true, consultationId: consultationResponse.Uniqueid };
      }
    } catch (error) {
      console.error("Managed transfer error:", error);
      throw error;
    }
  }
}
```

## Error Handling and Troubleshooting

### Common AMI Errors

```javascript
// Authentication failed
{
  Response: "Error",
  Message: "Authentication failed"
}

// Channel not found
{
  Response: "Error",
  Message: "Channel SIP/1010-00000001 not found"
}

// Invalid action
{
  Response: "Error",
  Message: "Invalid/unknown command"
}
```

### Debugging Tips

1. **Enable AMI Debug Logging**: Set `debug=yes` in `manager.conf`
2. **Check Connection Status**: Monitor connection events
3. **Validate Actions**: Ensure all required parameters are provided
4. **Monitor Events**: Log all AMI events for debugging
5. **Test with CLI**: Use `asterisk -rx` to test commands manually

## Security Considerations

### AMI Security

```javascript
// Use strong passwords
// Limit access to specific IP addresses
// Enable TLS for encrypted communication
// Implement rate limiting
// Log all AMI actions for audit
```

## Performance Optimization

### Best Practices

1. **Connection Pooling**: Maintain persistent connections
2. **Event Filtering**: Only subscribe to necessary events
3. **Action Batching**: Group related actions when possible
4. **Error Recovery**: Implement automatic reconnection
5. **Resource Cleanup**: Properly close channels and connections

## Testing and Validation

### Test Scenarios

1. **Basic Transfer**: Simple extension-to-extension transfer
2. **Queue Transfer**: Transfer to various queue types
3. **External Transfer**: Transfer through different trunks
4. **Error Handling**: Test with invalid extensions/channels
5. **Load Testing**: Multiple simultaneous transfers
6. **Recovery Testing**: Network interruption scenarios

This documentation provides a comprehensive foundation for implementing AMI-based call transfer functionality in your Mayday CRM system.
