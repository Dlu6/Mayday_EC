# Windows Build Instructions for MHU Appbar

This document explains how to build the Electron softphone on Windows to include the native AppBar module that reserves screen space at the OS level.

## Why Build on Windows?

The native `win-appbar` module uses Windows Shell APIs (`SHAppBarMessage`) to register the app as a system appbar, similar to the Windows taskbar. This allows the docked appbar to **reserve screen space** so other applications don't overlap with it.

Building on macOS cannot compile the Windows native module (`.node` file), so the app falls back to a mode that positions the window on top but doesn't reserve screen space - causing other apps' title bars to be hidden behind the appbar.

## Prerequisites

Install the following on your Windows PC:

1. **Node.js** (v16 or higher)
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

## Build Steps

### Step 1: Clone/Pull the Repository

```powershell
# If cloning fresh:
git clone <repository-url>
cd Mayday-CRM-Scracth/electron-softphone

# If pulling updates:
cd Mayday-CRM-Scracth
git pull origin feature/enhanced-transfer-system
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
dir native\win-appbar\build\Release\
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

```powershell
npm run build
npm run electron:build:win
```

This creates the installer in `release\5.1.5\`:
- `MHU Appbar Setup 5.1.5.exe` - Windows installer
- `latest.yml` - Version metadata for auto-updater

### Step 5: Upload to Server

Upload the built files to the server:

```powershell
# Using SCP (if you have SSH access configured)
scp -i "path\to\MHU_Debian_Mumb.pem" ^
  "release\5.1.5\latest.yml" ^
  "release\5.1.5\MHU Appbar Setup 5.1.5.exe" ^
  admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/

# Or use WinSCP/FileZilla to upload manually
```

### Step 6: Verify Deployment

```powershell
curl https://mhuhelpline.com/downloads/latest.yml
```

## Troubleshooting

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

The app is still running. Close all instances of MHU Appbar before installing.

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

## Cross-Platform Workflow: Build on Windows, Deploy from macOS

Since SSH/SCP may not work reliably from Windows IDEs, use this workflow:

### On Windows: Build and Commit

1. **Build the application** (Steps 1-4 above)
2. **Commit build files to GitHub**:
   ```powershell
   cd Mayday-CRM-Scracth\electron-softphone
   git add -f "release/5.1.5/latest.yml" "release/5.1.5/MHU Appbar Setup 5.1.5.exe"
   git commit -m "Add Windows build v5.1.5 with native appbar module"
   git push origin feature/enhanced-transfer-system
   ```

### On macOS: Pull and Deploy

1. **Pull the Windows build**:
   ```bash
   cd ~/Downloads/Mayday-CRM-Scracth
   git pull origin feature/enhanced-transfer-system
   ```

2. **Delete previous version from server**:
   ```bash
   ssh -i ~/Downloads/MHU_Debian_Mumb.pem admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com \
     "rm -f /var/www/html/downloads/latest.yml /var/www/html/downloads/'MHU Appbar Setup'*.exe"
   ```

3. **Upload new version to server**:
   ```bash
   scp -i ~/Downloads/MHU_Debian_Mumb.pem \
     "electron-softphone/release/5.1.5/latest.yml" \
     "electron-softphone/release/5.1.5/MHU Appbar Setup 5.1.5.exe" \
     admin@ec2-65-1-149-92.ap-south-1.compute.amazonaws.com:/var/www/html/downloads/
   ```

4. **Verify deployment**:
   ```bash
   curl -s https://mhuhelpline.com/downloads/latest.yml
   ```

### Quick Deploy from macOS (One-liner)

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

## Current Version

- **Version**: 5.1.5
- **Changes in this version**:
  - Restored native title bar when NOT docked
  - Removed custom window controls (using native title bar)
  - Native module properly reserves screen space when docked
- **Build Location**: `electron-softphone/release/5.1.5/` (committed to GitHub)
