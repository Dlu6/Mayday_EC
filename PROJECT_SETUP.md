# Mayday CRM Project Setup Guide

## Project Overview

Mayday CRM is a comprehensive customer relationship management system with Asterisk PBX integration, featuring:

- React frontend with SIP.js softphone
- Node.js backend with AMI/ARI integration
- Asterisk PBX system for call management
- Advanced call transfer functionality (managed and blind)
- Real-time call monitoring and management
- MySQL database with Sequelize ORM

## Current Development Status ✅

### Completed Features

- **Enhanced Transfer System**: Fully implemented and deployed
- **MCP Server Integration**: Configured for remote VM development
- **Development Environment**: Automated setup and deployment scripts
- **Import Issues**: All module import problems resolved
- **VM Deployment**: Successfully running on feature branch

### Development Branch

- **Current Branch**: `feature/enhanced-transfer-system`
- **Status**: Active development with working server deployment
- **Last Commit**: Import fixes for CDR, amiService, and authMiddleware

## Prerequisites

### Local Development

- Node.js 18.x
- npm or yarn
- Git
- SSH key for VM access

### VM Requirements

- Debian/Ubuntu server with Asterisk
- Node.js 18.x
- PM2 for process management
- MySQL/MariaDB

## Project Structure

```
Mayday-CRM-Scracth/
├── client/                 # React frontend
├── server/                 # Node.js backend
│   ├── controllers/        # Business logic
│   │   ├── enhancedTransferController.js  # ✅ Enhanced transfer system
│   │   └── transferController.js          # Legacy transfer system
│   ├── routes/             # API endpoints
│   │   ├── enhancedTransferRoutes.js      # ✅ New transfer API
│   │   └── transferRoutes.js              # Legacy transfer API
│   ├── services/           # External service integrations
│   │   ├── amiService.js   # Asterisk Manager Interface
│   │   └── ariService.js   # Asterisk REST Interface
│   └── models/             # Database models
├── electron-softphone/     # Electron-based softphone
└── config/                 # Configuration files
```

## Environment Setup

### 1. Local Development Environment

```bash
# Clone repository
git clone https://github.com/Dlu6/Mayday-CRM-Scracth.git
cd Mayday-CRM-Scracth

# Create feature branch
git checkout -b feature/enhanced-transfer-system

# Install dependencies
npm install
cd client && npm install && cd ..

# Run development servers
pwd ~ /Users/Mydhe Files/Mayday-CRM-Scracth
npm run server_client  # Backend + Dashboard

pwd ~ /Users/Mydhe Files/Mayday-CRM-Scracth/electron-softphone
npm run electron:dev   # Electron softphone
```

### 2. VM Deployment (Production)

To deploy updates to the production VM server:

```bash
# SSH into the VM
ssh -i /path/to/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com

# Navigate to project and pull latest changes
cd /home/admin/Mayday-CRM-Scracth
git pull

# Build the client dashboard
cd client
npm run build

# Return to root and deploy
cd ..
npm run deploy

# Restart PM2 (runs under 'mayday' user)
sudo -u mayday pm2 restart mayday

# Verify status
sudo -u mayday pm2 status
```

**Expected output after successful deployment:**
```
┌────┬───────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id │ name      │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │
├────┼───────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 0  │ mayday    │ default     │ 1.0.0   │ fork    │ XXXXXX   │ Xs     │ XX   │ online    │
└────┴───────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```

**Quick one-liner for deployment:**
```bash
ssh -i MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "cd /home/admin/Mayday-CRM-Scracth && git pull && cd client && npm run build && cd .. && npm run deploy && sudo -u mayday pm2 restart mayday && sudo -u mayday pm2 status"
```

### 3. MCP Server Configuration

The project includes `mcp-server-config.json` for seamless development with **dual database tracking**:

```json
{
  "mcpServers": {
    "mayday-asterisk-vm": {
      "command": "ssh",
      "args": [
        "-i",
        "MHU_Debian_Mumb.pem",
        "admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com"
      ],
      "cwd": "/home/admin/mayday-crm"
    },
    "mayday-local-dev": {
      "command": "node",
      "args": ["server/server.js"],
      "env": { "NODE_ENV": "development", "PORT": "8004" }
    },
    "mayday-main-database": {
      "command": "mysql",
      "args": [
        "-h",
        "65.1.149.92",
        "-P",
        "3306",
        "-u",
        "mayday_user",
        "-p",
        "asterisk"
      ],
      "description": "Main CRM database (VM public IP)"
    },
    "mayday-datatool-database": {
      "command": "mysql",
      "args": ["-h", "localhost", "-P", "3306", "-u", "mayday_user", "-p"],
      "description": "DataTool analytics database"
    },
    "mayday-database-monitor": {
      "command": "node",
      "args": ["scripts/db-monitor.js"],
      "description": "Database connection monitoring service"
    }
  },
  "databases": {
    "main": {
      "host": "52.66.181.114",
      "port": 3306,
      "name": "asterisk",
      "description": "Main CRM database with call records, users, and voice extensions"
    },
    "datatool": {
      "host": "localhost",
      "port": 3306,
      "name": "mayday_crm_db",
      "description": "DataTool analytics database with posts, sessions, and reporting data"
    }
  }
}
```

#### Database Tracking Features

- **Dual Database Monitoring**: Tracks both main CRM and DataTool databases
- **Connection Health Checks**: Real-time status monitoring
- **Schema Information**: Table counts, sizes, and metadata
- **Performance Metrics**: Connection pooling and query performance
- **Backup Management**: Automated database backup creation

### 3. Database Management

The project includes comprehensive database management tools:

#### Database Manager Script (`scripts/db-manager.sh`)

```bash
# Check database status
npm run db:status

# Test database connections
npm run db:test

# Show table information
npm run db:tables

# Start monitoring service
npm run db:monitor

# Create backups
npm run db:backup

# Connect to main database
npm run db:main

# Connect to DataTool database
npm run db:datatool
```

#### Database Monitor Service (`scripts/db-monitor.js`)

- **Real-time Monitoring**: Health checks every 30 seconds
- **Connection Pooling**: Monitors active/idle connections
- **Performance Metrics**: Query execution and response times
- **Event-driven**: Emits events for health status changes
- **CLI Interface**: Standalone monitoring with visual indicators

#### Database Configurations

| Database     | Host        | Port | User        | Database      | Purpose                                  |
| ------------ | ----------- | ---- | ----------- | ------------- | ---------------------------------------- |
| **Main CRM** | 65.1.149.92 | 3306 | mayday_user | asterisk      | Call management, users, voice extensions |
| **DataTool** | localhost   | 3306 | mayday_user | mayday_crm_db | Analytics, posts, sessions, reporting    |

### 4. VM Connection & Asterisk Configuration

```bash
# SSH to VM
ssh -i "MHU_Debian_Mumb.pem" admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com

# Navigate to project
cd /home/admin/Mayday-CRM-Scracth

# Switch to development branch
git checkout feature/enhanced-transfer-system

# Check Asterisk status
sudo systemctl status asterisk
sudo /usr/sbin/asterisk -rx 'manager show status'

# Check dialplan and realtime status
sudo /usr/sbin/asterisk -rx 'dialplan show from-internal'
sudo /usr/sbin/asterisk -rx 'core show version'
```

#### Asterisk Realtime Database Configuration

The VM uses a **realtime database-driven dialplan** system for dynamic call routing:

**Main Configuration Files:**

- `/etc/asterisk/extensions.conf` - Includes `extensions_mayday_context.conf`
- `/etc/asterisk/extensions_mayday_context.conf` - Defines realtime contexts
- `/etc/asterisk/extconfig.conf` - Configures ODBC realtime tables

**Realtime Contexts:**

```ini
[from-voip-provider]
switch => Realtime/from-voip-provider@voice_extensions

[outbound-trunk]
switch => Realtime/outbound-trunk@voice_extensions

[internal]
switch => Realtime/internal@voice_extensions
include => outbound-trunk

[from-internal]
switch => Realtime/from-internal@voice_extensions
include => internal
```

**ODBC Configuration:**

```ini
[asterisk-connector]
Description = MariaDB connection to asterisk database
Driver = MariaDB
Database = asterisk
Server = localhost
Port = 3306
Username = mayday_user
Password = Pasword@256
Option = 3
```

**Realtime Tables:**

- `voice_extensions` - Dynamic dialplan entries with fields: context, exten, priority, app, appdata, type, callerID, record, recordingFormat
- `ps_endpoints` - PJSIP endpoint configuration
- `ps_auths` - PJSIP authentication
- `ps_aors` - PJSIP address of record
- `ps_contacts` - PJSIP contact information
- `voice_queues` - Queue definitions
- `queue_members` - Queue member management
- `cdr` - Call Detail Records

**Key Benefits:**

- Dynamic dialplan management without Asterisk restarts
- Real-time extension and routing updates
- Flexible call flow configuration
- Database-driven call routing logic

## Enhanced Transfer System

### Architecture

The enhanced transfer system consists of:

1. **Controller Layer** (`enhancedTransferController.js`)

   - Function-based implementation (ES6+)
   - State management for active transfers
   - Integration with AMI service and CDR model

2. **Route Layer** (`enhancedTransferRoutes.js`)

   - RESTful API endpoints
   - Authentication middleware protection
   - Legacy route compatibility

3. **Service Integration**
   - AMI service for Asterisk control
   - CDR model for call records
   - Real-time event handling

### API Endpoints

```javascript
// Enhanced Transfer Routes
POST   /api/enhanced-transfers/blind          # Blind transfer
POST   /api/enhanced-transfers/managed        # Managed transfer
POST   /api/enhanced-transfers/complete       # Complete managed transfer
POST   /api/enhanced-transfers/queue          # Transfer to queue
GET    /api/enhanced-transfers/enhanced-status # Transfer status
DELETE /api/enhanced-transfers/:transferId    # Cancel transfer
GET    /api/enhanced-transfers/health         # System health
GET    /api/enhanced-transfers/capabilities   # System capabilities

// Legacy Transfer Routes (Maintained for compatibility)
GET    /api/enhanced-transfers/stats          # Transfer statistics
GET    /api/enhanced-transfers/history       # Transfer history
GET    /api/enhanced-transfers/analytics     # Agent analytics
```

### Transfer Types

#### 1. Blind Transfer

- Immediate transfer without consultation
- Direct channel bridging
- Automatic CDR updates

#### 2. Managed Transfer

- Consultation call with target
- Confirmation before transfer
- State tracking and monitoring

#### 3. Queue Transfer

- Transfer to Asterisk queues
- Queue member availability check
- Call routing optimization

## Development Workflow

### 1. Local Development

```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push origin feature/enhanced-transfer-system
```

### 2. VM Deployment

```bash
# SSH to VM
ssh -i "MHU_Debian_Mumb.pem" admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com

# Pull latest changes
cd /home/admin/Mayday-CRM-Scracth
git pull origin feature/enhanced-transfer-system

# Restart server
sudo -u mayday pm2 restart mayday
```

### 3. Testing

```bash
# Test endpoints (will return "Unauthorized" - expected)
curl -X GET "http://65.1.149.92:8004/api/enhanced-transfers/health"
curl -X GET "http://65.1.149.92:8004/api/enhanced-transfers/capabilities"
```

## Configuration Files

### 1. Cursor Rules (`.cursorrules`)

- Project-specific development standards
- Code style guidelines
- Technology stack requirements

### 2. MCP Server Config (`mcp-server-config.json`)

- Remote development configuration
- VM access settings
- Context7 integration

### 3. Environment Variables

- Server port configuration
- Database connections
- Asterisk AMI/ARI settings

## Troubleshooting

### Common Issues

#### 1. Import Errors

- **Problem**: Module import syntax mismatches
- **Solution**: Use correct export/import syntax (default vs named)
- **Example**: `import CDR from "../models/cdr.js"` not `import { CDR } from "../models/cdr.js"`

#### 2. PM2 Process Issues

- **Problem**: Process not found or permission errors
- **Solution**: Use correct user (`sudo -u mayday pm2 restart mayday`)
- **Check**: Verify PM2 process status and user ownership

#### 3. Port Binding Issues

- **Problem**: Server not listening on expected port
- **Solution**: Check environment variables and server configuration
- **Verify**: Use `netstat -tlnp | grep 8004`

### Debug Commands

```bash
# Check server status
sudo -u mayday pm2 status mayday

# View server logs
sudo -u mayday pm2 logs mayday --lines 20

# Check port binding
netstat -tlnp | grep 8004

# Verify file changes
git status
git log --oneline -5
```

## Next Steps

### Immediate Tasks

1. **Frontend Integration**: Connect SIP.js softphone to enhanced transfer API
2. **Transfer Testing**: Test blind and managed transfer scenarios
3. **Error Handling**: Implement comprehensive error handling in frontend
4. **User Interface**: Create transfer management UI components

### Future Enhancements

1. **Transfer Analytics**: Advanced reporting and metrics
2. **Queue Management**: Enhanced queue transfer capabilities
3. **Call Recording**: Integration with call recording system
4. **Performance Optimization**: Caching and connection pooling

## Electron Softphone Auto-Update System

The Electron softphone includes an auto-update feature that allows users to update without manual reinstallation.

### How It Works

1. **Update Check**: App automatically checks for updates on startup (after 5 seconds)
2. **Notification**: Users see an update icon/notification when a new version is available
3. **Download**: Users can download the update in the background
4. **Install**: After download, users can restart to apply the update

### Cross-Platform Build & Deploy Process

**Why build on Windows?** The native `win-appbar` module requires Windows to compile. Building on macOS results in a fallback mode that doesn't reserve screen space.

#### Option A: Build on Windows, Deploy from macOS (Recommended)

**Step 1: On Windows - Build and Commit**

```powershell
# Pull latest, install deps, build
cd Mayday-CRM-Scracth\electron-softphone
git pull origin feature/enhanced-transfer-system
npm install
npm run build
npm run electron:build:win

# Commit build files to GitHub
git add -f "release/5.1.5/latest.yml" "release/5.1.5/MHU Appbar Setup 5.1.5.exe"
git commit -m "Add Windows build v5.1.5 with native appbar module"
git push origin feature/enhanced-transfer-system
```

**Step 2: On macOS - Pull and Deploy**

```bash
# Pull the Windows build
cd ~/Downloads/Mayday-CRM-Scracth
git pull origin feature/enhanced-transfer-system

# Delete previous version from server
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "rm -f /var/www/html/downloads/latest.yml /var/www/html/downloads/'MHU Appbar Setup'*.exe"

# Upload new version
scp -i ~/Downloads/MHU_Debian_Mumb.pem \
  "electron-softphone/release/5.1.5/latest.yml" \
  "electron-softphone/release/5.1.5/MHU Appbar Setup 5.1.5.exe" \
  admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/

# Verify
curl -s https://mhuhelpline.com/downloads/latest.yml
```

**Quick Deploy from macOS (One-liner)**:
```bash
cd ~/Downloads/Mayday-CRM-Scracth && \
git pull origin feature/enhanced-transfer-system && \
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "rm -f /var/www/html/downloads/latest.yml /var/www/html/downloads/'MHU Appbar Setup'*.exe" && \
scp -i ~/Downloads/MHU_Debian_Mumb.pem \
  "electron-softphone/release/5.1.5/latest.yml" \
  "electron-softphone/release/5.1.5/MHU Appbar Setup 5.1.5.exe" \
  admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/ && \
curl -s https://mhuhelpline.com/downloads/latest.yml
```

#### Option B: Full Build and Deploy from macOS (No Native Module)

```bash
cd electron-softphone && \
npm run build && \
npm run electron:build:win && \
scp -i ~/Downloads/MHU_Debian_Mumb.pem \
  "release/X.X.X/latest.yml" \
  "release/X.X.X/MHU Appbar Setup X.X.X.exe" \
  admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/ && \
curl -s https://mhuhelpline.com/downloads/latest.yml
```

⚠️ **Note**: Option B builds work but won't have the native appbar module - docked mode won't reserve screen space.

### Update Server Configuration

**Server URL**: `https://mhuhelpline.com/downloads/`

**Nginx location block** (in `/usr/local/nginx/conf/nginx.conf`):
```nginx
location /downloads/ {
    alias /var/www/html/downloads/;
    autoindex off;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=3600";
}
```

**Required files on server** (`/var/www/html/downloads/`):
- `latest.yml` - Version metadata (auto-generated by electron-builder)
- `MHU Appbar Setup X.X.X.exe` - The installer (~85 MB)
- `MHU Appbar Setup X.X.X.exe.blockmap` - Delta updates (optional, only if differential packages enabled)

**Verify deployment**:
```bash
curl https://mhuhelpline.com/downloads/latest.yml
```

### Delete Old Versions from Server

To clean up old versions and free server space:

**Delete specific versions:**
```bash
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "rm -f /var/www/html/downloads/'MHU Appbar Setup 5.1.4.exe' \
         /var/www/html/downloads/'MHU Appbar Setup 5.1.3.exe' \
         /var/www/html/downloads/'MHU Appbar Setup 5.1.3.exe.blockmap'"
```

**List all versions on server:**
```bash
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "ls -la /var/www/html/downloads/*.exe"
```

**Delete ALL old versions (keep only latest):**
```bash
# First check what's there
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "ls -la /var/www/html/downloads/"

# Delete all exe files except the latest version
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "cd /var/www/html/downloads && rm -f 'MHU Appbar Setup 5.0.'*.exe 'MHU Appbar Setup 5.0.'*.blockmap"
```

**Note**: Always keep `latest.yml` and the current version's `.exe` file. The auto-updater reads `latest.yml` to determine the current version.

### Manual Update Check

Users can manually check for updates via:
- **Menu**: Click hamburger menu → "Check for Updates"
- **Auto-notification**: A pulsing icon appears when update is available

### Current Deployment

- **Version**: 5.1.5 ✅ Deployed
- **Build Date**: December 15, 2025
- **Build Location**: `electron-softphone/release/5.1.5/` (committed to GitHub)
- **Files**: https://mhuhelpline.com/downloads/latest.yml
- **Direct Download**: https://mhuhelpline.com/downloads/MHU%20Appbar%20Setup%205.1.5.exe
- **Changes in v5.1.5**: 
  - **Native AppBar Module**: Properly reserves screen space when docked (Windows Shell API)
  - **Restored Native Title Bar**: Uses native Windows title bar when NOT docked
  - **Removed Custom Window Controls**: Cleaner UI using native title bar controls
  - **Improved Installer**: Better process termination, disabled differential packages

### Previous Versions

**v5.1.0** (December 14, 2025):
  - Docked Mode Improvements: Reduced height to 45px, hides side navigation drawer
  - Docked Logout Button: Only logout icon visible in docked/sticky mode
  - Animated Incoming Call Buttons: Answer/reject buttons with pulse animation in docked mode
  - Session Expiration Handling: Auto-redirect to login after 10 failed auth retries
  - Fixed Infinite Retry Loops: Connection manager stops retrying when session expired

**v5.0.9** (December 14, 2025):
  - Various stability improvements

**v5.0.7** (December 13, 2025):
  - Improved Pause status indicator (larger, pulsing animation, highlighted background)
  - Better visibility for paused/pausing states
  - Various bug fixes

**v5.0.6** (December 1, 2025):
  - Added Audio Device Settings in PhonebarInfo (microphone/speaker selection, volume controls, test buttons)
  - Added AppUpdater component to Login screen for checking updates before login
  - Fixed URL preference switch clearing auth state (no longer clears localStorage)
  - Fixed "Remember Me" functionality race condition (credentials were being cleared on load)
  - Fixed Windows auto-update "MHU Appbar cannot be closed" error
  - Improved update installer to use silent mode and proper window cleanup
  - Added NSIS elevation and runAfterFinish options for smoother updates

## Support and Resources

### Documentation

- [Asterisk AMI Documentation](https://wiki.asterisk.org/wiki/display/AST/Asterisk+Manager+Interface+AMI)
- [SIP.js Documentation](https://sipjs.com/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

### Development Tools

- **MCP Server**: Remote development and VM access
- **Context7**: In-IDE documentation and context
- **PM2**: Process management and monitoring
- **Git**: Version control and deployment

---

**Last Updated**: December 16, 2025  
**Development Status**: Enhanced Transfer System ✅ Complete  
**Current Branch**: `feature/enhanced-transfer-system`  
**Server Status**: Running on VM (Port 8004)  
**Last Build**: December 16, 2025 - v5.1.5 with native appbar module ✅ Deployed
