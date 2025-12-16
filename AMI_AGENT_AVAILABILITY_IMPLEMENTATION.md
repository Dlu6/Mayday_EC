# AMI Agent Availability Implementation

## Overview

This document describes the new single-source-of-truth implementation for agent availability tracking in the Mayday CRM system. The implementation addresses the inconsistency issues between Asterisk CLI status and dashboard display by using the `ps_contacts` table as the authoritative source for real-time agent status.

## Problem Statement

### Previous Issues

- **Inconsistent Data Sources**: Agent status was pulled from multiple places (AMI events, database, local state) without proper synchronization
- **Inefficient Polling**: Periodic status checks instead of real-time AMI events
- **Database vs AMI Mismatch**: `ps_contacts` table showed real-time registration, but AMI service wasn't properly syncing with it
- **Event Handling Gaps**: Missing proper AMI event handlers for PJSIP contact status changes

### Specific Example

- **Asterisk CLI showed**: 1010 (Eria Motto) as `Not in use` with Contact `Avail`
- **Dashboard showed**: Eria Motto as "Offline" ❌
- **Expected**: Both should show "Available" ✅

## Solution Architecture

### 1. Single Source of Truth

```
Asterisk PJSIP → ps_contacts table → AMI Service → Dashboard
     ↓                    ↓              ↓           ↓
Real-time status → Database persistence → Cached API → UI Display
```

### 2. Data Flow

1. **Asterisk PJSIP** generates real-time contact status events
2. **AMI Service** receives events and updates `ps_contacts` table immediately
3. **Database** becomes the authoritative source for agent status
4. **API Endpoints** query database instead of making live AMI calls
5. **Dashboard** displays consistent, real-time agent availability

## Implementation Details

### Core Components

#### 1. Enhanced AMI Service (`server/services/amiService.js`)

- **Real-time Event Handling**: Processes PJSIP contact status changes
- **Database Synchronization**: Updates `ps_contacts` table immediately
- **Caching Layer**: 5-second cache validity for performance
- **Event Broadcasting**: Emits real-time events for UI updates

#### 2. Database Schema (`server/migrations/YYYYMMDDHHMMSS-create-ps-contacts-table.js`)

- **ps_contacts table**: Stores real-time contact registration status
- **Indexes**: Optimized for fast queries on endpoint, status, and timestamps
- **Foreign Keys**: Links to users table for CRM integration

#### 3. Updated Call Monitoring Service (`server/services/callMonitoringService.js`)

- **AMI Integration**: Uses new AMI service for agent status
- **Consistent Data**: Single source of truth for agent availability
- **Real-time Updates**: WebSocket events for live status changes

#### 4. Enhanced Transfer Controller (`server/controllers/transferController.js`)

- **Real-time Verification**: Checks agent availability before transfer
- **Status Consistency**: Uses same data source as dashboard
- **Transfer Validation**: Prevents transfers to unavailable agents

### Key Functions

#### `getAllExtensionStatuses()`

```javascript
// Returns cached extension statuses from database
const statuses = await amiService.getAllExtensionStatuses();
// Result: { "1010": { isRegistered: true, status: "Available", ... } }
```

#### `getExtensionStatus(extension)`

```javascript
// Returns individual extension status from database
const status = await amiService.getExtensionStatus("1010");
// Result: { isRegistered: true, status: "Available", lastSeen: "2024-01-01T..." }
```

#### `updateContactStatus(aor, status, contactUri, timestamp)`

```javascript
// Updates ps_contacts table immediately when AMI events occur
await updateContactStatus(
  "1010",
  "Reachable",
  "sip:1010@192.168.1.100",
  Date.now()
);
```

## Database Schema

### ps_contacts Table

```sql
CREATE TABLE ps_contacts (
  id VARCHAR(40) PRIMARY KEY,
  uri VARCHAR(511) NOT NULL,
  endpoint VARCHAR(40) REFERENCES ps_endpoints(id),
  status VARCHAR(40) COMMENT 'Current contact status',
  expiration_time INT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_ps_contacts_endpoint (endpoint),
  INDEX idx_ps_contacts_status (status),
  INDEX idx_ps_contacts_expiration (expiration_time),
  INDEX idx_ps_contacts_updated_at (updated_at)
);
```

## Event Handling

### AMI Events Processed

1. **ContactStatus**: Real-time contact registration status
2. **EndpointList**: Device state changes
3. **PeerStatus**: Legacy SIP peer status (compatibility)

### WebSocket Events (push-only model)

- On connect → `agents:snapshot` with full availability from ps_contacts.
- On AMI delta → `agent:status` per extension (minimal payload).
- Compatibility events still emitted as needed: `extension:contactStatus`, `extension:endpointStatus`, `extension:availability_changed`, `extension:statuses_refreshed`.

Example payloads

```json
{ "agents": [{ "extension": "1010", "status": "Registered", "online": true }], "ts": 1725112400 }
{ "extension": "1010", "status": "Offline", "online": false, "ts": 1725112600 }
```

## Performance Optimizations

### 1. Caching Strategy

- **Cache Validity**: 5 seconds (configurable)
- **Cache Invalidation**: Automatic on AMI events
- **Memory Management**: LRU-style cache with size limits

### 2. Database Optimization

- **Indexed Queries**: Fast lookups on endpoint and status
- **Batch Updates**: Efficient bulk status updates
- **Connection Pooling**: Reuse database connections

### 3. Event Batching

- **Debounced Updates**: Prevents excessive database writes
- **Bulk Operations**: Group multiple status changes
- **Async Processing**: Non-blocking event handling

## Testing

### Test Script

Run the comprehensive test script:

```bash
node test-ami-agent-availability.js
```

### Test Coverage

1. **AMI Connection**: Verify AMI connectivity
2. **Extension Initialization**: Test status initialization
3. **Real-time Updates**: Verify event handling
4. **Database Sync**: Check data persistence
5. **Performance**: Measure query response times
6. **Transfer Verification**: Test agent availability for transfers

## Monitoring and Debugging

### Logging

- **AMI Events**: Blue-colored logs for all AMI interactions
- **Database Updates**: Green logs for successful operations
- **Error Handling**: Red logs for failures with stack traces

### Debug Endpoints

- **GET /api/ami/status**: Current AMI service status
- **GET /api/ami/extensions**: All extension statuses
- **POST /api/ami/refresh**: Force status refresh

### Health Checks

- **AMI Connection**: Verify AMI client status
- **Database Sync**: Check last update timestamps
- **Cache Health**: Monitor cache hit rates

## Migration Guide

### 1. Database Migration

```bash
# Run the migration to create ps_contacts table
npx sequelize-cli db:migrate
```

### 2. Service Updates

- Update call monitoring service to use new AMI service
- Update transfer controller for consistent agent verification
- Test all transfer scenarios

### 3. Frontend Updates

- Verify dashboard displays consistent agent status
- Test real-time updates via WebSocket
- Validate transfer dialog agent list

## Benefits

### 1. Consistency

- **Single Source of Truth**: All components use same data
- **Real-time Updates**: Immediate status changes
- **Eliminated Discrepancies**: No more offline/available mismatches

### 2. Performance

- **Reduced AMI Calls**: Cached database queries
- **Faster Response Times**: Sub-100ms status lookups
- **Efficient Caching**: 5-second cache validity

### 3. Reliability

- **Database Persistence**: Status survives service restarts
- **Event-driven Updates**: Real-time synchronization
- **Error Recovery**: Graceful handling of failures

### 4. Scalability

- **Horizontal Scaling**: Database can handle multiple instances
- **Load Distribution**: Caching reduces AMI load
- **Event Broadcasting**: Efficient real-time updates

## Future Enhancements

### 1. Advanced Caching

- **Redis Integration**: Distributed caching for multiple instances
- **Cache Warming**: Pre-populate cache on startup
- **Adaptive TTL**: Dynamic cache validity based on activity

### 2. Enhanced Monitoring

- **Metrics Collection**: Track performance and usage
- **Alerting**: Notify on service failures
- **Dashboard**: Real-time system health monitoring

### 3. Advanced Features

- **Presence Management**: Away, busy, do-not-disturb statuses
- **Queue Integration**: Real-time queue member status
- **Call Routing**: Intelligent call distribution based on availability

## Troubleshooting

### Common Issues

#### 1. Agent Shows Offline When Available

- Check AMI connection status
- Verify ps_contacts table has recent data
- Check for database connection issues

#### 2. Status Not Updating in Real-time

- Verify WebSocket connections
- Check AMI event processing
- Monitor database update timestamps

#### 3. Performance Issues

- Check cache hit rates
- Monitor database query performance
- Verify index usage

### Debug Commands

```bash
# Check AMI service status
curl http://localhost:3000/api/ami/status

# Force status refresh
curl -X POST http://localhost:3000/api/ami/refresh

# View extension statuses
curl http://localhost:3000/api/ami/extensions
```

## Conclusion

The new AMI agent availability implementation provides a robust, scalable solution for real-time agent status tracking. By establishing a single source of truth in the `ps_contacts` table and implementing efficient event-driven updates, the system now delivers consistent, real-time agent availability information across all components.

This implementation follows Asterisk best practices, provides excellent performance, and eliminates the inconsistencies that were affecting the user experience. The system is now ready for production use and can handle the demands of a busy call center environment.
