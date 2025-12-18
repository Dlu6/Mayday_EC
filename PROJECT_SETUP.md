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

### On-Prem Server Requirements (192.168.1.14)

- Debian/Ubuntu server with Asterisk
- Node.js 18.x
- PM2 for process management
- MariaDB 10.11+
- SSH user: `medhi`

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

### Accessing the Dashboard

**URL**: http://192.168.1.14

Open your browser and navigate to `http://192.168.1.14` to access the Mayday CRM Dashboard.

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

## Next Steps

### Immediate Tasks

1. **Asterisk Configuration**: Configure AMI/ARI on on-prem server (192.168.1.14)
2. **Frontend Integration**: Connect SIP.js softphone to enhanced transfer API
3. **Transfer Testing**: Test blind and managed transfer scenarios
4. **User Interface**: Create transfer management UI components

### Future Enhancements

1. **Transfer Analytics**: Advanced reporting and metrics
2. **Queue Management**: Enhanced queue transfer capabilities
3. **Call Recording**: Integration with call recording system
4. **SSL/HTTPS**: Configure SSL certificates for secure access

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
curl -s http://192.168.1.14/downloads/latest.yml
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
curl -s http://192.168.1.14/downloads/latest.yml
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
- `MHU Appbar Setup X.X.X.exe` - The installer (~85 MB)
- `MHU Appbar Setup X.X.X.exe.blockmap` - Delta updates (optional, only if differential packages enabled)

**Verify deployment**:
```bash
curl http://192.168.1.14/downloads/latest.yml
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

**Last Updated**: December 18, 2025  
**Development Status**: On-Prem Deployment ✅ Complete  
**Current Branch**: `development`  
**On-Prem Server**: 192.168.1.14 (Node.js v18.20.8, PM2 v6.0.14, nginx, MariaDB configured)  
**Web Access**: http://192.168.1.14  
**Local Dev Server**: http://localhost:8004  
**GitHub Repo**: https://github.com/Dlu6/Mayday_EC.git  

**Recent Updates (Dec 18, 2025)**:
- ✅ **Centralized Server Configuration**: Created `serverConfig.js` as single source of truth for IP/domain
- ✅ Removed all hardcoded domain references from codebase
- ✅ Updated CORS configuration to use `PUBLIC_IP` env variable dynamically
- ✅ All electron-softphone services now import from centralized config
- ✅ Fixed WebRTC certificate paths to use local Asterisk certificates
- ✅ Client and server rebuilt and deployed successfully
- ✅ Login API working correctly with admin credentials
- ✅ See "Server IP/Domain Configuration" section above for how to change server IP
