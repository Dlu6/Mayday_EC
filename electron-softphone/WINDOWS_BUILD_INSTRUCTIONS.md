# Windows Build Instructions for Mayday Appbar

This document explains how to build the Electron softphone on Windows to include the native AppBar module that reserves screen space at the OS level.

## Why Build on Windows?

The native `win-appbar` module uses Windows Shell APIs (`SHAppBarMessage`) to register the app as a system appbar, similar to the Windows taskbar. This allows the docked appbar to **reserve screen space** so other applications don't overlap with it.

Building on macOS cannot compile the Windows native module (`.node` file), so the app falls back to a mode that positions the window on top but doesn't reserve screen space - causing other apps' title bars to be hidden behind the appbar.

## Prerequisites

Install the following on your Windows PC:

1. **Node.js** (v18 or higher, tested with v24.12.0)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Git**
   - Download from: https://git-scm.com/download/win
   - Verify: `git --version`

3. **Visual Studio Build Tools** (for compiling native modules)
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - During installation, select **"Desktop development with C++"**
   - This provides `node-gyp` with the necessary compilers

4. **Python** (required by node-gyp)
   - Usually included with Node.js installer
   - Or download from: https://www.python.org/downloads/
   - Verify: `python --version`

## Quick Start (TL;DR)

```powershell
# Navigate to electron-softphone directory
cd Mayday_EC\electron-softphone

# Install dependencies (also builds native modules)
npm install

# Build Windows installer (uses electron-builder.json config)
npx electron-builder --win -c electron-builder.json

# Output: release\Appbar Setup 5.1.5.exe
```

## Build Steps (Detailed)

### Step 1: Clone/Pull the Repository

```powershell
# If cloning fresh:
git clone https://github.com/Dlu6/Mayday_EC.git
cd Mayday_EC
git checkout development
cd electron-softphone

# If pulling updates:
cd Mayday_EC
git pull origin development
cd electron-softphone
```

### Step 2: Install Dependencies

```powershell
npm install
```

This will:
- Install all npm dependencies
- Automatically run `electron-builder install-app-deps` (rebuilds native modules for Electron)
- Automatically run `npm run build:native` (builds the win-appbar native module)

### Step 3: Verify Native Module Built

Check that the native module was compiled:

```powershell
Test-Path "native\win-appbar\build\Release\win_appbar.node"
# Should return: True
```

You should see `win_appbar.node` file (~150KB).

If the native module didn't build, manually build it:

```powershell
cd native\win-appbar
npm install
npm run build
cd ..\..
```

### Step 4: Build the Application

**Recommended method** (uses `electron-builder.json` with code signing disabled):

```powershell
npx electron-builder --win -c electron-builder.json
```

**Alternative** (uses package.json config):

```powershell
npm run build
npm run electron:build:win
```

> **Note**: The `electron-builder.json` config has `signAndEditExecutable: false` and `forceCodeSigning: false` set, which bypasses Windows code signing. If you have a code signing certificate, you can remove these settings.

### Build Output

The build creates files in `release\`:

| File | Size | Description |
|------|------|-------------|
| `Appbar Setup 5.1.5.exe` | ~82 MB | Windows NSIS installer |
| `latest.yml` | ~340 B | Auto-update manifest |
| `win-unpacked\` | ~210 MB | Unpacked app (for testing) |

### Step 5: Upload to Server

Upload the built files to the on-prem server for auto-updates:

```powershell
# Using SCP (if you have SSH access configured)
scp -i "path\to\ssh_key" `
  "release\Appbar Setup 5.1.5.exe" `
  "release\latest.yml" `
  medhi@192.168.1.14:/var/www/html/downloads/

# Or use WinSCP/FileZilla to upload manually to:
# Server: 192.168.1.14
# Path: /var/www/html/downloads/
```

### Step 6: Verify Deployment

```powershell
curl http://192.168.1.14/downloads/latest.yml
```

## Code Signing

By default, this build is configured **without code signing**. This means:
- Windows will show "Unknown publisher" warning when users install
- Windows SmartScreen may block the first installation

### To disable code signing (default):

The `electron-builder.json` already contains:
```json
"win": {
  "signAndEditExecutable": false,
  "forceCodeSigning": false
}
```

### To enable code signing:

1. Obtain a Windows code signing certificate (.pfx file)
2. Set environment variables:
   ```powershell
   $env:CSC_LINK="path\to\certificate.pfx"
   $env:CSC_KEY_PASSWORD="your-certificate-password"
   ```
3. Remove `signAndEditExecutable` and `forceCodeSigning` from config
4. Run the build

## Troubleshooting

### "Code signing failed" / "winCodeSign" errors

This happens when electron-builder tries to sign the executable but no certificate is available.

**Solution**: Ensure `electron-builder.json` has:
```json
"win": {
  "signAndEditExecutable": false,
  "forceCodeSigning": false
}
```

Then use the config explicitly:
```powershell
npx electron-builder --win -c electron-builder.json
```

### "'cross-env' is not recognized"

The `cross-env` package is not installed globally.

**Solution**: Run `npm install` first, which installs it as a dev dependency.

### "node-gyp rebuild failed"

1. Ensure Visual Studio Build Tools are installed with C++ workload
2. Run: `npm config set msvs_version 2022` (or your VS version)
3. Try: `npm install --global windows-build-tools` (run as Administrator)

### "Cannot find module 'win_appbar.node'"

The native module didn't compile. Check:
1. You're on Windows (not WSL)
2. Visual Studio Build Tools are installed
3. Run `cd native\win-appbar && npm run build` manually

### "Failed to uninstall old application files"

The app is still running. Close all instances of Mayday Appbar before installing.

### Build output in wrong folder

If using `npm run electron:build:win`, output goes to `release\5.1.5\`.
If using `npx electron-builder --win -c electron-builder.json`, output goes to `release\`.

## What the Native Module Does

When the native module is available:
1. Registers the window with Windows Shell as an AppBar
2. Reserves screen space at the top (other windows won't overlap)
3. Removes the window frame/title bar when docked
4. Properly unregisters when undocking or closing

Without the native module (fallback mode):
1. Positions window at top with `alwaysOnTop`
2. Does NOT reserve screen space (other apps overlap)
3. Uses Electron APIs to hide frame (less reliable)

## Configuration Files

### electron-builder.json

Primary build config with code signing disabled:

```json
{
  "appId": "com.mayday.appbar",
  "productName": "Appbar",
  "directories": { "output": "release/" },
  "win": {
    "target": ["nsis"],
    "icon": "build/mayday_app_icon.ico",
    "signAndEditExecutable": false,
    "forceCodeSigning": false
  },
  "nsis": { ... },
  "publish": {
    "provider": "generic",
    "url": "http://192.168.1.14/downloads/"
  }
}
```

### package.json (build section)

Alternative config used by `npm run electron:build:win`.

## Server Deployment (192.168.1.14)

After building on Windows and pushing to GitHub, deploy to the on-prem server:

### Step 1: SSH to Server

```bash
ssh medhi@192.168.1.14
# Password: (your password)
sudo -i
```

### Step 2: Fix DNS (if git pull fails with "Could not resolve host")

If DNS resolution fails, add Google DNS:

```bash
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
```

> **Note**: DNS issues can also cause SIP trunk registration failures. If trunks weren't registering, adding Google DNS may fix both git and SIP!

### Step 3: Pull Latest Code

```bash
cd /home/medhi/Mayday_EC
git pull origin development
```

### Step 4: Copy Build Files to Nginx

```bash
mkdir -p /var/www/html/downloads
cp "electron-softphone/release/Appbar Setup 5.1.5.exe" /var/www/html/downloads/
cp electron-softphone/release/latest.yml /var/www/html/downloads/
```

### Step 5: Configure Nginx (First Time Only)

If `/downloads` returns HTML instead of files, add this location block to nginx:

```bash
# Add to /etc/nginx/sites-available/mayday inside the server block:
location /downloads {
    alias /var/www/html/downloads;
    autoindex on;
    add_header Access-Control-Allow-Origin *;
}

# Test and reload nginx
nginx -t && systemctl reload nginx
```

### Step 6: Verify Deployment

```bash
curl -s http://localhost/downloads/latest.yml
# Should show version info with releaseDate
```

## Cross-Platform Workflow: Build on Windows, Deploy via Git

### On Windows: Build and Commit

1. **Build the application** (Steps 1-4 above)
2. **Commit build files to GitHub**:
   ```powershell
   cd Mayday_EC\electron-softphone
   git add -f "release/latest.yml" "release/Appbar Setup 5.1.5.exe"
   git commit -m "Add Windows build v5.1.5 with native appbar module"
   git push origin development
   ```

### On Server: Pull and Deploy

```bash
ssh medhi@192.168.1.14
sudo -i
cd /home/medhi/Mayday_EC
git pull origin development
cp "electron-softphone/release/Appbar Setup 5.1.5.exe" /var/www/html/downloads/
cp electron-softphone/release/latest.yml /var/www/html/downloads/
curl -s http://localhost/downloads/latest.yml
```

## Current Version

- **Version**: 5.1.5
- **Build Date**: January 2026
- **Node.js**: Tested with v24.12.0
- **Electron**: 25.9.8
- **electron-builder**: 25.1.8
- **Changes in this version**:
  - Restored native title bar when NOT docked
  - Removed custom window controls (using native title bar)
  - Native module properly reserves screen space when docked
  - Code signing disabled for easier builds
- **Build Location**: `electron-softphone/release/`
- **Deploy Location**: `/var/www/html/downloads/` on 192.168.1.14

