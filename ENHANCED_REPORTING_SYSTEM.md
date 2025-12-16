# Enhanced Reporting System

## Overview

The enhanced reporting system provides comprehensive, professional reports that integrate data from both the CDR (Call Detail Records) system and the DataTool server. This system delivers detailed analytics and insights for call center operations and counseling services.

## Key Features

### 🔍 **Comprehensive Data Integration**

- **CDR Data**: Call center metrics, agent performance, system health
- **DataTool Data**: Counseling cases, sessions, counselor performance
- **Unified Analytics**: Combined insights from both systems

### 📊 **Professional Report Types**

#### 1. **Comprehensive Call Detail Report**

- **Source**: CDR Database
- **Content**:
  - Complete call information with agent details
  - Call metrics (wait time, talk time, hold time)
  - Call classification (internal/external, inbound/outbound)
  - Quality metrics and success rates
  - Channel and context information

#### 2. **Comprehensive Agent Performance Report**

- **Source**: CDR Database + User Database
- **Content**:
  - Agent information and contact details
  - Performance metrics (total calls, answered calls, missed calls)
  - Time analysis (average talk time, wait time)
  - Hourly distribution patterns
  - Call disposition breakdown
  - Efficiency metrics and utilization rates

#### 3. **Comprehensive System Health Report**

- **Source**: CDR Database
- **Content**:
  - System-wide call volume metrics
  - Queue performance analysis
  - Hourly call distribution
  - Trunk utilization statistics
  - System health indicators
  - Peak hours and busiest queues

#### 4. **Comprehensive DataTool Analytics Report**

- **Source**: DataTool Server + CDR Database
- **Content**:
  - Counseling case analytics
  - Session distribution and patterns
  - Counselor performance metrics
  - Case classification (difficulty, region, sex, source, age)
  - Temporal analysis (peak hours, daily patterns)
  - Integrated insights combining call center and counseling data
  - AI-generated recommendations

## Technical Implementation

### Backend Architecture

#### Enhanced Controllers

- **`reportsController.js`**: Enhanced with comprehensive report functions
- **`enhancedDataToolController.js`**: New controller for integrated analytics

#### Key Functions

```javascript
// Comprehensive report functions
getComprehensiveCallDetailReport(startDate, endDate);
getComprehensiveAgentPerformanceReport(startDate, endDate);
getComprehensiveSystemHealthReport(startDate, endDate);
getComprehensiveDataToolMetrics(startDate, endDate);
```

#### API Endpoints

```
GET /api/users/reports/export?reportType=call-detail
GET /api/users/reports/export?reportType=agent-performance
GET /api/users/reports/export?reportType=system-health
GET /api/enhanced-datatool/download?format=csv
```

### Frontend Integration

#### Enhanced UI Components

- **`ReportsAdminView.js`**: Updated with comprehensive report options
- **`reportsSlice.js`**: Enhanced Redux state management

#### Report Type Mapping

```javascript
const reportTypeMapping = {
  volume: "call-detail",
  performance: "agent-performance",
  queues: "system-health",
  datatool: "comprehensive-datatool",
};
```

## Report Features

### 📈 **Advanced Analytics**

- **Trend Analysis**: Historical data comparison
- **Performance Metrics**: KPIs and benchmarks
- **Quality Indicators**: SLA compliance, answer rates
- **Resource Utilization**: Staff efficiency and capacity planning

### 🎯 **Professional Formatting**

- **CSV Export**: Structured data for Excel/Google Sheets
- **JSON Export**: API-friendly format for integrations
- **Professional Headers**: Clear column names and descriptions
- **Data Validation**: Error handling and data integrity checks

### 🔄 **Real-time Integration**

- **Live Data**: Current system state and metrics
- **Historical Analysis**: Trend identification and forecasting
- **Cross-system Correlation**: Relationships between call center and counseling data

## Usage Examples

### Downloading Reports

#### Call Detail Report

```javascript
// Frontend
dispatch(
  downloadReport({
    startDate: "2024-01-01T00:00:00Z",
    endDate: "2024-01-31T23:59:59Z",
    type: "volume", // Maps to "call-detail"
  })
);
```

#### Agent Performance Report

```javascript
// Frontend
dispatch(
  downloadReport({
    startDate: "2024-01-01T00:00:00Z",
    endDate: "2024-01-31T23:59:59Z",
    type: "performance", // Maps to "agent-performance"
  })
);
```

#### DataTool Analytics Report

```javascript
// Frontend
dispatch(
  downloadReport({
    startDate: "2024-01-01T00:00:00Z",
    endDate: "2024-01-31T23:59:59Z",
    type: "datatool", // Maps to "comprehensive-datatool"
  })
);
```

### API Usage

#### Direct API Calls

```bash
# Call Detail Report
curl -X GET "http://localhost:8004/api/users/reports/export?startDate=2024-01-01&endDate=2024-01-31&reportType=call-detail" \
  -H "Authorization: Bearer YOUR_TOKEN"

# DataTool Analytics Report
curl -X GET "http://localhost:8004/api/enhanced-datatool/download?startDate=2024-01-01&endDate=2024-01-31&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Data Structure

### Call Detail Report Structure

```javascript
{
  callId: "unique-call-identifier",
  startTime: "2024-01-15T10:30:00Z",
  answerTime: "2024-01-15T10:30:15Z",
  endTime: "2024-01-15T10:35:00Z",
  duration: 300,
  billableSeconds: 285,
  disposition: "ANSWERED",
  sourceChannel: "PJSIP/1001",
  destinationChannel: "PJSIP/1002",
  sourceNumber: "1001",
  destinationNumber: "1002",
  agentName: "John Doe",
  agentExtension: "1001",
  agentEmail: "john.doe@company.com",
  waitTime: 15,
  talkTime: 285,
  holdTime: 0,
  callType: "Internal",
  direction: "Inbound",
  answerRate: "Answered",
  successRate: "Successful",
  context: "from-internal",
  lastApplication: "Dial",
  lastData: "PJSIP/1002,30"
}
```

### Agent Performance Report Structure

```javascript
{
  agentId: 123,
  agentName: "John Doe",
  extension: "1001",
  email: "john.doe@company.com",
  role: "agent",
  totalCalls: 150,
  answeredCalls: 135,
  missedCalls: 15,
  totalTalkTime: 40500,
  totalWaitTime: 2250,
  avgTalkTime: 300,
  avgWaitTime: 15,
  answerRate: "90%",
  firstCallResolution: "N/A",
  customerSatisfaction: "N/A",
  hourlyDistribution: { "9": 15, "10": 20, "11": 18 },
  dispositionBreakdown: { "ANSWERED": 135, "NO ANSWER": 15 },
  peakHour: "10",
  callsPerHour: 6.25,
  utilizationRate: "90%"
}
```

### System Health Report Structure

```javascript
{
  reportPeriod: {
    startDate: "2024-01-01T00:00:00Z",
    endDate: "2024-01-31T23:59:59Z",
    duration: "31 days"
  },
  totalCalls: 5000,
  answeredCalls: 4500,
  abandonedCalls: 500,
  answerRate: 90,
  abandonRate: 10,
  queuePerformance: [
    {
      queueName: "support",
      totalCalls: 2000,
      answeredCalls: 1800,
      answerRate: 90,
      avgTalkTime: 300,
      avgWaitTime: 20,
      totalTalkTime: 540000
    }
  ],
  hourlyDistribution: [
    { hour: 9, callCount: 200, answeredCalls: 180, answerRate: 90 }
  ],
  trunkUtilization: [
    {
      trunk: "PJSIP/trunk1",
      callCount: 1000,
      totalDuration: 300000,
      avgDuration: 300
    }
  ],
  systemHealth: {
    overallAnswerRate: 90,
    peakHour: 10,
    busiestQueue: "support",
    mostUsedTrunk: "PJSIP/trunk1"
  }
}
```

## Benefits

### 🎯 **For Management**

- **Comprehensive Insights**: Complete view of system performance
- **Data-Driven Decisions**: Evidence-based operational improvements
- **Performance Tracking**: Monitor KPIs and trends over time
- **Resource Optimization**: Identify staffing and capacity needs

### 👥 **For Agents**

- **Performance Visibility**: Clear metrics and improvement areas
- **Workload Analysis**: Understanding of call patterns and demands
- **Quality Metrics**: Track success rates and customer satisfaction

### 🔧 **For IT/Operations**

- **System Health Monitoring**: Proactive issue identification
- **Capacity Planning**: Infrastructure and resource planning
- **Troubleshooting**: Detailed call logs and system metrics

## Future Enhancements

### 🔮 **Planned Features**

- **Real-time Dashboards**: Live reporting and monitoring
- **Automated Alerts**: Threshold-based notifications
- **Predictive Analytics**: Forecasting and trend prediction
- **Custom Report Builder**: User-defined report templates
- **API Integrations**: Third-party system connections

### 📊 **Advanced Analytics**

- **Machine Learning**: Pattern recognition and anomaly detection
- **Sentiment Analysis**: Customer satisfaction insights
- **Workload Optimization**: AI-powered scheduling recommendations
- **Performance Benchmarking**: Industry comparison metrics

## Configuration

### Environment Variables

```bash
# DataTool Server Configuration
DATATOOL_BASE_URL=http://localhost:8005

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=asterisk_user
DB_PASSWORD=your_password
DB_NAME=asterisk
```

### Report Scheduling

```javascript
// Example: Scheduled report generation
const scheduleReport = (reportType, schedule) => {
  // Implementation for automated report generation
  // Can be integrated with cron jobs or task schedulers
};
```

## Troubleshooting

### Common Issues

#### 1. **No Data Available**

- **Cause**: Date range has no records
- **Solution**: Verify date range and data availability
- **Check**: Database connectivity and data integrity

#### 2. **Slow Report Generation**

- **Cause**: Large date ranges or complex queries
- **Solution**: Optimize date ranges or implement pagination
- **Check**: Database indexes and query performance

#### 3. **Missing Agent Information**

- **Cause**: Agent not found in user database
- **Solution**: Verify agent extension mapping
- **Check**: User database synchronization

### Performance Optimization

#### Database Indexing

```sql
-- Recommended indexes for better performance
CREATE INDEX idx_cdr_start ON cdr(start);
CREATE INDEX idx_cdr_src ON cdr(src);
CREATE INDEX idx_cdr_dst ON cdr(dst);
CREATE INDEX idx_cdr_billsec ON cdr(billsec);
```

#### Query Optimization

- Use appropriate date ranges
- Implement pagination for large datasets
- Cache frequently accessed data
- Optimize database queries

## Support

For technical support or feature requests:

- **Documentation**: Check this file and inline code comments
- **Logs**: Review server logs for error details
- **API Testing**: Use Swagger UI at `/api-docs`
- **Database**: Verify data integrity and connectivity

---

_This enhanced reporting system provides comprehensive insights into both call center operations and counseling services, enabling data-driven decision making and operational excellence._
