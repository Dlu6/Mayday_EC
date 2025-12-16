# Detailed Call Distribution Report Enhancement

## Overview

This document describes the implementation of a comprehensive call distribution report that includes all CDR (Call Detail Records) database columns with enriched information for administrative decision-making.

## Problem Statement

The user requested a more detailed call distribution report that includes all available columns from the CDR database table. The existing reports were too shallow and didn't provide the comprehensive data needed for informed administrative decisions.

## Solution

### 1. Backend Implementation

#### New Report Function: `getDetailedCallDistributionReport`

**Location:** `server/controllers/reportsController.js`

**Features:**

- Retrieves all 19 CDR database columns
- Enriches data with agent information (name, extension, email)
- Calculates performance metrics and quality indicators
- Provides business intelligence insights
- Generates comprehensive summary statistics

**CDR Columns Included:**

1. `id` - Unique record identifier
2. `start` - Call start timestamp
3. `answer` - Call answer timestamp
4. `end` - Call end timestamp
5. `clid` - Caller ID
6. `src` - Source number/extension
7. `dst` - Destination number/extension
8. `dcontext` - Dial context
9. `channel` - Channel used
10. `dstchannel` - Destination channel
11. `lastapp` - Last application executed
12. `lastdata` - Last application data
13. `duration` - Total call duration (seconds)
14. `billsec` - Billable duration (seconds)
15. `disposition` - Call disposition (ANSWERED, NO ANSWER, etc.)
16. `amaflags` - AMA flags
17. `accountcode` - Account code
18. `uniqueid` - Unique call identifier
19. `userfield` - User-defined field

#### Enhanced Data Fields

**Calculated Metrics:**

- `waitTime` - Time from start to answer (seconds)
- `holdTime` - Duration minus billable seconds
- `callType` - Categorized call type (Inbound Queue, Outbound, Voicemail, etc.)
- `callDirection` - Internal, External, Queue, or Unknown
- `isAnswered` - Boolean flag for answered calls
- `isSuccessful` - Boolean flag for successful calls (answered with talk time)

**Agent Information:**

- `agentId` - Agent database ID
- `agentName` - Full agent name
- `agentExtension` - Agent extension number
- `agentEmail` - Agent email address

**Quality Indicators:**

- `hasHoldTime` - Boolean flag for calls with hold time
- `isLongCall` - Calls longer than 5 minutes
- `isShortCall` - Calls shorter than 30 seconds
- `isAbandoned` - Abandoned calls
- `isBusy` - Busy calls
- `isFailed` - Failed calls

**Business Analysis:**

- `hourOfDay` - Hour when call occurred (0-23)
- `dayOfWeek` - Day of week (0-6)
- `dateOnly` - Date without time
- `isBusinessHours` - Boolean flag for business hours (Mon-Fri, 8AM-5PM)
- `estimatedCost` - Estimated call cost ($0.05/minute)

**Summary Statistics:**

- Total records and calls
- Answered, abandoned, and successful call counts
- Queue calls and business hours calls
- Total and average talk/wait/hold times
- Answer, abandon, and success rates
- Estimated total cost

### 2. Frontend Implementation

#### New Tab: "Call Distribution"

**Location:** `client/src/components/ReportsAdminView.js`

**Features:**

- New tab with Assessment icon
- Comprehensive report description
- Feature overview with bullet points
- Current data overview with sample metrics
- Informational alert about report capabilities

#### Updated Report Mapping

**Locations:**

- `client/src/features/reports/reportsSlice.js`
- `client/src/components/ReportsAdminView.js`

**Changes:**

- Added `call-distribution` to report type mapping
- Updated button text to show "Detailed Call Distribution"
- Added distribution case to useEffect for data fetching

### 3. API Integration

#### New Report Type: `call-distribution`

**Backend Route:** `/api/users/reports/export?reportType=call-distribution`

**Response Format:**

```json
{
  "summary": {
    "totalRecords": 1250,
    "totalCalls": 1250,
    "answeredCalls": 1100,
    "abandonedCalls": 150,
    "successfulCalls": 1050,
    "queueCalls": 800,
    "businessHoursCalls": 900,
    "totalTalkTime": 125000,
    "totalWaitTime": 15000,
    "totalHoldTime": 5000,
    "averageTalkTime": 113,
    "averageWaitTime": 13,
    "answerRate": "88.00",
    "abandonRate": "12.00",
    "successRate": "84.00",
    "estimatedTotalCost": "104.17"
  },
  "records": [
    {
      "id": 12345,
      "startTime": "2024-01-15 09:30:00",
      "answerTime": "2024-01-15 09:30:05",
      "endTime": "2024-01-15 09:32:30",
      "callerId": "John Doe <1234567890>",
      "source": "1234567890",
      "destination": "101",
      "context": "from-external",
      "channel": "SIP/trunk-00000001",
      "destinationChannel": "SIP/101-00000002",
      "lastApplication": "Queue",
      "lastData": "support",
      "uniqueId": "1705312200.1",
      "userField": "queue:support",
      "accountCode": "",
      "totalDuration": 150,
      "billableDuration": 145,
      "waitTime": 5,
      "holdTime": 5,
      "disposition": "ANSWERED",
      "amaFlags": 3,
      "callType": "Inbound Queue",
      "callDirection": "External",
      "isAnswered": true,
      "isSuccessful": true,
      "answerRate": "100%",
      "successRate": "100%",
      "agentId": "agent123",
      "agentName": "Jane Smith",
      "agentExtension": "101",
      "agentEmail": "jane.smith@company.com",
      "hourOfDay": 9,
      "dayOfWeek": 1,
      "dateOnly": "2024-01-15",
      "queueName": "support",
      "isQueueCall": true,
      "hasHoldTime": true,
      "isLongCall": false,
      "isShortCall": false,
      "isAbandoned": false,
      "isBusy": false,
      "isFailed": false,
      "isBusinessHours": true,
      "estimatedCost": 2.42
    }
  ],
  "metadata": {
    "reportGenerated": "2024-01-15T10:00:00.000Z",
    "dateRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-15T23:59:59.999Z"
    },
    "totalColumns": 45,
    "recordCount": 1250
  }
}
```

## Usage Instructions

### Accessing the Report

1. Navigate to the Reports Admin View
2. Select the "Call Distribution" tab
3. Choose your date range using the date pickers
4. Click "Download [Period] Detailed Call Distribution Report"

### Report Formats

- **CSV**: Comprehensive spreadsheet with all columns for analysis
- **JSON**: Structured data for programmatic processing

### Use Cases

**Administrative Decision Making:**

- Analyze call patterns and trends
- Identify peak hours and busy periods
- Monitor agent performance and utilization
- Track queue efficiency and wait times
- Calculate operational costs and ROI

**Quality Assurance:**

- Identify short calls that may indicate issues
- Monitor hold times and customer experience
- Track abandoned calls and reasons
- Analyze call distribution across agents

**Business Intelligence:**

- Compare business hours vs. after-hours performance
- Analyze seasonal trends and patterns
- Monitor SLA compliance and performance metrics
- Generate executive dashboards and reports

## Technical Details

### Database Schema

The report utilizes the complete CDR table schema:

```sql
MariaDB [asterisk]> describe cdr;
+-------------+------------------+------+-----+---------------------+----------------+
| Field       | Type             | Null | Key | Default             | Extra          |
+-------------+------------------+------+-----+---------------------+----------------+
| id          | int(11) unsigned | NO   | PRI | NULL                | auto_increment |
| start       | datetime         | NO   | MUL | current_timestamp() |                |
| answer      | datetime         | YES  |     | NULL                |                |
| end         | datetime         | YES  |     | NULL                |                |
| clid        | varchar(80)      | NO   | MUL |                     |                |
| src         | varchar(80)      | NO   | MUL |                     |                |
| dst         | varchar(80)      | NO   | MUL |                     |                |
| dcontext    | varchar(80)      | NO   | MUL |                     |                |
| channel     | varchar(80)      | NO   |     |                     |                |
| dstchannel  | varchar(80)      | YES  |     | NULL                |                |
| lastapp     | varchar(80)      | NO   |     |                     |                |
| lastdata    | varchar(80)      | NO   |     |                     |                |
| duration    | int(11)          | NO   |     | 0                   |                |
| billsec     | int(11)          | NO   |     | 0                   |                |
| disposition | varchar(45)      | NO   |     |                     |                |
| amaflags    | int(11)          | NO   |     | 0                   |                |
| accountcode | varchar(20)      | NO   |     |                     |                |
| uniqueid    | varchar(32)      | NO   |     |                     |                |
| userfield   | varchar(255)     | YES  |     | NULL                |                |
+-------------+------------------+------+-----+---------------------+----------------+
```

### Performance Considerations

- Large datasets are handled efficiently with proper indexing
- Date range filtering optimizes query performance
- Agent information is cached using Map for fast lookups
- Summary statistics are calculated in a single pass

### Security

- All data access is authenticated and authorized
- Sensitive information is properly sanitized
- Date range validation prevents excessive data retrieval
- SQL injection protection through Sequelize ORM

## Files Modified

### Backend Files

- `server/controllers/reportsController.js` - Added `getDetailedCallDistributionReport` function and case
- Removed unused functions: `getQueueDistributionData`, `getSLAComplianceData`

### Frontend Files

- `client/src/components/ReportsAdminView.js` - Added distribution tab and render function
- `client/src/features/reports/reportsSlice.js` - Added call-distribution mapping

### Documentation

- `DETAILED_CALL_DISTRIBUTION_REPORT.md` - This comprehensive documentation

## Benefits

1. **Complete Data Access**: All 19 CDR columns available for analysis
2. **Enhanced Intelligence**: Calculated metrics and quality indicators
3. **Agent Integration**: Enriched with agent information for better insights
4. **Business Analysis**: Business hours, cost analysis, and performance metrics
5. **Comprehensive Summary**: Statistical overview for quick decision making
6. **Flexible Export**: CSV and JSON formats for different use cases
7. **Professional Presentation**: Clean, organized data structure for reporting

## Call Records: How They Are Saved and Retrieved

This section provides a comprehensive overview of the call record lifecycle, from Asterisk call events to database storage and report generation.

---

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Asterisk PBX  │────▶│  CDR Backends   │────▶│    Database     │
│   (Call Events) │     │  (CSV + ODBC)   │     │   (MariaDB)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend UI   │◀────│   Node.js API   │◀────│  Sequelize ORM  │
│   (React App)   │     │   (Express)     │     │   (CDR Model)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

### 1. Call Record Creation (Asterisk Side)

#### 1.1 CDR Generation

Asterisk automatically generates CDR (Call Detail Records) at the end of each call. The CDR engine captures:

| Event | Description |
|-------|-------------|
| **Call Start** | When the channel is created (`start` timestamp) |
| **Call Answer** | When the call is answered (`answer` timestamp) |
| **Call End** | When the channel is destroyed (`end` timestamp) |

#### 1.2 CDR Backends Configuration

**Location:** `/etc/asterisk/cdr.conf`

```ini
[csv]
usegmtime=no      ; Use local time, not GMT
loguniqueid=yes   ; Log unique call ID
loguserfield=yes  ; Log user-defined field
accountlogs=yes   ; Separate logs per account code
```

**CSV Output:** `/var/log/asterisk/cdr-csv/Master.csv`

The CSV backend writes complete, accurate CDR records including proper timestamps.

#### 1.3 ODBC Database Backend

**Location:** `/etc/asterisk/cdr_adaptive_odbc.conf`

```ini
[maydaycdr]
connection=asterisk
table=cdr
loguniqueid=yes
; No aliases needed - database columns match CDR field names
```

**ODBC Connection:** `/etc/asterisk/res_odbc.conf`

```ini
[asterisk]
enabled => yes
dsn => asterisk-connector
username => mayday_user
password => Pasword@256
pre-connect => yes
```

**System ODBC:** `/etc/odbc.ini`

```ini
[asterisk-connector]
Description = MariaDB connection to asterisk database
Driver = MariaDB
Database = asterisk
Server = localhost
Port = 3306
```

#### 1.4 Important Configuration Note

> **Issue Fixed (Dec 2025):** The original configuration had incorrect column aliases that caused `start`, `answer`, and `end` timestamps to not be written correctly. The aliases were removed since the database columns already match the CDR field names.

---

### 2. Database Storage

#### 2.1 CDR Table Schema

**Database:** `asterisk`
**Table:** `cdr`

```sql
CREATE TABLE cdr (
  id          INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  start       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answer      DATETIME NULL,
  end         DATETIME NULL,
  clid        VARCHAR(80) NOT NULL DEFAULT '',
  src         VARCHAR(80) NOT NULL DEFAULT '',
  dst         VARCHAR(80) NOT NULL DEFAULT '',
  dcontext    VARCHAR(80) NOT NULL DEFAULT '',
  channel     VARCHAR(80) NOT NULL DEFAULT '',
  dstchannel  VARCHAR(80) NULL,
  lastapp     VARCHAR(80) NOT NULL DEFAULT '',
  lastdata    VARCHAR(80) NOT NULL DEFAULT '',
  duration    INT(11) NOT NULL DEFAULT 0,
  billsec     INT(11) NOT NULL DEFAULT 0,
  disposition VARCHAR(45) NOT NULL DEFAULT '',
  amaflags    INT(11) NOT NULL DEFAULT 0,
  accountcode VARCHAR(20) NOT NULL DEFAULT '',
  uniqueid    VARCHAR(32) NOT NULL DEFAULT '',
  userfield   VARCHAR(255) NULL,
  
  INDEX idx_start (start),
  INDEX idx_src (src),
  INDEX idx_dst (dst),
  INDEX idx_dcontext (dcontext),
  INDEX idx_clid (clid),
  INDEX idx_uniqueid (uniqueid)
);
```

#### 2.2 Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Auto-increment primary key |
| `start` | DATETIME | Call initiation timestamp |
| `answer` | DATETIME | Call answer timestamp (NULL if unanswered) |
| `end` | DATETIME | Call termination timestamp |
| `clid` | VARCHAR(80) | Caller ID (format: `"Name" <number>`) |
| `src` | VARCHAR(80) | Source number/extension |
| `dst` | VARCHAR(80) | Destination number/extension |
| `dcontext` | VARCHAR(80) | Dial context (e.g., `from-voip-provider`, `from-internal`) |
| `channel` | VARCHAR(80) | Source channel (e.g., `PJSIP/trunk-00000001`) |
| `dstchannel` | VARCHAR(80) | Destination channel |
| `lastapp` | VARCHAR(80) | Last dialplan application (e.g., `Queue`, `Dial`, `Hangup`) |
| `lastdata` | VARCHAR(80) | Data passed to last application |
| `duration` | INT | Total call duration in seconds |
| `billsec` | INT | Billable seconds (time after answer) |
| `disposition` | VARCHAR(45) | Call result: `ANSWERED`, `NO ANSWER`, `BUSY`, `FAILED` |
| `amaflags` | INT | AMA (Automatic Message Accounting) flags |
| `accountcode` | VARCHAR(20) | Account code for billing |
| `uniqueid` | VARCHAR(32) | Unique call identifier (e.g., `1764588860.438`) |
| `userfield` | VARCHAR(255) | Custom user-defined data |

#### 2.3 Context Values

| Context | Meaning |
|---------|---------|
| `from-voip-provider` | Inbound call from external trunk |
| `from-internal` | Call originated from internal extension |

#### 2.4 Disposition Values

| Disposition | Meaning |
|-------------|---------|
| `ANSWERED` | Call was answered and connected |
| `NO ANSWER` | Call rang but was not answered |
| `BUSY` | Destination was busy |
| `FAILED` | Call failed to connect |
| `NORMAL` | Normal call clearing (custom) |

---

### 3. Application-Level CDR Handling

#### 3.1 Sequelize Model

**Location:** `server/models/cdr.js`

```javascript
import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const CDR = sequelize.define("CDR", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  start: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
  },
  answer: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  end: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // ... other fields
}, {
  tableName: "cdr",
  timestamps: false,
  underscored: true,
});

export default CDR;
```

#### 3.2 Real-Time Call Monitoring

**Location:** `server/services/callMonitoringService.js`

The application also monitors calls in real-time via AMI (Asterisk Manager Interface) and can update CDR records:

**On Call Bridge (Answer):**
```javascript
const handleBridge = async (event) => {
  const uniqueid = event.uniqueid || event.Uniqueid;
  
  await CDR.update({
    answer: new Date(),
    disposition: "ANSWERED",
    dstchannel: event.bridgechannel || event.BridgeChannel || "",
  }, {
    where: { uniqueid: uniqueid },
  });
};
```

**On Call Hangup:**
```javascript
const handleHangup = async (event) => {
  const uniqueid = event.uniqueid || event.Uniqueid;
  const endTime = new Date();
  
  const cdrRecord = await CDR.findOne({ where: { uniqueid } });
  
  if (cdrRecord) {
    const startTime = new Date(cdrRecord.start);
    const durationSeconds = Math.ceil((endTime - startTime) / 1000);
    
    await CDR.update({
      end: endTime,
      disposition: disposition,
      duration: durationSeconds,
      billsec: cdrRecord.answer 
        ? Math.ceil((endTime - new Date(cdrRecord.answer)) / 1000) 
        : 0,
    }, {
      where: { uniqueid: uniqueid },
    });
  }
};
```

---

### 4. Data Retrieval for Reports

#### 4.1 Report Controller

**Location:** `server/controllers/reportsController.js`

**Function:** `getDetailedCallDistributionReport`

```javascript
async function getDetailedCallDistributionReport(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Fetch all CDR records in date range
  const cdrRecords = await CDR.findAll({
    where: {
      start: { [Op.between]: [start, end] },
    },
    attributes: [
      "id", "start", "answer", "end", "clid", "src", "dst",
      "dcontext", "channel", "dstchannel", "lastapp", "lastdata",
      "duration", "billsec", "disposition", "amaflags",
      "accountcode", "uniqueid", "userfield",
    ],
    order: [["start", "DESC"]],
    raw: true,
  });

  // Enrich with agent information
  const agents = await UserModel.findAll({
    attributes: ["id", "fullName", "extension", "email"],
    raw: true,
  });

  const agentMap = new Map();
  agents.forEach((agent) => agentMap.set(agent.extension, agent));

  // Process and enrich each record
  const enrichedRecords = cdrRecords.map((record) => {
    // Calculate wait time, hold time, call direction, etc.
    // Add agent information
    // Return enriched record
  });

  return {
    summary: { /* aggregated statistics */ },
    records: enrichedRecords,
    metadata: { /* report metadata */ },
  };
}
```

#### 4.2 API Endpoint

**Route:** `GET /api/reports/export`

**Parameters:**
- `reportType`: `call-distribution`
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `format`: `csv` or `json`

**Example:**
```
GET /api/reports/export?reportType=call-distribution&startDate=2025-12-01&endDate=2025-12-01&format=csv
```

#### 4.3 CDR Record Formatting

**Location:** `server/controllers/cdrController.js`

**Function:** `formatCdrRecord`

```javascript
export const formatCdrRecord = (record, extension) => {
  // Calculate duration in minutes:seconds format
  let durationFormatted = null;
  if (record.billsec > 0) {
    const minutes = Math.floor(record.billsec / 60);
    const seconds = record.billsec % 60;
    durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // Determine call direction based on dcontext
  const isFromExternalContext = record.dcontext === 'from-voip-provider';
  const isOutbound = record.src === extension && !isFromExternalContext;
  const type = isOutbound ? "outbound" : "inbound";

  // Determine call status
  let status = "completed";
  if (record.disposition === "NO ANSWER") status = "missed";
  else if (record.disposition === "FAILED" || record.disposition === "BUSY") status = "failed";

  return {
    id: record.id || record.uniqueid,
    phoneNumber: phoneNumber || 'Unknown',
    type,
    status,
    duration: durationFormatted,
    timestamp: record.start || record.calldate || new Date(),
    billsec: record.billsec,
  };
};
```

---

### 5. Data Flow Summary

```
1. CALL INITIATED
   └── Asterisk creates channel
   └── CDR engine records `start` timestamp

2. CALL ANSWERED (if applicable)
   └── Asterisk records `answer` timestamp
   └── AMI emits Bridge event
   └── callMonitoringService updates CDR with answer time

3. CALL ENDED
   └── Asterisk records `end` timestamp
   └── CDR engine calculates `duration` and `billsec`
   └── AMI emits Hangup event
   └── callMonitoringService finalizes CDR record

4. CDR WRITTEN TO BACKENDS
   └── CSV: /var/log/asterisk/cdr-csv/Master.csv
   └── ODBC: asterisk.cdr table via cdr_adaptive_odbc

5. REPORT REQUESTED
   └── Frontend calls /api/reports/export
   └── reportsController queries CDR table
   └── Data enriched with agent info
   └── CSV/JSON returned to client
```

---

### 6. Troubleshooting

#### 6.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `start` = `answer` = `end` | Incorrect ODBC aliases | Remove aliases from `cdr_adaptive_odbc.conf` |
| Missing CDR records | ODBC connection failure | Check `res_odbc.conf` and `/etc/odbc.ini` |
| Wrong timestamps | Timezone mismatch | Ensure `usegmtime=no` in `cdr.conf` |
| Duplicate records | Multiple CDR backends | Check for duplicate context definitions |

#### 6.2 Verification Commands

**Check CDR module status:**
```bash
sudo asterisk -rx 'cdr show status'
```

**Check ODBC connection:**
```bash
sudo asterisk -rx 'odbc show'
```

**View recent CDR records:**
```sql
SELECT id, start, answer, `end`, duration, billsec, disposition 
FROM cdr ORDER BY id DESC LIMIT 10;
```

**Compare with CSV (source of truth):**
```bash
tail -10 /var/log/asterisk/cdr-csv/Master.csv
```

---

## Future Enhancements

Potential improvements for future versions:

- Real-time streaming reports
- Advanced filtering and search capabilities
- Custom column selection
- Automated report scheduling
- Integration with external BI tools
- Machine learning insights and predictions
- Historical data backfill from CSV files
