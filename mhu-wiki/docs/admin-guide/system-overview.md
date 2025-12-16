---
sidebar_position: 1
---

# System Overview for Administrators

This guide provides administrators with a comprehensive overview of the MHU Helpline system architecture, components, and administrative functions.

## System Architecture

The MHU Helpline system consists of several integrated components:

### Core Components

- **Asterisk PBX (20.11.1)**: The telephony engine that handles all call processing
- **Chan PJSIP**: SIP channel driver for Asterisk that manages SIP connections
- **Web Application Server**: Hosts the agent interface, admin portal, and API endpoints
- **Database Servers**:
  - **SQL Database**: Stores real-time call data using Sequelize ORM
  - **MongoDB**: Stores client session data and system configuration
- **Media Server**: Handles call recording storage and processing

### Integration Points

- **Telecom Trunks**: Connections to telecom providers for inbound/outbound calling
- **API Interfaces**: Integration points for external systems
- **WebRTC Gateway**: Enables browser-based and application softphones

## Administrative Functions

As an administrator, you have access to these key management areas:

### User Management

- Create and manage agent accounts
- Define roles and permissions
- Configure agent skills and queue assignments
- Monitor agent performance and activity

### Call Flow Configuration

- Design IVR (Interactive Voice Response) flows
- Configure call queues and routing rules
- Set up call recording policies
- Manage business hours and holiday routing

### System Configuration

- Configure trunk connections
- Manage system-wide settings
- Set up backup and recovery processes
- Monitor system health and performance

### Reporting and Analytics

- Generate system usage reports
- Monitor call quality metrics
- Track agent performance statistics
- Analyze client interaction data

## Administrative Interface

The administrative interface is accessible through the web portal with administrator credentials. The main sections include:

### Dashboard

The administrator dashboard provides an overview of:

- Current system status
- Active calls and agents
- Queue statistics
- Recent system alerts

### Agent Management

This section allows you to:

- Create new agent accounts
- Edit existing agent profiles
- Assign roles and permissions
- Configure agent skills and queue assignments

### Queue Management

In this section, you can:

- Create and configure call queues
- Set queue parameters (max wait time, overflow rules, etc.)
- Assign agents to queues
- Configure queue announcements and music

### IVR Builder

The visual IVR builder allows you to:

- Create call flow diagrams
- Configure menu options and announcements
- Set up conditional routing
- Test and deploy IVR flows

### Trunk Configuration

This section enables you to:

- Configure SIP trunk connections
- Set up outbound routes
- Manage DID numbers
- Configure failover rules

### System Settings

The system settings area includes:

- General system configuration
- Security settings
- Backup and maintenance options
- Integration settings

## Next Steps

Now that you understand the system overview, explore these topics to learn about specific administrative tasks:

- [User and Role Management](./user-management.md)
- [Queue Configuration](./queue-configuration.md)
- [IVR Design Guide](./ivr-design.md)
- [Trunk Setup](./trunk-setup.md)
- [System Monitoring](./system-monitoring.md)
