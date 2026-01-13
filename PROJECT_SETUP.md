# Mayday EC Project Setup Guide

## Project Overview

Mayday EC is a comprehensive customer relationship management system with Asterisk PBX integration, featuring:

- React frontend with SIP.js softphone
- Node.js backend with AMI/ARI integration
- Asterisk PBX system for call management
- Advanced call transfer functionality (managed and blind)
- Real-time call monitoring and management
- MariaDB database with Sequelize ORM

## Current Development Status ✅

### Completed Features

- **Enhanced Transfer System**: Fully implemented
- **On-Prem Server Migration**: Migrated from AWS to local on-prem server (192.168.1.14)
- **SSH Key Authentication**: Configured for seamless server access
- **Database Migration**: Schema replicated from AWS to on-prem MariaDB
- **Datatool Removal**: Removed unused datatool_server and MongoDB dependencies

### Development Branch

- **Current Branch**: `development`
- **Status**: Active development on on-prem infrastructure
- **GitHub Repo**: https://github.com/Dlu6/Mayday_EC.git

## Prerequisites

### Local Development (macOS)

- Node.js 18.x
- npm or yarn
- Git
- SSH key configured for on-prem server access (`~/.ssh/id_ed25519`)

### Dell Server - Primary Production (192.168.1.14)

| Setting | Value |
|---------|-------|
| IP Address | 192.168.1.14 |
| Hardware | Dell PowerEdge |
| Purpose | Primary production server with Cloud SIP trunk |
| SSH User | `medhi` |
| Project Path | `/home/medhi/Mayday_EC` |

**Requirements:**
- Debian/Ubuntu server with Asterisk
- Node.js 18.x
- PM2 for process management
- MariaDB 10.11+

### HPE Server - PBX/Asterisk (192.168.1.15)

| Setting | Value |
|---------|-------|
| IP Address | 192.168.1.15 |
| Hardware | HPE ProLiant DL380 Gen11 |
| Purpose | Asterisk/MySQL server (MTN SIP trunk via leased line) |
| SSH User | `mayday` |
| Project Path | `/home/mayday/Mayday_EC` |

**Requirements:**
- Debian 12 (Bookworm) - Minimal installation
- Asterisk 20.x (for MTN leased line SIP trunk)
- MariaDB 10.11+
- Node.js 18.x
- PM2 for process management

> [!WARNING]
> **No sudo installed**: HPE uses minimal Debian 12 without sudo. Use `su -` to elevate to root instead.

**Root Access Pattern (HPE):**
```bash
# SSH as mayday, then switch to root
ssh -i ~/.ssh/id_ed25519 mayday@192.168.1.15
su -
# Password: Pasword@1759

# For automated commands via SSH:
ssh -i ~/.ssh/id_ed25519 mayday@192.168.1.15 "echo 'Pasword@1759' | su - -c '<command>'"
```

**Cloning the Repository (as root):**
```bash
git clone https://github.com/Dlu6/Mayday_EC.git /home/mayday/Mayday_EC
cd /home/mayday/Mayday_EC
git checkout development
chown -R mayday:mayday /home/mayday/Mayday_EC
```

## Project Structure

```
Mayday_EC/
├── client/                 # React frontend (admin dashboard)
├── server/                 # Node.js backend
│   ├── controllers/        # Business logic
│   │   ├── enhancedTransferController.js  # Enhanced transfer system
│   │   └── transferController.js          # Legacy transfer system
│   ├── routes/             # API endpoints
│   ├── services/           # External service integrations
│   │   ├── amiService.js   # Asterisk Manager Interface
│   │   └── ariService.js   # Asterisk REST Interface
│   └── models/             # Database models (Sequelize)
├── electron-softphone/     # Electron-based softphone
├── mhu-wiki/               # Docusaurus documentation
└── config/                 # Configuration files
```

## Server IP/Domain Configuration

### Centralized Configuration Files

To change the server IP or domain, update the following files:

| Component | File | Variable/Constant |
|-----------|------|-------------------|
| **Electron Softphone** | `electron-softphone/src/config/serverConfig.js` | `DEFAULT_SERVER_HOST` |
| **Electron Vite Build** | `electron-softphone/vite.config.js` | `DEFAULT_SERVER_HOST` |
| **Electron Main Process** | `electron-softphone/electron/main.js` | `DEFAULT_SERVER_HOST` |
| **Electron Env** | `electron-softphone/.env.production` | `VITE_SERVER_HOST` |
| **Server Backend** | `server/.env` | `PUBLIC_IP` |
| **Wiki Documentation** | `mhu-wiki/docusaurus.config.js` | `url` field |

### How to Change Server IP

1. **For Electron Softphone** (client app):
   ```javascript
   // electron-softphone/src/config/serverConfig.js
   const DEFAULT_SERVER_HOST = "192.168.1.14";  // Change this
   ```

2. **For Server Backend** (CORS and API):
   ```bash
   # server/.env
   PUBLIC_IP=192.168.1.14  # Change this
   ```

3. **For Electron Build** (vite.config.js):
   ```javascript
   // electron-softphone/vite.config.js
   const DEFAULT_SERVER_HOST = "192.168.1.14";  // Change this
   ```

4. **For Electron Main Process**:
   ```javascript
   // electron-softphone/electron/main.js
   const DEFAULT_SERVER_HOST = "192.168.1.14";  // Change this
   ```

### Runtime Configuration

The Electron softphone also supports runtime configuration via localStorage:
- `serverHost` - Override the default server host
- `useHttps` - Enable/disable HTTPS (default: false for on-prem)
- `apiPort` - Override API port (default: empty for nginx on port 80)
- `sipPort` - Override SIP WebSocket port (default: 8088)

### Important Notes

- All hardcoded domain references (`domain.com`) have been removed
- Server CORS configuration dynamically uses `PUBLIC_IP` from `.env`
- Electron services import from `serverConfig.js` for consistent URL resolution
- After changing IPs, rebuild the client: `cd client && npm run build`
- Restart PM2 after server changes: `pm2 restart all`

## SSL/HTTPS Configuration

The on-prem server uses a self-signed SSL certificate for HTTPS.

### Certificate Location

| File | Path |
|------|------|
| Certificate | `/etc/nginx/ssl/nginx.crt` |
| Private Key | `/etc/nginx/ssl/nginx.key` |

### Nginx Configuration

The nginx config is at `/etc/nginx/sites-available/mayday` (symlinked to `sites-enabled`).

Key features:
- HTTP (port 80) redirects to HTTPS (port 443)
- SSL with TLSv1.2 and TLSv1.3
- Proxies `/api` to Node.js backend (port 8004)
- Proxies `/socket.io/` for WebSocket connections
- Proxies `/ws` to Asterisk WebSocket (port 8088)
- Proxies `/ari` to Asterisk REST Interface

### Regenerating SSL Certificate

If you need to regenerate the self-signed certificate (e.g., expired or IP change):

```bash
# SSH to server
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14

# Generate new certificate (valid for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx.key \
  -out /etc/nginx/ssl/nginx.crt \
  -subj "/C=UG/ST=Kampala/L=Kampala/O=Mayday/OU=IT/CN=192.168.1.14"

# Restart nginx
sudo systemctl restart nginx
```

### Browser Certificate Warning

Since it's a self-signed certificate, browsers will show a warning on first visit:
1. Click **"Advanced"**
2. Click **"Proceed to 192.168.1.14 (unsafe)"**

The warning won't appear again for that browser after accepting.

### Reference Config

A copy of the nginx SSL config is stored at `scripts/nginx-mayday-ssl.conf` for reference.

## Environment Setup

### 1. Local Development Environment

```bash
# Clone repository
git clone https://github.com/Dlu6/Mayday_EC.git
cd Mayday_EC

# Switch to development branch
git checkout development

# Install dependencies
npm install
cd client && npm install && cd ..

# Copy environment file and configure
cp .env.example .env
# Edit .env with your credentials

# Run development servers
npm run server_client  # Backend + Dashboard

# For Electron softphone (separate terminal)
cd electron-softphone
npm install
npm run electron:dev
```

### 2. On-Prem Server Access

SSH to the on-prem Asterisk server:

```bash
# SSH using key authentication
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14

# Or simply (if key is default)
ssh medhi@192.168.1.14
```

### 3. Database Connection

The database is hosted on the on-prem server:

| Setting    | Value           |
|------------|-----------------|
| Host       | 192.168.1.14    |
| Port       | 3306            |
| Database   | asterisk        |
| User       | mayday_user     |
| Password   | (see .env file) |

```bash
# Connect to database from local machine
mysql -h 192.168.1.14 -u mayday_user -p asterisk
```

### 4. MCP Server Configuration

The project includes `mcp-server-config.json` for seamless development with the on-prem server:

```json
{
  "mcpServers": {
    "mayday-asterisk-server": {
      "command": "ssh",
      "args": ["-i", "~/.ssh/id_ed25519", "medhi@192.168.1.14"],
      "description": "On-prem Asterisk server - SSH key authentication"
    },
    "mayday-local-dev": {
      "command": "node",
      "args": ["server/server.js"],
      "env": { "NODE_ENV": "development", "PORT": "8004" }
    },
    "mayday-database": {
      "command": "mysql",
      "args": ["-h", "192.168.1.14", "-P", "3306", "-u", "mayday_user", "-p", "asterisk"],
      "description": "Main CRM database on on-prem server"
    }
  },
  "databases": {
    "main": {
      "host": "192.168.1.14",
      "port": 3306,
      "name": "asterisk",
      "description": "Main CRM database with call records, users, and voice extensions"
    }
  }
}
```

### 5. On-Prem Server & Asterisk Configuration

```bash
# SSH to on-prem server
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14

# Check Asterisk status
sudo systemctl status asterisk
sudo /usr/sbin/asterisk -rx 'manager show status'

# Check dialplan and realtime status
sudo /usr/sbin/asterisk -rx 'dialplan show from-internal'
sudo /usr/sbin/asterisk -rx 'core show version'

# Check MariaDB status
sudo systemctl status mariadb
```

#### Asterisk Realtime Database Configuration

The on-prem server uses a **realtime database-driven dialplan** system for dynamic call routing:

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
Password = (configured in /etc/odbc.ini)
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

## ChanSpy (Call Monitoring) System

### Overview

ChanSpy allows supervisors to monitor, whisper to, or barge into live calls. This feature is essential for quality assurance, agent training, and real-time coaching.

### Monitoring Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Listen** | Silent monitoring - hear both parties without being heard | Quality assurance, training review |
| **Whisper** | Speak to the agent only (caller cannot hear) | Real-time coaching, providing information |
| **Barge** | Speak to both parties (3-way conversation) | Escalation, intervention, customer service |

### Architecture

1. **Server Layer** (`server/services/amiService.js`)
   - `startChanSpy()` - Start spying on a specific channel
   - `startChanSpyByExtension()` - Start spying by extension (auto-finds active channel)
   - `stopChanSpy()` - Stop an active spy session
   - `getSpyableChannels()` - Get list of active calls that can be monitored
   - `switchChanSpyMode()` - Switch between modes during active session

2. **Route Layer** (`server/routes/amiRoutes.js`)
   - RESTful API endpoints for ChanSpy operations
   - Authentication middleware protection

3. **Client Layer**
   - `client/src/services/chanSpyService.js` - API service
   - `client/src/components/ChanSpy.jsx` - Full UI component

4. **Electron Softphone Layer**
   - `electron-softphone/src/services/chanSpyService.js` - API service
   - `electron-softphone/src/components/ChanSpy.jsx` - UI component (with compact mode)

### API Endpoints

```javascript
// ChanSpy Routes
POST   /api/ami/chanspy/start              # Start ChanSpy on specific channel
POST   /api/ami/chanspy/start-by-extension # Start ChanSpy by extension (auto-finds channel)
POST   /api/ami/chanspy/stop               # Stop active ChanSpy session
GET    /api/ami/chanspy/channels           # Get list of spyable channels
POST   /api/ami/chanspy/switch-mode        # Switch monitoring mode
```

### Request/Response Examples

#### Start ChanSpy by Extension
```bash
curl -X POST "http://localhost:8004/api/ami/chanspy/start-by-extension" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "spyerExtension": "1000",
    "targetExtension": "1001",
    "mode": "listen",
    "quiet": true,
    "volume": 0
  }'
```

#### Get Spyable Channels
```bash
curl -X GET "http://localhost:8004/api/ami/chanspy/channels" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Stop ChanSpy
```bash
curl -X POST "http://localhost:8004/api/ami/chanspy/stop" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"spyerExtension": "1000"}'
```

### ChanSpy Options

| Option | Type | Description |
|--------|------|-------------|
| `spyerExtension` | string | Extension of the supervisor initiating the spy |
| `targetExtension` | string | Extension to spy on (for start-by-extension) |
| `targetChannel` | string | Full channel name (for start) |
| `mode` | string | `listen`, `whisper`, or `barge` |
| `quiet` | boolean | Don't play beep to spied channel (default: true) |
| `volume` | integer | Volume adjustment (-4 to +4) |
| `group` | string | Only spy on channels in this group |

### UI Access

- **Client Dashboard**: Navigate to **Voice → Call Monitoring** in the sidebar
- **Electron Softphone**: Available as a component (can be integrated into sidebar)

### License Feature

ChanSpy requires the `chanspy` feature to be enabled in the license. Add to license features:

```json
{
  "features": {
    "chanspy": true
  }
}
```

### Testing

```bash
# Run server-side tests
cd server && npm test -- --testPathPattern=chanSpy

# Run client-side tests
cd client && npm test -- --testPathPattern=ChanSpy

# Run electron-softphone tests
cd electron-softphone && npm test -- --testPathPattern=chanSpy
```

### How ChanSpy Works (Asterisk)

1. Supervisor clicks "Monitor" on an active call in the UI
2. Server sends AMI `Originate` action to supervisor's phone with `ChanSpy` application
3. Supervisor's phone rings - they answer to start listening
4. ChanSpy options determine mode (listen/whisper/barge)
5. Supervisor hears the call (and can speak depending on mode)
6. When supervisor hangs up or clicks "Stop", the spy session ends

## Electron Softphone Build Guide

### Overview

The Electron Softphone (`electron-softphone/`) contains Windows-specific features (AppBar docking, native modules) that require building on a Windows PC. This section documents how to build and deploy the softphone.

### Prerequisites (Windows)

1. **Windows 10/11** (64-bit)
2. **Node.js 16+** and npm 7+
3. **Visual Studio Build Tools** (for native module compilation)
   ```powershell
   # Install via winget
   winget install Microsoft.VisualStudio.2022.BuildTools
   
   # Or download from:
   # https://visualstudio.microsoft.com/visual-cpp-build-tools/
   ```
4. **Python 3.x** (required by node-gyp)
5. **Git for Windows**

### Setup on Windows

```powershell
# 1. Clone the repository
git clone <repository-url>
cd Mayday_EC/electron-softphone

# 2. Install dependencies
npm install

# 3. Build native modules (Windows AppBar)
npm run build:native

# 4. Verify native module build
npm run check:native
```

### Development Mode

```powershell
# Start in development mode (hot reload)
npm run start

# Or use the explicit electron dev command
npm run electron:dev
```

### Building for Production

```powershell
# Navigate to electron-softphone directory
cd electron-softphone

# Build Windows installer (NSIS)
npm run electron:build:win

# Build output location
# electron-softphone/release/5.1.5/
```

**Build Artifacts Created:**

| File | Path | Description |
|------|------|-------------|
| **Installer** | `release/5.1.5/Mayday Appbar Setup 5.1.5.exe` | Windows NSIS installer (distributable) |
| **Update Manifest** | `release/5.1.5/latest.yml` | Auto-update configuration file |
| **Unpacked App** | `release/5.1.5/win-unpacked/` | Unpacked application files (for testing) |
| **Debug Info** | `release/5.1.5/builder-debug.yml` | Build configuration debug info |

### Build Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run start` | Development mode with hot reload |
| `npm run build` | Build Vite frontend only |
| `npm run electron:build:win` | Build Windows installer |
| `npm run electron:build:mac` | Build macOS app (requires macOS) |
| `npm run electron:build:linux` | Build Linux AppImage |
| `npm run electron:deploy` | Build and publish to update server |
| `npm run build:native` | Rebuild native Windows modules |
| `npm run check:native` | Verify native module prerequisites |

### Windows-Specific Features

The softphone includes these Windows-specific features that require native compilation:

1. **AppBar Docking** (`native/win-appbar/`)
   - Docks to screen edge like Windows taskbar
   - Reserves screen space
   - Requires `win-appbar.node` native module

2. **Auto-updater**
   - Downloads updates from configured server
   - NSIS installer for seamless updates

### Environment Configuration

**Production Server Configuration:**

The following files must be configured with the production server IP (`192.168.1.14`):

| File | Variable | Current Value |
|------|----------|---------------|
| `src/config/serverConfig.js` | `DEFAULT_SERVER_HOST` | `192.168.1.14` |
| `vite.config.js` | `DEFAULT_SERVER_HOST` | `192.168.1.14` |
| `electron/main.js` | `DEFAULT_SERVER_HOST` | `192.168.1.14` |
| `.env.production` | `VITE_SERVER_HOST` | `192.168.1.14` |

**Example `.env.production`:**

```env
# Server Configuration
VITE_SERVER_HOST=192.168.1.14
VITE_PUBLIC_IP=192.168.1.14
VITE_PORT=8004
VITE_SIP_PORT=8088

# API URLs
VITE_API_URL=http://192.168.1.14
VITE_WS_URL=ws://192.168.1.14:8088
VITE_BASE_URL=http://192.168.1.14

# Environment
NODE_ENV=production
```

### Deploying Updates to Production

The softphone uses **electron-updater** to automatically check for and install updates from the configured server.

**Auto-Update Configuration** (`package.json`):

```json
"publish": {
  "provider": "generic",
  "url": "http://192.168.1.14/downloads/"
}
```

**Deployment Steps:**

#### Option 1: Manual Deployment (Recommended for Production)

```powershell
# 1. Build the installer on Windows
cd electron-softphone
npm run electron:build:win

# 2. Verify build artifacts exist
dir release\5.1.5\

# 3. Copy to production server (192.168.1.14)
# Using SCP or file transfer tool, copy these files to /var/www/html/downloads/:
# - release/5.1.5/Mayday Appbar Setup 5.1.5.exe
# - release/5.1.5/latest.yml
```

**Using SCP (if SSH access available):**

```bash
# From Windows (using Git Bash or WSL)
scp "release/5.1.5/Mayday Appbar Setup 5.1.5.exe" \
    "release/5.1.5/latest.yml" \
    medhi@192.168.1.14:/var/www/html/downloads/

# Or using PowerShell with pscp (PuTTY)
pscp "release\5.1.5\Mayday Appbar Setup 5.1.5.exe" medhi@192.168.1.14:/var/www/html/downloads/
pscp "release\5.1.5\latest.yml" medhi@192.168.1.14:/var/www/html/downloads/
```

#### Option 2: Deploy via Git (Development/Testing)

```powershell
# 1. Add build files to git (normally ignored)
git add -f "release/5.1.5/latest.yml" "release/5.1.5/Mayday Appbar Setup 5.1.5.exe"
git commit -m "Add Windows build v5.1.5"
git push origin development

# 2. On server, pull and copy to nginx directory
ssh medhi@192.168.1.14
cd ~/Mayday_EC
git pull origin development
sudo cp electron-softphone/release/5.1.5/*.exe /var/www/html/downloads/
sudo cp electron-softphone/release/5.1.5/latest.yml /var/www/html/downloads/
```

**Verify Deployment:**

```bash
# Check files are accessible
curl -I http://192.168.1.14/downloads/latest.yml
curl -I http://192.168.1.14/downloads/Mayday%20Appbar%20Setup%205.1.5.exe

# Should return HTTP 200 OK
```

**Auto-Update Behavior:**

- Installed apps check for updates on startup
- Update check interval: 5 seconds after app launch
- If new version found in `latest.yml`, download starts automatically
- User is prompted to install and restart
- Silent background download, no interruption to active calls

### Troubleshooting Windows Build

#### Native Module Build Fails
```powershell
# Ensure Visual Studio Build Tools are installed
npm config set msvs_version 2022

# Rebuild all native modules
npm run rebuild:native
```

#### Electron Version Mismatch
```powershell
# Rebuild for current Electron version
./node_modules/.bin/electron-rebuild
```

#### AppBar Not Docking
- Verify `win-appbar.node` exists in `native/win-appbar/build/Release/`
- Check Windows display settings (scaling, multiple monitors)
- Run as Administrator for testing

### Cross-Platform Build Notes

| Platform | Build From | Command |
|----------|------------|---------|
| Windows | Windows only | `npm run electron:build:win` |
| macOS | macOS only | `npm run electron:build:mac` |
| Linux | Any | `npm run electron:build:linux` |

**Important**: Windows builds with native modules MUST be built on Windows.

## Development Workflow

### 1. Local Development

```bash
# Make changes locally
git add .
git commit -m "Description of changes"
git push origin development
```

### 2. Testing

```bash
# Test local server endpoints
curl -X GET "http://localhost:8004/api/enhanced-transfers/health"
curl -X GET "http://localhost:8004/api/enhanced-transfers/capabilities"
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
# Check local server (development)
lsof -i :8004

# Check on-prem server status
ssh medhi@192.168.1.14 "pm2 status mayday"

# View on-prem server logs
ssh medhi@192.168.1.14 "pm2 logs mayday --lines 20"

# Check MariaDB on on-prem server
ssh medhi@192.168.1.14 "sudo systemctl status mariadb"

# Verify file changes
git status
git log --oneline -5
```

## On-Prem Server Deployment Guide

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        On-Prem Server (192.168.1.14)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────────────────────────────────────────┐  │
│  │   Browser   │     │                    nginx (port 80)               │  │
│  │  (Client)   │────▶│  Reverse Proxy - Routes requests to services     │  │
│  └─────────────┘     └──────────────────────────────────────────────────┘  │
│                                      │                                      │
│         ┌────────────────────────────┼────────────────────────────┐        │
│         │                            │                            │        │
│         ▼                            ▼                            ▼        │
│  ┌─────────────────┐   ┌─────────────────────────┐   ┌─────────────────┐  │
│  │  Static Files   │   │   Node.js Backend       │   │   Asterisk PBX  │  │
│  │  /client/build  │   │   (PM2 - port 8004)     │   │   (port 8088)   │  │
│  │                 │   │                         │   │                 │  │
│  │  React App      │   │  /api/* → proxy_pass    │   │  /ws  → WebRTC  │  │
│  │  Dashboard UI   │   │  /socket.io/* → WS      │   │  /ari → REST    │  │
│  └─────────────────┘   └─────────────────────────┘   └─────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│                        ┌─────────────────────────┐                         │
│                        │      MariaDB            │                         │
│                        │    (port 3306)          │                         │
│                        │   Database: asterisk    │                         │
│                        └─────────────────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

| Request Path | nginx Routes To | Description |
|--------------|-----------------|-------------|
| `/` | `/home/medhi/Mayday_EC/client/build` | React dashboard (static files) |
| `/api/*` | `http://127.0.0.1:8004` | Node.js backend API |
| `/socket.io/*` | `http://127.0.0.1:8004` | WebSocket for real-time updates |
| `/ws` | `http://127.0.0.1:8088/ws` | Asterisk WebSocket (SIP over WS) |
| `/ari` | `http://127.0.0.1:8088/ari` | Asterisk REST Interface |

### PM2 Process Management

```
┌─────────────────────────────────────────────────────────────────┐
│                         PM2 (root user)                         │
├─────────────────────────────────────────────────────────────────┤
│  Process: mayday                                                │
│  Script:  /home/medhi/Mayday_EC/server/server.js               │
│  Mode:    fork                                                  │
│  Status:  online ✅                                             │
│  Port:    8004                                                  │
│                                                                 │
│  Logs:    /root/.pm2/logs/mayday-out.log                       │
│           /root/.pm2/logs/mayday-error.log                     │
│                                                                 │
│  Startup: systemd (auto-start on boot)                         │
└─────────────────────────────────────────────────────────────────┘
```

### PM2 Environment Variables (IMPORTANT)

PM2 caches environment variables when a process is first started. If you update environment variables in `.env` or `ecosystem.config.cjs`, you **must** delete and restart the process for changes to take effect.

**Common Issue: CORS errors after changing PUBLIC_IP**

If you get CORS errors like "Not allowed by CORS" after changing `PUBLIC_IP`, it's because PM2 is still using the cached old IP.

**Solution: Delete and restart the PM2 process**

```bash
# This will NOT pick up new environment variables:
pm2 restart mayday
pm2 restart mayday --update-env  # Also doesn't always work

# Correct way - delete and restart from ecosystem config:
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && cd /home/medhi/Mayday_EC && pm2 delete mayday && pm2 start ecosystem.config.cjs && pm2 save'"
```

**Verify the environment is correct:**

```bash
# Check current PM2 environment for process 0:
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && pm2 env 0'" | grep PUBLIC_IP

# Should output: PUBLIC_IP: 192.168.1.14
```

**Environment variable sources (priority order):**

1. `ecosystem.config.cjs` - Primary source for PM2 environment
2. `server/.env` - Loaded by dotenv at runtime (supplements ecosystem config)

**Key environment variables for CORS:**

| Variable | Location | Purpose |
|----------|----------|---------|
| `PUBLIC_IP` | `ecosystem.config.cjs` | Used to build CORS allowed origins list |
| `PORT` | `ecosystem.config.cjs` | Server port (default: 8004) |
| `NODE_ENV` | `ecosystem.config.cjs` | Set to "production" for strict CORS |
| `LICENSE_MGMT_API_URL` | `ecosystem.config.cjs` | License provisioning server URL |
| `SECRET_INTERNAL_API_KEY` | `ecosystem.config.cjs` | API key for license server communication |

### License Server Configuration (Master-Slave Architecture)

The on-prem server acts as a **slave** that syncs licenses from the **master** (Heroku provisioning server).

**ecosystem.config.cjs environment variables:**

```javascript
env: {
  LICENSE_MGMT_API_URL: "https://mayday-website-backend-c2abb923fa80.herokuapp.com/api",
  SECRET_INTERNAL_API_KEY: "aVeryLongAndRandomSecretStringForInternalComms_987654321_production",
}
```

**Important: The `SECRET_INTERNAL_API_KEY` must match the key on the Heroku provisioning server.**

#### Server Fingerprint

The server generates a unique fingerprint for license identification using:
- CPU model (hashed)
- Disk serial
- MAC address
- Motherboard serial
- Hostname

**Get current fingerprint:**
```bash
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && pm2 logs mayday --lines 50 --nostream'" 2>&1 | grep "Current fingerprint"
```

#### License Sync Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "No license found on master server" | Fingerprint not registered on master | Copy fingerprint from slave, create license on master with that fingerprint |
| "Invalid internal API key" | API key mismatch | Ensure `SECRET_INTERNAL_API_KEY` in ecosystem.config.cjs matches Heroku's config |
| "Failed to connect to master license server" | Network/CORS issue | Add slave's origin to Heroku's `ALLOWED_ORIGINS` config var |
| License sync returns 404 | URL encoding issue | Fixed in licenseService.js - fingerprint is now URL-encoded |

#### Heroku Provisioning Server Config Vars

Required config vars on Heroku for slave communication:
- `SECRET_INTERNAL_API_KEY` - Must match slave's key
- `ALLOWED_ORIGINS` - Must include `https://192.168.1.14,http://192.168.1.14`

### Client Environment Variables

The React client requires environment variables for API communication.

**Development (`client/.env`):**
```
REACT_APP_API_URL=http://localhost:8004/api
REACT_APP_SOCKET_URL=http://localhost:8004
REACT_APP_ENCRYPTION_KEY=Mayday_ivr_encryption_block_key
```

**Production Build:**

For production, use `/api` (relative path) since nginx proxies API requests:

```bash
# SSH to server and rebuild client with production API URL
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'cd /home/medhi/Mayday_EC/client && export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && echo \"REACT_APP_API_URL=/api\" > .env && npm run build'"
```

**Important:** After rebuilding the client, users must **hard refresh** their browser (Cmd+Shift+R / Ctrl+Shift+R) to load the new JavaScript bundle.

**Troubleshooting API Calls:**

If the dashboard shows "No agents available" or API calls fail:
1. Check nginx access logs for requests missing `/api` prefix:
   ```bash
   sudo tail -50 /var/log/nginx/access.log | grep admin
   ```
2. If requests go to `/admin/all-agents` instead of `/api/admin/all-agents`, rebuild the client with correct `REACT_APP_API_URL=/api`
3. Verify the build has correct baseURL:
   ```bash
   grep -o 'baseURL:"[^"]*"' /home/medhi/Mayday_EC/client/build/static/js/main*.js
   ```

### Accessing the Dashboard

**URL**: https://192.168.1.14

Open your browser and navigate to `https://192.168.1.14` to access the Mayday CRM Dashboard.

**Default Login Credentials** (from .env):
- **Username**: admin
- **Password**: Pasword@256
- **Role**: superuser

### Server Information

| Setting | Value |
|---------|-------|
| **Server IP** | 192.168.1.14 |
| **Hostname** | mayday |
| **OS** | Debian 12 (bookworm) |
| **SSH User** | medhi |
| **SSH Key** | `~/.ssh/id_ed25519` |
| **Sudo Password** | Pasword@1759 |
| **Root Password** | Lotuskm@1759 |
| **Project Path** | `/home/medhi/Mayday_EC` |
| **Web URL** | http://192.168.1.14 |

### Installed Components

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | v18.20.8 | Installed via NVM at `/root/.nvm/versions/node/v18.20.8` |
| **PM2** | v6.0.14 | Process manager, runs as root |
| **nginx** | v1.22.1 | Reverse proxy on port 80 |
| **MariaDB** | 10.11+ | Database server |

### Important: Node.js via NVM

Node.js is installed via NVM for the root user. When running commands via SSH with sudo, you **must** source NVM first:

```bash
# Correct way to run node/npm/pm2 commands via SSH:
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && pm2 status'"

# This will NOT work (node not found):
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 "sudo pm2 status"
```

### Fresh Server Deployment

To deploy Mayday EC on a fresh Debian 12 server:

```bash
# 1. SSH to server
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14

# 2. Install Node.js 18.x (as root)
sudo su -
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 3. Install PM2 globally
npm install -g pm2

# 4. Install nginx
apt-get update && apt-get install -y nginx

# 5. Clone repository (as medhi user)
exit  # back to medhi
cd /home/medhi
git clone https://github.com/Dlu6/Mayday_EC.git
cd Mayday_EC
git checkout development

# 6. Install dependencies (as root for NVM access)
sudo su -
export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh
cd /home/medhi/Mayday_EC
npm install
cd client && npm install && npm run build && cd ..

# 7. Copy .env file from local machine (run from local)
scp -i ~/.ssh/id_ed25519 server/.env medhi@192.168.1.14:/home/medhi/Mayday_EC/server/.env

# 8. Update .env for production
sed -i 's/NODE_ENV=development/NODE_ENV=production/' /home/medhi/Mayday_EC/server/.env

# 9. Configure nginx
cat > /etc/nginx/sites-available/mayday << 'EOF'
server {
    listen 80;
    server_name 192.168.1.14;

    location / {
        root /home/medhi/Mayday_EC/client/build;
        index index.html;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:8004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8088/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }

    location /ari {
        proxy_pass http://127.0.0.1:8088/ari;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/mayday /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx && systemctl enable nginx

# 10. Start PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root
```

### Quick Deployment Commands

From your local machine, use these commands:

```bash
# Check PM2 status
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && pm2 status'"

# View PM2 logs
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && pm2 logs mayday --lines 50 --nostream'"

# Restart application
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && pm2 restart mayday'"

# Full deployment (git pull + build + restart)
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S bash -c 'export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh && cd /home/medhi/Mayday_EC && git pull origin development && npm install && cd client && npm install && npm run build && cd .. && pm2 restart mayday'"

# Check nginx status
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S systemctl status nginx"

# Restart nginx
ssh -i ~/.ssh/id_ed25519 medhi@192.168.1.14 \
  "echo 'Pasword@1759' | sudo -S systemctl restart nginx"
```

### Troubleshooting

#### Node/PM2 Command Not Found

If you get "command not found" for node, npm, or pm2:

```bash
# Always source NVM before running node commands:
export NVM_DIR=/root/.nvm && source /root/.nvm/nvm.sh
```

#### Permission Denied

If you get permission errors:

```bash
# Use sudo with password piped in:
echo 'Pasword@1759' | sudo -S <command>
```

#### nginx Configuration Test

```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload without restart
```

#### Check What's Running

```bash
# Check if backend is listening
netstat -tlnp | grep 8004

# Check nginx
systemctl status nginx

# Check PM2 processes
pm2 list
```

## Asterisk PJSIP Configuration

### Overview

Asterisk 20.12.0 is compiled from source at `/usr/src` and configured with PJSIP for WebRTC softphone support.

### Key Configuration Files

| File | Purpose |
|------|---------|
| `/etc/asterisk/pjsip.conf` | PJSIP transports, trunks, endpoints |
| `/etc/asterisk/http.conf` | HTTP/HTTPS server for WebSocket |
| `/etc/asterisk/extconfig.conf` | Realtime database mappings |
| `/etc/asterisk/sorcery.conf` | Sorcery wizard configuration |
| `/etc/asterisk/manager.conf` | AMI user configuration |
| `/etc/asterisk/extensions_mayday_context.conf` | Dialplan contexts |

### PJSIP Transport Configuration

```ini
# /etc/asterisk/pjsip.conf

[global]
type=global
user_agent=SIMI

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
local_net=192.168.1.0/24
external_media_address=102.214.151.191
external_signaling_address=102.214.151.191

[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0
```

### SIP Trunk Configuration (Cyber Innovative)

```ini
# /etc/asterisk/pjsip.conf (continued)

[Simi_Trunk_auth]
type=auth
auth_type=userpass
username=0320000010
password=Medhi#2025

[Simi_Trunk_aor]
type=aor
contact=sip:siptrunk.cyber-innovative.com:5060
qualify_frequency=60
max_contacts=1
remove_existing=yes

[Simi_Trunk]
type=endpoint
context=from-voip-provider
disallow=all
allow=ulaw,alaw
transport=transport-udp
auth=Simi_Trunk_auth
aors=Simi_Trunk_aor
send_pai=yes
send_rpid=yes
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
identify_by=username,ip

[Simi_Trunk_reg]
type=registration
outbound_auth=Simi_Trunk_auth
server_uri=sip:siptrunk.cyber-innovative.com
client_uri=sip:0320000010@siptrunk.cyber-innovative.com
contact_user=323300212
transport=transport-udp
retry_interval=60
expiration=3600
max_retries=10000
auth_rejection_permanent=no
line=yes
endpoint=Simi_Trunk

[Simi_Trunk_identify]
type=identify
endpoint=Simi_Trunk
match=41.77.78.155/29
match_header=To: .*<sip:.*@siptrunk.cyber-innovative.com>.*
```

### HTTP/WebSocket Configuration

```ini
# /etc/asterisk/http.conf

[general]
enabled=yes
servername=Asterisk
bindaddr=0.0.0.0
bindport=8088

tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.pem
tlsprivatekey=/etc/asterisk/keys/asterisk.key
tlscipher=ECDHE-RSA-AES128-GCM-SHA256
sessionlimit=250
session_inactivity=120
```

### Extconfig (Realtime Database Mappings)

```ini
# /etc/asterisk/extconfig.conf

[settings]
ps_endpoints => odbc,asterisk,ps_endpoints
ps_auths => odbc,asterisk,ps_auths
ps_aors => odbc,asterisk,ps_aors
ps_contacts => odbc,asterisk,ps_contacts
ps_domain_aliases => odbc,asterisk,ps_domain_aliases
voice_extensions => odbc,asterisk,voice_extensions
queues => odbc,asterisk,voice_queues
queue_members => odbc,asterisk,queue_members
cdr => odbc,asterisk,cdr
```

**Important**: Only ONE `[settings]` section should exist. Duplicate sections cause the second to be ignored.

### AMI Configuration

```ini
# /etc/asterisk/manager.conf

[general]
enabled = yes
webenabled = yes
port = 5038
bindaddr = 0.0.0.0

[mayday_ami_user]
secret = mayday_ami_password
deny = 0.0.0.0/0
permit = 127.0.0.1/255.255.255.255
permit = 192.168.1.0/255.255.255.0
permit = 192.168.1.14/255.255.255.255
read = system,call,log,verbose,agent,user,config,dtmf,reporting,cdr,dialplan,queue
write = system,call,queue,agent,originate
```

### Database Schema Fixes

The following schema changes are required for Asterisk 20 PJSIP realtime to work correctly:

```sql
-- ============================================
-- ps_aors table fixes
-- ============================================
-- Add missing columns for registration expiration control
ALTER TABLE ps_aors ADD COLUMN IF NOT EXISTS type VARCHAR(255) NOT NULL DEFAULT 'aor';
ALTER TABLE ps_aors ADD COLUMN IF NOT EXISTS minimum_expiration INT DEFAULT 60;
ALTER TABLE ps_aors ADD COLUMN IF NOT EXISTS maximum_expiration INT DEFAULT 7200;

-- ============================================
-- ps_contacts table fixes (CRITICAL)
-- ============================================
-- Asterisk sends 'true'/'false' for boolean fields, but ENUM only accepts 'yes'/'no'
-- This causes "Unable to bind contact to AOR" errors during registration
-- Change ENUM columns to VARCHAR to accept both formats:

ALTER TABLE ps_contacts MODIFY COLUMN qualify_2xx_only VARCHAR(10) DEFAULT 'no';
ALTER TABLE ps_contacts MODIFY COLUMN prune_on_boot VARCHAR(10) DEFAULT 'no';
ALTER TABLE ps_contacts MODIFY COLUMN authenticate_qualify VARCHAR(10) DEFAULT 'no';

-- Fix column name: Asterisk expects 'aor' not 'aors'
ALTER TABLE ps_contacts CHANGE COLUMN aors aor VARCHAR(255);

-- ============================================
-- ps_endpoints transport fix
-- ============================================
-- For on-prem non-NAT setups, use 'transport-ws' (plain WebSocket on port 8088)
-- NOT 'transport-wss' (secure WebSocket) which requires TLS certificates
UPDATE ps_endpoints SET transport='transport-ws' WHERE transport='transport-wss';
```

### Common PJSIP Registration Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Unable to bind contact to AOR` | ps_contacts ENUM columns reject 'true'/'false' values | Change ENUM to VARCHAR(10) |
| `Unable to retrieve PJSIP transport 'transport-wss'` | Endpoint uses transport-wss but it's not configured | Update endpoint to use transport-ws |
| `Unknown column 'minimum_expiration'` | Missing column in ps_aors | Add the column with ALTER TABLE |

### PM2 Auto-Restart After Asterisk Restart

A systemd drop-in is configured to restart PM2 when Asterisk restarts:

```ini
# /etc/systemd/system/asterisk.service.d/restart-pm2.conf

[Service]
ExecStartPost=/bin/bash -c "sleep 5 && pm2 restart mayday"
```

This ensures the AMI connection is re-established after Asterisk restarts.

### Static IP Configuration

The server is configured with a static IP in `/etc/network/interfaces`:

```ini
auto enp0s31f6
iface enp0s31f6 inet static
    address 192.168.1.14
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

### Useful Asterisk CLI Commands

```bash
# Check PJSIP registration status
asterisk -rx 'pjsip show registrations'

# Check endpoints
asterisk -rx 'pjsip show endpoints'

# Check contacts
asterisk -rx 'pjsip show contacts'

# Force re-registration
asterisk -rx 'pjsip send register Simi_Trunk_reg'

# Check AMI connected users
asterisk -rx 'manager show connected'

# Check HTTP/WebSocket status
asterisk -rx 'http show status'

# Enable SIP debugging
asterisk -rx 'pjsip set logger on'

# Reload PJSIP configuration
asterisk -rx 'pjsip reload'
```

### SIP Debugging with sngrep

sngrep is installed for SIP packet analysis:

```bash
# Capture all SIP traffic
sudo sngrep

# Capture traffic to/from specific host
sudo sngrep host siptrunk.cyber-innovative.com
```

### Trunk Provider Details

| Setting | Value |
|---------|-------|
| **Provider** | Cyber Innovative |
| **Server** | siptrunk.cyber-innovative.com |
| **Server IP** | 41.77.78.155 |
| **Account Username** | 0320000010 |
| **DID Number** | +256323300212 |
| **User Agent** | SIMI (required by provider) |
| **External IP** | 102.214.151.191 |

## Next Steps

### Immediate Tasks

1. ~~**Asterisk Configuration**: Configure AMI/ARI on on-prem server (192.168.1.14)~~ ✅ Complete
2. **Frontend Integration**: Connect SIP.js softphone to enhanced transfer API
3. **Transfer Testing**: Test blind and managed transfer scenarios
4. **User Interface**: Create transfer management UI components
5. **Test Softphone Login**: Register endpoint 1001 via WebSocket

### Future Enhancements

1. **Transfer Analytics**: Advanced reporting and metrics
2. **Queue Management**: Enhanced queue transfer capabilities
3. **Call Recording**: Integration with call recording system
4. ~~**SSL/HTTPS**: Configure SSL certificates for secure access~~ ✅ Complete

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
git add -f "release/5.1.5/latest.yml" "release/5.1.5/Mayday Appbar Setup 5.1.5.exe"
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
  "rm -f /var/www/html/downloads/latest.yml /var/www/html/downloads/'MaydayAppbar Setup'*.exe"

# Upload new version
scp -i ~/Downloads/MHU_Debian_Mumb.pem \
  "electron-softphone/release/5.1.5/latest.yml" \
  "electron-softphone/release/5.1.5/MaydayAppbar Setup 5.1.5.exe" \
  admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/

# Verify
curl -s http://192.168.1.14/downloads/latest.yml
```

**Quick Deploy from macOS (One-liner)**:
```bash
cd ~/Downloads/Mayday-CRM-Scracth && \
git pull origin feature/enhanced-transfer-system && \
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "rm -f /var/www/html/downloads/latest.yml /var/www/html/downloads/'MaydayAppbar Setup'*.exe" && \
scp -i ~/Downloads/MHU_Debian_Mumb.pem \
  "electron-softphone/release/5.1.5/latest.yml" \
  "electron-softphone/release/5.1.5/MaydayAppbar Setup 5.1.5.exe" \
  admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/ && \
curl -s http://192.168.1.14/downloads/latest.yml
```

#### Option B: Full Build and Deploy from macOS (No Native Module)

```bash
cd electron-softphone && \
npm run build && \
npm run electron:build:win && \
scp -i ~/Downloads/MHU_Debian_Mumb.pem \
  "release/X.X.X/latest.yml" \
  "release/X.X.X/MaydayAppbar Setup X.X.X.exe" \
  admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/ && \
curl -s http://192.168.1.14/downloads/latest.yml
```

⚠️ **Note**: Option B builds work but won't have the native appbar module - docked mode won't reserve screen space.

### Update Server Configuration

**Server URL**: `http://192.168.1.14/downloads/`

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
- `MaydayAppbar Setup X.X.X.exe` - The installer (~85 MB)
- `MaydayAppbar Setup X.X.X.exe.blockmap` - Delta updates (optional, only if differential packages enabled)

**Verify deployment**:
```bash
curl http://192.168.1.14/downloads/latest.yml
```

### Delete Old Versions from Server

To clean up old versions and free server space:

**Delete specific versions:**
```bash
ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
  "rm -f /var/www/html/downloads/'MaydayAppbar Setup 5.1.4.exe' \
         /var/www/html/downloads/'MaydayAppbar Setup 5.1.3.exe' \
         /var/www/html/downloads/'MaydayAppbar Setup 5.1.3.exe.blockmap'"
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
  "cd /var/www/html/downloads && rm -f 'MaydayAppbar Setup 5.0.'*.exe 'MaydayAppbar Setup 5.0.'*.blockmap"
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
- **Files**: http://192.168.1.14/downloads/latest.yml
- **Direct Download**: http://192.168.1.14/downloads/MHU%20Appbar%20Setup%205.1.5.exe
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
  - Fixed Windows auto-update "Mayday Appbar cannot be closed" error
  - Improved update installer to use silent mode and proper window cleanup
  - Added NSIS elevation and runAfterFinish options for smoother updates

## License-Based Feature Restriction System

### Overview

The Mayday platform implements a comprehensive license-based feature restriction system that controls access to UI components, routes, and menu items based on the organization's license plan.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         License Flow Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐  │
│  │  Mayday-Website │      │     On-Prem Server  │      │  Client Apps    │  │
│  │  (Master)       │─────▶│     (Slave)         │─────▶│                 │  │
│  │                 │ sync │                     │ API  │  - client/      │  │
│  │  License Mgmt   │      │  License Cache      │      │  - electron-    │  │
│  │  Provisioning   │      │  License Service    │      │    softphone/   │  │
│  └─────────────────┘      └─────────────────────┘      └─────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### License Plans and Features

| Plan | Features Included |
|------|-------------------|
| **Basic** | calls, recording, transfers, conferences, reports, crm |
| **Professional** | Basic + whatsapp, sms, video, voicemail, email, zoho, webrtc_extension |
| **Enterprise** | All features including salesforce, twilio, facebook, third_party_integrations |
| **Developer** | calls, reports, crm, zoho, third_party_integrations, webrtc_extension |

### Key Files

#### Client Application (`client/`)

| File | Purpose |
|------|---------|
| `src/utils/licenseFeatures.js` | Feature constants, validation utilities, route/menu filtering |
| `src/hooks/useLicense.js` | React hook for license state and feature checking |
| `src/components/common/FeatureGate.jsx` | Component for conditional rendering based on license |

#### Electron Softphone (`electron-softphone/`)

| File | Purpose |
|------|---------|
| `src/utils/licenseFeatures.js` | Shared feature definitions (copy from client) |
| `src/hooks/useLicense.js` | License hook with caching for electron app |
| `src/components/FeatureGate.jsx` | Feature gating component for electron |

### Feature Keys

```javascript
const FEATURE_KEYS = {
  CALLS: 'calls',
  RECORDING: 'recording',
  VOICEMAIL: 'voicemail',
  VIDEO: 'video',
  SMS: 'sms',
  TRANSFERS: 'transfers',
  CONFERENCES: 'conferences',
  REPORTS: 'reports',
  CRM: 'crm',
  WHATSAPP: 'whatsapp',
  SALESFORCE: 'salesforce',
  ZOHO: 'zoho',
  TWILIO: 'twilio',
  EMAIL: 'email',
  FACEBOOK: 'facebook',
  THIRD_PARTY_INTEGRATIONS: 'third_party_integrations',
  WEBRTC_EXTENSION: 'webrtc_extension',
};
```

### Usage Examples

#### 1. FeatureGate Component

```jsx
import FeatureGate from './components/common/FeatureGate';
import { FEATURE_KEYS } from './utils/licenseFeatures';

// Basic usage - renders children only if feature is enabled
<FeatureGate feature={FEATURE_KEYS.WHATSAPP}>
  <WhatsAppComponent />
</FeatureGate>

// With custom fallback
<FeatureGate 
  feature={FEATURE_KEYS.RECORDING} 
  fallback={<UpgradePrompt />}
>
  <RecordingComponent />
</FeatureGate>
```

#### 2. useLicense Hook

```jsx
import useLicense from './hooks/useLicense';

const MyComponent = () => {
  const { checkFeature, isLicensed, licenseInfo } = useLicense();
  
  if (!checkFeature('whatsapp')) {
    return <div>WhatsApp not available</div>;
  }
  
  return <WhatsAppComponent />;
};
```

#### 3. Route Filtering

```jsx
import { filterRoutesByLicense } from './utils/licenseFeatures';

const userRoutes = useMemo(() => {
  const baseRoutes = getUserRoutes(user);
  return filterRoutesByLicense(baseRoutes, license);
}, [user, license]);
```

### Route Feature Mappings

| Route | Required Feature |
|-------|------------------|
| `/voice/recordings` | recording |
| `/whatsapp` | whatsapp |
| `/analytics/reports` | reports |
| `/integrations/salesforceAccount` | salesforce |

### Menu Item Feature Mappings

| Menu Item ID | Required Feature |
|--------------|------------------|
| `whatsapp` | whatsapp |
| `reports` | reports |
| `transferHistory` | transfers |
| `callHistory` | calls |

### Visual Indicators

- **Locked menu items**: Dimmed (50% opacity) with lock icon overlay
- **Tooltip**: Shows "Feature requires a license upgrade"
- **Fallback UI**: Professional card with lock icon and upgrade prompt

### Unit Tests

Comprehensive unit tests are located at `client/src/utils/licenseFeatures.test.js`:

```bash
# Run license feature tests
cd client && npm test -- --testPathPattern="licenseFeatures.test.js" --watchAll=false
```

**Test Coverage:**
- Feature key constants validation
- Feature parsing (JSON string and object)
- Route accessibility checks
- Menu item accessibility checks
- License validity checks (active, expired, suspended)
- Development license detection
- Route and menu filtering

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

**Last Updated**: December 21, 2025  
**Development Status**: On-Prem Deployment ✅ Complete  
**Current Branch**: `development`  
**On-Prem Server**: 192.168.1.14 (Static IP, Node.js v18.20.8, PM2 v6.0.14, nginx, MariaDB, Asterisk 20.12.0)  
**Web Access**: https://192.168.1.14 (HTTPS with self-signed certificate)  
**Local Dev Server**: http://localhost:8004  
**GitHub Repo**: https://github.com/Dlu6/Mayday_EC.git  
**SIP Trunk**: Registered with siptrunk.cyber-innovative.com (+256323300212)

**Recent Updates (Dec 21, 2025)**:
- ✅ **License-Based Feature Restriction System**: Comprehensive licensing logic across client and electron-softphone
- ✅ **FeatureGate Component**: Conditional rendering based on license features with fallback UI
- ✅ **useLicense Hook**: React hook for license state management and feature checking
- ✅ **Route Filtering**: License-aware route filtering in Layout.js and getUserRoutes.js
- ✅ **Menu Filtering**: License-based menu item filtering with lock icons in electron-softphone Appbar
- ✅ **Unit Tests**: 51 comprehensive tests for license utilities (100% passing)
- ✅ **License Cache Management**: Cache cleared on logout for security

**Previous Updates (Dec 18, 2025)**:
- ✅ **HTTPS/SSL Configuration**: Self-signed certificate configured for secure access
- ✅ **Centralized Server Configuration**: Created `serverConfig.js` as single source of truth for IP/domain
- ✅ Removed all hardcoded domain references from codebase
- ✅ Updated CORS configuration to use `PUBLIC_IP` env variable dynamically
- ✅ All electron-softphone services now import from centralized config
- ✅ Nginx configured with SSL (HTTP redirects to HTTPS)
- ✅ Certificate stored at `/etc/nginx/ssl/nginx.crt`
- ✅ See "SSL/HTTPS Configuration" section for certificate management
- ✅ See "Server IP/Domain Configuration" section for how to change server IP
- ✅ **Asterisk WebSocket Configuration**: Configured PJSIP transports for WS/WSS
- ✅ **SIP Trunk Registration**: Configured and registered with Cyber Innovative
- ✅ **Database Schema Fixes**: Added missing columns to ps_aors and ps_contacts tables
- ✅ **AMI Configuration**: Fixed authentication and permissions
- ✅ **PM2 Auto-Restart**: Configured to restart after Asterisk restarts
- ✅ **Static IP**: Configured server with static IP 192.168.1.14
- ✅ **Removed MongoDB**: Removed all MongoDB dependencies from usersController.js

## Troubleshooting & Known Issues History

### 1. Missed Call Bug (Resolved Jan 2026)

**Issue**: Outbound calls answered by the recipient were incorrectly appearing as "Missed" in Call History.

**Root Cause**:
A race condition existed between two AMI event handlers in `server/services/callMonitoringService.js`:
- `handleCdr()`: Processes Asterisk's native `Cdr` event (Authoritative).
- `handleHangup()`: Processes `Hangup` event (Custom logic).

Since `handleHangup` often triggered first or concurrently, it overwrote the authoritative `disposition` with "NORMAL" and calculated `billsec` manually. If `cdrRecord.answer` timestamp was missing (due to timing), `billsec` became 0.
The `cdrController` then classified `disposition="NORMAL"` + `billsec=0` as "Missed".

**Fix**:
- **Preserve Data**: Modified `callMonitoringService.js` to only update `disposition` and `billsec` in `handleHangup` if they are not already set to "ANSWERED"/valid values.
- **Status Logic**: Updated `cdrController.js` to treat `disposition="NORMAL"` with `billsec > 0` as Completed.

### 2. Direction Display Bug (Resolved Jan 2026)

**Issue**: Inbound calls from external numbers were consistently displaying as "Outgoing".

**Root Cause**:
- **Unreliable Detection**: The system relied on matching channel names (`PJSIP/xxxx-`) to determine direction.
- **Race Condition**: `handleHangup` created the initial CDR record with this flawed logic, often incorrectly marking it "Outbound" before `handleCdr` could correct it.
- **Regex Failure**: Telephony numbers often contain non-digits (e.g. `+256...`) which caused simple regex checks (`^\d+$`) to fail.

**Fix**:
- **Robust Pattern Matching**: Replaced channel-based logic with Phone Number Pattern Matching in both `callMonitoringService.js` and `cdrController.js`.
  - **External**: 7+ digits (stripping non-digits)
  - **Extension**: 3-4 digits
- **Logic**: If `Src` is External AND `Dst` is Extension → **Inbound**.
- **Consistency**: Applied this logic to both `handleCdr` and `handleHangup` handlers to ensure consistency regardless of which event processes first.
