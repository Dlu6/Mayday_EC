# Mayday CRM - Asterisk Integration System

A comprehensive Customer Relationship Management (CRM) system with advanced Asterisk PBX integration, featuring real-time call management, transfer functionality, SIP.js-based softphone capabilities, and a multi-component architecture designed for enterprise call centers.

## 🚀 Current Status

**Development Phase**: Enhanced Transfer System Implementation ✅  
**Now In Progress**: Full AMI Call Lifecycle Management with Redis Integration 🚧  
**Current Branch**: `feature/enhanced-transfer-system`  
**Server Status**: Running on VM (Port 8004)  
**Last Update**: December 2025

### ✅ Completed Features

- **Enhanced Transfer System**: Blind, managed, and queue transfers
- **MCP Server Integration**: Remote VM development environment
- **AMI/ARI Integration**: Full Asterisk Manager Interface support
- **Electron Softphone AMI Mode**: Appbar uses AMI originate/hangup and AMI/Redis socket availability
- **Login Flow**: AMI/JWT-only client auth; no SIP.js init during login
- **Development Environment**: Automated setup and deployment
- **Import Issues**: All module import problems resolved
- **Multi-Component Architecture**: Fully integrated system components
- **ODBC Functions Management**: UI for viewing Asterisk ODBC dialplan functions 🆕
- **Agent Pause Check in Dialplan**: ODBC_AGENT_PAUSED function for queue routing 🆕
- **Dialplan Tab in Agent Edit**: View/manage agent-specific dialplan entries 🆕
- **Database Connection Pool Optimization**: Increased pool size and caching 🆕

### 🚧 **Upcoming: Full AMI Call Lifecycle Management**

**Target**: Replace SIP.js direct calling with AMI-based call management for enhanced control and monitoring

**Key Benefits**:

- **Full Call Control**: Complete AMI-based call lifecycle management
- **Real-Time Monitoring**: Enhanced call state tracking and analytics
- **Advanced Transfers**: Queue-based and external number transfers
- **Session Persistence**: Redis-based session management and recovery
- **Scalability**: Better performance and reliability for enterprise use

## 📋 **Implementation To-Do List**

### **Phase 1: Redis Infrastructure Setup** 🗄️

#### **1.1 Redis Server Installation & Configuration**

- [ ] Install Redis server on VM
- [ ] Configure Redis for production use (persistence, security)
- [ ] Set up Redis cluster/replication if needed
- [ ] Configure Redis password and access controls
- [ ] Test Redis connectivity from Node.js server

#### **1.2 Redis Service Layer**

- [ ] Create `server/services/redisService.js`
- [ ] Implement Redis connection pooling
- [ ] Add Redis health monitoring
- [ ] Create Redis error handling and reconnection logic
- [ ] Add Redis metrics and logging

#### **1.3 Redis Data Models**

- [ ] Design Redis key structure for:
  - Call sessions (`call:{callId}`)
  - Agent status (`agent:{extension}`)
  - Call queues (`queue:{queueName}`)
  - Transfer operations (`transfer:{transferId}`)
  - Session data (`session:{sessionId}`)

### **Phase 2: AMI Authentication & Registration Flow** 🔐

#### **2.1 Enhanced Login System**

- [x] Modify `electron-softphone/src/components/Login.jsx`
- [x] Switch to AMI/JWT-only login (no SIP.js initialization)
- [ ] Add AMI user registration during login (server-managed)
- [ ] Implement dual authentication (JWT + AMI) [planning]
- [ ] Add extension validation and registration [server-side]
- [ ] Create login state management for AMI [in progress]

#### **2.2 AMI User Management**

- [ ] Create `server/controllers/amiUserController.js`
- [ ] Implement AMI user creation/registration
- [ ] Add extension-to-user mapping
- [ ] Create AMI user status tracking
- [ ] Add AMI user cleanup on logout

#### **2.3 Authentication Middleware Updates**

- [ ] Update `server/middleware/authMiddleware.js`
- [ ] Add AMI authentication verification
- [ ] Implement dual token validation
- [ ] Add AMI session management
- [ ] Create AMI permission checking

### **Phase 3: New SIP-AMI Service Architecture** 🏗️

#### **3.1 Create New SIP-AMI Service**

- [ ] Create `electron-softphone/src/services/sipAmiService.js`
- [ ] Implement AMI-based call origination
- [ ] Add AMI call state management
- [ ] Create AMI event handling
- [ ] Implement AMI-SIP bridge functionality

#### **3.2 AMI Call Lifecycle Management**

- [ ] Implement AMI `Originate` action for calls
- [ ] Add AMI call monitoring and state tracking
- [ ] Create AMI call control (hold, unhold, transfer)
- [ ] Implement AMI call recording
- [ ] Add AMI call statistics collection

#### **3.3 Redis Session Management**

- [ ] Store call sessions in Redis
- [ ] Implement session persistence and recovery
- [ ] Add session timeout handling
- [ ] Create session cleanup mechanisms
- [ ] Implement session sharing across components

### **Phase 4: Call Transfer System Enhancement** 📞

#### **4.1 AMI-Based Transfer Implementation**

- [ ] Replace SIP transfer with AMI transfer
- [ ] Implement AMI `Redirect` action
- [ ] Add AMI transfer monitoring
- [ ] Create transfer state persistence in Redis
- [ ] Implement transfer rollback mechanisms

#### **4.2 Enhanced Transfer Features**

- [ ] Add queue-based transfers via AMI
- [ ] Implement external number transfers
- [ ] Add transfer consultation via AMI
- [ ] Create transfer history tracking
- [ ] Implement transfer analytics

### **Phase 5: Real-Time Event System** ⚡

#### **5.1 Redis Pub/Sub Implementation**

- [ ] Set up Redis pub/sub channels
- [ ] Implement real-time event broadcasting
- [ ] Create event filtering and routing
- [ ] Add event persistence and replay
- [ ] Implement event acknowledgment system

#### **5.2 AMI Event Processing**

- [ ] Process AMI events in real-time
- [ ] Store events in Redis for persistence
- [ ] Broadcast events to connected clients
- [ ] Implement event queuing and delivery
- [ ] Add event error handling and recovery

### **Phase 6: Frontend Integration** 🎨

#### **6.1 Appbar.jsx Updates**

- [x] Replace SIP service with AMI-backed endpoints for originate/hangup
- [x] Update call state management in Appbar to consume AMI/Redis socket events
- [x] Modify transfer dialog to use AMI blind/managed flows
- [x] Add AMI availability indicators driven by `extension:status` socket updates
- [x] Implement Redis/Socket.IO real-time updates for agent availability

#### **6.2 Dashboard Integration**

- [ ] Update dashboard with AMI data
- [ ] Add Redis-based real-time metrics
- [ ] Implement AMI call monitoring
- [ ] Add transfer status tracking
- [ ] Create AMI health monitoring

### **Phase 7: Testing & Validation** 🧪

#### **7.1 Unit Testing**

- [ ] Test Redis service functionality
- [ ] Test AMI service methods
- [ ] Test authentication flow
- [ ] Test call lifecycle management
- [ ] Test transfer operations

#### **7.2 Integration Testing**

- [ ] Test AMI-SIP integration
- [ ] Test Redis data persistence
- [ ] Test real-time event system
- [ ] Test authentication flow
- [ ] Test error handling and recovery

#### **7.3 End-to-End Testing**

- [ ] Test complete call flow
- [ ] Test transfer operations
- [ ] Test real-time updates
- [ ] Test session persistence
- [ ] Test system recovery

### **Phase 8: Performance & Optimization** 🚀

#### **8.1 Redis Optimization**

- [ ] Implement Redis connection pooling
- [ ] Add Redis data compression
- [ ] Optimize Redis key structure
- [ ] Implement Redis caching strategies
- [ ] Add Redis performance monitoring

#### **8.2 AMI Optimization**

- [ ] Optimize AMI event processing
- [ ] Implement AMI connection pooling
- [ ] Add AMI request batching
- [ ] Optimize AMI response handling
- [ ] Implement AMI load balancing

### **Phase 9: Documentation & Deployment** 📚

#### **9.1 Documentation Updates**

- [ ] Update API documentation
- [ ] Create Redis integration guide
- [ ] Document AMI call lifecycle
- [ ] Update deployment instructions
- [ ] Create troubleshooting guide

#### **9.2 Deployment Preparation**

- [ ] Create Redis deployment scripts
- [ ] Update environment configuration
- [ ] Prepare migration scripts
- [ ] Create rollback procedures
- [ ] Test deployment process

## 🏗️ System Architecture

The Mayday CRM system consists of four main components that work together to provide a complete telephony management solution:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAYDAY CRM SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   @client/      │    │@electron-       │    │@datatool_   │ │
│  │   Web Dashboard │    │softphone/       │    │server/      │ │
│  │   (Admin UI)    │    │Desktop App      │    │CRM Data     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                       │                       │     │
│           │                       │                       │     │
│           └───────────────────────┼───────────────────────┘     │
│                                   │                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    @server/                                 │ │
│  │                Backend API Server                           │ │
│  │                                                             │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Express   │  │  Socket.IO  │  │    Asterisk AMI     │ │ │
│  │  │    Server   │  │  WebSocket  │  │      Service        │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   MySQL     │  │   MongoDB   │  │    Redis Cache      │ │ │
│  │  │  Database   │  │  Database   │  │   + Session Store   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                   │                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    ASTERISK PBX                             │ │
│  │              (PJSIP, AMI, ARI, FastAGI)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **Planned Redis Integration Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS INTEGRATION LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Call Sessions │  │  Agent Status   │  │ Transfer State  │ │
│  │   (call:{id})   │  │ (agent:{ext})   │  │(transfer:{id})  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Session Data   │  │  Event Queue    │  │  Cache Layer    │ │
│  │ (session:{id})  │  │ (events:{type}) │  │  (cache:{key})  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Redis Pub/Sub Channels                        │ │
│  │  - agent:status, call:events, transfer:updates            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Overview

#### 1. **@server/ (Backend API Server)**

- **Purpose**: Central backend server providing REST APIs, WebSocket connections, and Asterisk integration
- **Technology**: Node.js with Express.js, Socket.IO, Sequelize ORM
- **Port**: 8004 (configurable via `.env`)
- **Key Services**:
  - AMI Service - Asterisk Manager Interface integration
  - ARI Service - Asterisk REST Interface
  - Call Monitoring Service - Real-time call tracking
  - Socket Service - WebSocket communication
  - FastAGI Service - Custom call flow logic
  - **Redis Service** - Session management and caching 🆕

#### 2. **@client/ (Web Admin Dashboard)**

- **Purpose**: Web-based interface for system administrators to manage Asterisk configuration, agents, and system settings
- **Technology**: React 18 with Material-UI, Redux Toolkit, Socket.IO client
- **Key Features**:
  - Agent Management - Create, edit, delete agents with Dialplan tab 🆕
  - Voice Configuration - Queues, routes, trunks
  - IVR Builder - Visual IVR flow designer
  - ODBC Management - View ODBC connections and functions 🆕
  - System Monitoring - Real-time dashboard
  - Reports & Analytics - Call statistics and performance
  - **Redis Monitoring** - Session and cache management 🆕

#### 3. **@electron-softphone/ (Desktop Softphone)**

- **Purpose**: Desktop application for call center agents to handle calls, manage contacts, and access CRM data
- **Technology**: Electron with React, **SIP-AMI Service** for VoIP, Material-UI 🆕
- **Key Features**:
  - **AMI-Based Softphone** - Full AMI call lifecycle management 🆕
  - Agent Dashboard - Real-time status and metrics
  - **Enhanced Call Management** - AMI-based answer, hold, transfer, record 🆕
  - CRM Integration - Client data and session management
  - WhatsApp Integration - Multi-channel communication
  - **Redis Session Management** - Persistent session state 🆕

#### 4. **@datatool_server/ (CRM Data Management)**

- **Purpose**: Manages client data, sessions, and CRM functionality integrated with the main system
- **Technology**: Express.js with MongoDB, Mongoose ODM
- **Key Features**:
  - Client Management - Client profiles and data
  - Session Tracking - Call and interaction sessions
  - Analytics - Performance metrics and reporting
  - User Management - Role-based access control
  - **Redis Integration** - Enhanced session persistence 🆕

## 🔄 Component Interactions

### **Current Implementation (SIP.js + WebSocket)**

```
User clicks dial → handleMakeCall() → sipCallService.makeCall() → SIP INVITE → Asterisk
```

### **Planned Implementation (AMI + Redis + WebSocket)**

```
User clicks dial → handleMakeCall() → sipAmiService.originateCall() → AMI Originate → Asterisk
                                                                    ↓
                                                              Redis Session Store
                                                                    ↓
                                                              Real-time Events
                                                                    ↓
                                                              UI Updates
```

### Real-Time Communication Architecture

#### **Redis Pub/Sub Events**

```javascript
// Redis channels for real-time communication
- "agent:status"                 // Agent availability changes
- "call:events"                  // Call state changes
- "transfer:updates"             // Transfer operation updates
- "session:changes"              // Session state changes
- "ami:events"                   // AMI event broadcasts
- "queue:activity"               // Queue status updates

// Event structure with Redis persistence
{
  eventType: "call:established",
  callId: "call_12345",
  extension: "1001",
  timestamp: 1640995200000,
  data: { duration: 0, remoteNumber: "+1234567890" },
  redisKey: "call:call_12345"
}
```

#### **AMI Event Integration with Redis**

```javascript
// AMI service processes Asterisk events and stores in Redis
amiService.on("event", async (event) => {
  // Store event in Redis for persistence
  await redisService.storeEvent(event);

  // Broadcast via Redis pub/sub
  await redisService.publishEvent(event);

  // Update call state
  switch (event.Event) {
    case "Newstate":
      await handleChannelStateChange(event);
      break;
    case "Bridge":
      await handleCallBridge(event);
      break;
    case "Hangup":
      await handleCallHangup(event);
      break;
  }
});
```

### Data Flow Patterns

#### **1. Enhanced Agent Authentication Flow**

```
1. Agent logs in via electron-softphone
2. JWT token generated and stored
3. AMI user registration performed
4. Redis session created with agent data
5. WebSocket connection established with token
6. Agent joins extension-specific room
7. Real-time status updates begin via Redis pub/sub
```

#### **2. AMI-Based Call Handling Flow**

```
1. User initiates call via sipAmiService
2. AMI Originate action sent to Asterisk
3. Call session stored in Redis
4. Real-time call events broadcast via Redis pub/sub
5. UI updates in real-time across all components
6. Call state persisted in Redis for recovery
```

#### **3. Enhanced Transfer Management Flow**

```
1. Agent initiates transfer via AMI
2. Transfer state stored in Redis
3. AMI Redirect action sent to Asterisk
4. Transfer progress tracked in Redis
5. Real-time updates broadcast via Redis pub/sub
6. Transfer history persisted for analytics
```

## � ODBC & Dialplan Management 🆕

### **ODBC Functions (func_odbc.conf)**

The system includes ODBC functions for dialplan database queries:

| Function | DSN | Purpose |
|----------|-----|---------|
| `ODBC_AGENT_PAUSED` | asterisk | Check if agent is paused in any queue before routing calls |
| `ODBC_USER_PRESENCE` | asterisk | Get user presence status by extension |

**Usage in Dialplan:**
```
; Check if agent is paused before sending call
exten => _X.,1,Set(PAUSED=${ODBC_AGENT_PAUSED(${EXTEN})})
 same => n,GotoIf($["${PAUSED}" = "1"]?paused:available)
 same => n(paused),Playback(agent-paused)
 same => n,Hangup()
 same => n(available),Dial(PJSIP/${EXTEN},30)
```

### **ODBC UI Components**

- **Connections Tab**: Read-only view of system ODBC connections (`/etc/odbc.ini`)
- **Functions Tab**: View ODBC functions used in dialplan (`/etc/asterisk/func_odbc.conf`)
- **API Endpoint**: `GET /api/users/odbc/functions`

### **Agent Dialplan Tab**

Each agent's edit page includes a Dialplan tab showing:
- Extension-specific dialplan entries from `voice_extensions` table
- Context, priority, and application for each entry
- Real-time view of how calls are routed to the agent

## �🗄️ Database Architecture

### **MySQL (Asterisk Database)**

- **Tables**: `ps_endpoints`, `ps_auths`, `ps_aors`, `ps_contacts`, `queue_members`, `voice_extensions`
- **Purpose**: PJSIP configuration, endpoint management, queue membership, dialplan
- **Access**: Via Sequelize ORM
- **Connection Pool**: max=20, min=2, acquire=60s (optimized for concurrent queries)

### **MongoDB (CRM Database)**

- **Collections**: Users, Posts, Sessions, WhatsApp messages
- **Purpose**: Client data, session tracking, analytics
- **Access**: Via Mongoose ODM

### **Redis (Session Store & Cache)** 🆕

- **Purpose**: Session storage, real-time data caching, event persistence
- **Usage**: Socket.IO adapter, session management, call state persistence
- **Key Structures**:
  - **Call Sessions**: `call:{callId}` - Complete call state and metadata
  - **Agent Status**: `agent:{extension}` - Real-time agent availability
  - **Transfer State**: `transfer:{transferId}` - Transfer operation tracking
  - **Session Data**: `session:{sessionId}` - User session persistence
  - **Event Queue**: `events:{type}` - Event history and replay
  - **Cache Layer**: `cache:{key}` - Frequently accessed data

## 🔐 Authentication & Security

### **Enhanced JWT + AMI Authentication** 🆕

```javascript
// Dual authentication system
{
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ami: {
    username: "agent_1001",
    extension: "1001",
    permissions: ["make_calls", "transfer_calls", "record_calls"],
    sessionId: "ami_session_12345"
  },
  redis: {
    sessionKey: "session:user_1001",
    expiresAt: 1640995200000
  }
}

// Enhanced middleware protection
app.use("/api/users/*", [authMiddleware, amiAuthMiddleware]);
app.use("/api/calls/*", [authMiddleware, amiAuthMiddleware, callPermissionMiddleware]);
```

### **Role-Based Access Control with AMI**

- **Superuser**: Full system access + AMI admin privileges
- **Admin**: System configuration access + AMI user management
- **Agent**: Limited to own extension and calls + AMI call permissions
- **Manager**: Team oversight and reporting + AMI monitoring access

## 🔧 Key Features

### **Current Features**

- **Enhanced Transfer System**: Blind, managed, and queue transfers
- **Call Management**: Real-time monitoring, recording, IVR system
- **Development Features**: MCP Server, Context7 Integration, Hot Reload

### **Planned AMI + Redis Features** 🆕

#### **Full AMI Call Lifecycle Management**

- **AMI-Based Call Origination**: Replace SIP.js with AMI Originate
- **Enhanced Call Control**: Complete AMI-based call management
- **Real-Time Call Monitoring**: Redis-persisted call state tracking
- **Advanced Transfer System**: Queue-based and external transfers
- **Call Recording**: AMI-based recording control and management

#### **Redis Session Management**

- **Session Persistence**: Complete session state recovery
- **Real-Time Event Broadcasting**: Redis pub/sub for instant updates
- **Call State Persistence**: Redis-based call state management
- **Transfer State Tracking**: Persistent transfer operation state
- **Event History**: Redis-stored event replay and analytics

#### **Enhanced Performance & Scalability**

- **Redis Caching**: Frequently accessed data caching
- **Connection Pooling**: Optimized AMI and Redis connections
- **Event Queuing**: Reliable event delivery and processing
- **Session Recovery**: Automatic session restoration on reconnection
- **Load Balancing**: Distributed AMI and Redis handling

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- MySQL 8.0 or higher
- MongoDB 6.0 or higher
- **Redis 6.0 or higher** 🆕
- Git
- SSH key for VM access

### Local Development

```bash
# Clone repository
git clone https://github.com/Dlu6/Mayday-CRM-Scracth.git
cd Mayday-CRM-Scracth

# Create development branch
git checkout -b feature/ami-redis-integration

# Install dependencies
npm install
cd client && npm install && cd ..
cd electron-softphone && npm install && cd ..

# Start Redis server (new requirement)
redis-server

# Start development servers
npm run server_client  # Backend + Dashboard
npm run electron:dev   # Electron softphone
```

### VM Connection

```bash
# SSH to Asterisk VM
ssh -i "MHU_Debian_Mumb.pem" admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com

# Navigate to project
cd /home/admin/Mayday-CRM-Scracth

# Switch to development branch
git checkout feature/ami-redis-integration

# Install and start Redis
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

## 📁 Project Structure

```
Mayday-CRM-Scracth/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── features/       # Redux slices and services
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # API and WebSocket services
├── server/                 # Node.js backend server
│   ├── controllers/        # Business logic controllers
│   │   ├── enhancedTransferController.js  # ✅ Enhanced transfer system
│   │   ├── transferController.js          # Legacy transfer system
│   │   ├── adminStatsController.js        # Admin dashboard stats
│   │   ├── cdrController.js               # Call detail records
│   │   └── amiUserController.js           # 🆕 AMI user management
│   ├── routes/             # API endpoint definitions
│   │   ├── enhancedTransferRoutes.js      # ✅ New transfer API
│   │   ├── transferRoutes.js              # Legacy transfer API
│   │   ├── adminRoutes.js                 # Admin endpoints
│   │   ├── cdrRoutes.js                   # CDR endpoints
│   │   └── amiUserRoutes.js               # 🆕 AMI user API
│   ├── services/           # External service integrations
│   │   ├── amiService.js   # Asterisk Manager Interface
│   │   ├── ariService.js   # Asterisk REST Interface
│   │   ├── callMonitoringService.js       # Real-time call monitoring
│   │   ├── socketService.js               # WebSocket management
│   │   └── redisService.js                # 🆕 Redis integration
│   ├── models/             # Database models and associations
│   └── config/             # Configuration files
├── electron-softphone/     # Desktop softphone application
│   ├── src/
│   │   ├── components/     # Softphone UI components
│   │   ├── services/       # SIP and connection services
│   │   │   ├── sipService.js              # Legacy SIP service
│   │   │   └── sipAmiService.js           # 🆕 New AMI-based service
│   │   └── hooks/          # Custom hooks
├── datatool_server/        # CRM data management system
│   ├── controllers/        # CRM business logic
│   ├── models/             # MongoDB models
│   └── routes/             # CRM API endpoints
├── scripts/                # Development and deployment scripts
├── context7/               # Context7 integration files
├── mcp-server-config.json  # MCP server configuration
├── .cursorrules            # Cursor IDE development rules
├── redis/                  # 🆕 Redis configuration and scripts
│   ├── redis.conf          # Redis server configuration
│   ├── setup.sh            # Redis installation script
│   └── health-check.js     # Redis health monitoring
└── docs/                   # Project documentation
```

## 🌐 API Endpoints

### **Current Enhanced Transfer System**

```javascript
// Core Transfer Operations
POST   /api/enhanced-transfers/blind          # Blind transfer
POST   /api/enhanced-transfers/managed        # Managed transfer
POST   /api/enhanced-transfers/complete       # Complete managed transfer
POST   /api/enhanced-transfers/queue          # Transfer to queue
GET    /api/enhanced-transfers/enhanced-status # Transfer status
DELETE /api/enhanced-transfers/:transferId    # Cancel transfer
```

### **New AMI + Redis Endpoints** 🆕

```javascript
// AMI User Management
POST   /api/ami/users/register               # Register AMI user
POST   /api/ami/users/login                  # AMI user authentication
DELETE /api/ami/users/logout                 # AMI user logout
GET    /api/ami/users/:extension/status      # Get user status
PUT    /api/ami/users/:extension/status      # Update user status

// AMI Call Management
POST   /api/ami/calls/originate              # Originate call via AMI
PUT    /api/ami/calls/:callId/hold           # Hold call via AMI
PUT    /api/ami/calls/:callId/unhold         # Unhold call via AMI
POST   /api/ami/calls/:callId/transfer       # Transfer call via AMI
DELETE /api/ami/calls/:callId                # End call via AMI

// Redis Session Management
GET    /api/redis/sessions/:sessionId         # Get session data
PUT    /api/redis/sessions/:sessionId         # Update session data
DELETE /api/redis/sessions/:sessionId         # Delete session
GET    /api/redis/sessions/:sessionId/events # Get session events
POST   /api/redis/sessions/:sessionId/events # Add session event

// Enhanced Transfer System (Redis-backed)
POST   /api/enhanced-transfers/blind          # Redis-backed blind transfer
POST   /api/enhanced-transfers/managed        # Redis-backed managed transfer
POST   /api/enhanced-transfers/queue          # Redis-backed queue transfer
GET    /api/enhanced-transfers/:id/state      # Get transfer state from Redis
```

### Admin Dashboard

```javascript
// Call Statistics (Redis-enhanced)
GET    /api/admin/call-stats                  # Real-time call statistics
GET    /api/admin/queue-activity             # Queue performance metrics
GET    /api/admin/historical-stats           # Historical call data
GET    /api/admin/redis/health               # 🆕 Redis health status
GET    /api/admin/redis/sessions             # 🆕 Active session count
GET    /api/admin/ami/connections            # 🆕 AMI connection status
```

## 🔌 Asterisk Integration

### **Current AMI Actions**

- **Originate**: Create new calls for consultation
- **Redirect**: Redirect active calls
- **Bridge**: Connect multiple channels
- **QueueAdd**: Add calls to queues
- **QueueRemove**: Remove calls from queues

### **Enhanced AMI Actions with Redis** 🆕

```javascript
// Enhanced AMI actions with Redis persistence
amiService
  .originateCall({
    extension: "1001",
    number: "+1234567890",
    context: "from-internal",
    priority: 1,
    variables: {
      CALLERID: "Agent 1001",
      TRANSFER_ID: "transfer_12345",
    },
  })
  .then(async (response) => {
    // Store call session in Redis
    await redisService.storeCallSession({
      callId: response.callId,
      extension: "1001",
      number: "+1234567890",
      status: "originating",
      timestamp: Date.now(),
    });

    // Broadcast event via Redis pub/sub
    await redisService.publishEvent({
      type: "call:originated",
      data: response,
    });
  });
```

### Real-time Events with Redis Persistence

```javascript
// AMI events processed and stored in Redis
amiService.on("event", async (event) => {
  // Store event in Redis for persistence
  const eventKey = `event:${event.Uniqueid}:${Date.now()}`;
  await redisService.setex(eventKey, 86400, JSON.stringify(event)); // 24h TTL

  // Update call state in Redis
  if (event.Event === "Newstate") {
    await redisService.updateCallState(event.Uniqueid, {
      state: event.ChannelState,
      timestamp: Date.now(),
    });
  }

  // Broadcast via Redis pub/sub
  await redisService.publishEvent({
    type: "ami:event",
    data: event,
  });
});
```

## 🧪 Testing

### **Local Testing with Redis**

```bash
# Start Redis server
redis-server

# Test Redis connectivity
redis-cli ping

# Test enhanced transfer endpoints
curl -X GET "http://localhost:8004/api/enhanced-transfers/health"
curl -X GET "http://localhost:8004/api/enhanced-transfers/capabilities"

# Test new AMI endpoints (will return "Unauthorized" - expected)
curl -X GET "http://localhost:8004/api/ami/users/status"
curl -X GET "http://localhost:8004/api/redis/sessions/health"
```

### **VM Testing with Redis**

```bash
# Test on VM (will return "Unauthorized" - expected)
curl -X GET "http://65.1.149.92:8004/api/enhanced-transfers/health"
curl -X GET "http://65.1.149.92:8004/api/ami/users/status"
curl -X GET "http://65.1.149.92:8004/api/redis/sessions/health"
```

## 🚀 Development Workflow

### **1. Local Development with Redis**

```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push origin feature/ami-redis-integration
```

### **2. VM Deployment with Redis**

```bash
# SSH to VM and pull changes
ssh -i "MHU_Debian_Mumb.pem" admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com
cd /home/admin/Mayday-CRM-Scracth
git pull origin feature/ami-redis-integration || git pull
cd /client && npm run build [if there were changes in the client]
cd ../
npm run deploy
sudo -u mayday pm2 restart mayday

# Ensure Redis is running
sudo systemctl status redis-server
sudo systemctl start redis-server

# Restart server
sudo -u mayday pm2 restart mayday
```

### **3. Testing and Validation**

- Test Redis connectivity and persistence
- Verify AMI integration with Redis
- Check real-time event handling
- Validate session persistence and recovery
- Test WebSocket connections with Redis pub/sub
- Verify dashboard real-time updates

## 🔧 Configuration

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=8004
PUBLIC_IP=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mayday_crm
DB_USER=asterisk_user
DB_PASSWORD=secure_password

# Asterisk Integration
AMI_HOST=localhost
AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
AMI_PASSWORD=admin
ARI_URL=http://localhost:8088
ARI_USERNAME=asterisk_mayday
ARI_PASSWORD=secure_password

# Redis Configuration 🆕
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=mayday_redis_password
REDIS_DB=0
REDIS_MAX_CLIENTS=100
REDIS_TIMEOUT=5000

# JWT Configuration
JWT_SECRET=mayday_secure_jwt_secret
SESSION_SECRET=secure_session_secret
```

### Redis Configuration

```redis
# redis.conf
bind 127.0.0.1
port 6379
requirepass mayday_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**: Use correct export/import syntax
2. **PM2 Issues**: Use `sudo -u mayday pm2` commands
3. **Port Binding**: Check environment variables and server config
4. **AMI Connection**: Verify Asterisk service and credentials
5. **WebSocket Issues**: Check authentication and CORS settings
6. **Database Connection**: Verify MySQL and MongoDB connectivity
7. **Redis Connection**: Check Redis service and authentication 🆕

### Debug Commands

```bash
# Check server status
sudo -u mayday pm2 status mayday

# View server logs
sudo -u mayday pm2 logs mayday --lines 20

# Check port binding
netstat -tlnp | grep 8004

# Check Redis status
redis-cli ping
redis-cli info
redis-cli monitor

# Verify file changes
git status
git log --oneline -5

# Check WebSocket connections
curl -I "http://localhost:8004/socket.io/"

# Test database connections
mysql -u asterisk_user -p mayday_crm
mongo mayday_crm
redis-cli -a mayday_redis_password
```

## 📊 Monitoring & Health Checks

### System Health Monitoring

```javascript
// Enhanced connection health checks
- AMI connection status
- ARI service health
- Database connectivity (pool: max=20, acquire=60s)
- WebSocket connection count
- Memory and CPU usage
- Redis connection status 🆕
- Redis memory usage 🆕
- Redis key count 🆕
- AMI event processing rate 🆕
- Redis pub/sub performance 🆕
- Socket connection caching (5s TTL for agents snapshot) 🆕
```

### Performance Metrics

- Call volume and duration
- Agent availability and performance
- Queue wait times and abandonment rates
- System response times
- WebSocket message throughput
- Database query performance
- **Redis operation latency** 🆕
- **Redis memory efficiency** 🆕
- **AMI event processing speed** 🆕
- **Session persistence reliability** 🆕

## 🔮 Future Enhancements

### Planned Features

- Mobile app for agents
- Advanced analytics dashboard
- AI-powered call routing
- Multi-tenant support
- Advanced reporting tools
- Video calling capabilities
- Advanced IVR features
- **Redis clustering for high availability** 🆕
- **AMI load balancing** 🆕
- **Advanced session analytics** 🆕

### Scalability Improvements

- Microservices architecture
- Load balancing
- Database sharding
- **Redis clustering and replication** 🆕
- **AMI connection pooling** 🆕
- Horizontal scaling
- Container orchestration
- **Redis Sentinel for failover** 🆕

## 📚 Documentation

- **[PROJECT_SETUP.md](PROJECT_SETUP.md)**: Comprehensive setup guide
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: Development workflow and standards
- **[context7/ami-documentation.md](context7/ami-documentation.md)**: AMI integration guide
- **[.cursorrules](.cursorrules)**: Cursor IDE development rules
- **[CLIENT_DASHBOARD_ALIGNMENT.md](CLIENT_DASHBOARD_ALIGNMENT.md)**: Dashboard integration details
- **Redis Integration Guide** 🆕: Redis setup and usage documentation
- **AMI Call Lifecycle Guide** 🆕: Complete AMI implementation guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/ami-redis-integration`)
3. Commit your changes (`git commit -m 'Add AMI and Redis integration'`)
4. Push to the branch (`git push origin feature/ami-redis-integration`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For technical support and questions:

- Check the troubleshooting section
- Review project documentation
- Check server logs and debug endpoints
- Test with VM connection
- Verify component interactions
- Check WebSocket connectivity
- **Verify Redis connectivity and performance** 🆕
- **Check AMI connection and event processing** 🆕

---

**Last Updated**: January 2025  
**Version**: 1.1.0  
**Status**: Enhanced Transfer System ✅ Complete | AMI + Redis Integration 🚧 In Progress  
**Next Phase**: Full AMI Call Lifecycle Management with Redis  
**Architecture**: Multi-Component System with Redis Integration 🆕
