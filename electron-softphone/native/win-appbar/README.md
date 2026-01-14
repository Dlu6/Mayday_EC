# Windows AppBar Native Module

A native Node.js addon that provides Windows Shell AppBar functionality for Electron applications. This allows the app to reserve screen space at the OS level, similar to the Windows taskbar.

## What is Docking?

**Docking** transforms the Electron app into a persistent system-level top bar:

| State | Behavior |
|-------|----------|
| **Docked** | App becomes a 45px bar at the top of the screen. Windows reserves this space at the OS level, so other apps maximize *below* the bar, not behind it. Only essential controls are shown (logout, incoming call buttons). |
| **Undocked** | Normal window behavior. Full application window with title bar and side navigation. |

### How It Works

1. **Toggle to Dock**: User clicks the "Dock" switch in the app
2. **Screen Space Reserved**: Windows Shell API (`SHAppBarMessage`) reserves 90px at the top
3. **Window Resized**: Electron window shrinks to only show the Appbar component
4. **Title Bar Removed**: Native `SetWindowLong` removes the window frame
5. **Other Apps Adjust**: Maximizing Chrome, VS Code, etc. will fill the screen *below* the appbar

### Visual Example

**Normal Mode:**
```
┌─────────────────────────────────────────┐ ← Screen top
│  [≡] [🔄] [Dock] [📞 Enter number...]   │ ← Full Appbar with navigation
├─────────────────────────────────────────┤
│                                         │
│         Other Applications              │
│                                         │
└─────────────────────────────────────────┘ ← Screen bottom
```

**Docked/Sticky Mode (45px):**
```
┌─────────────────────────────────────────┐ ← Screen top
│ [🚪] [STICKY] [📞 Enter number...]      │ ← Compact bar (logout + phone only)
├─────────────────────────────────────────┤
│                                         │
│    Other Applications maximize here     │ ← Reserved work area
│                                         │
└─────────────────────────────────────────┘ ← Screen bottom
```

**Incoming Call in Docked Mode:**
```
┌─────────────────────────────────────────┐ ← Screen top
│ [🚪] [CallerID] [✅] [❌] [STICKY]...   │ ← Animated answer/reject buttons
└─────────────────────────────────────────┘
```

## Features

- Register window as a Windows AppBar (reserves screen space)
- Support for all edges (top, bottom, left, right)
- DPI scaling support
- Multi-monitor support
- Frameless window mode (removes title bar when docked)
- Proper cleanup on app exit (releases reserved space)
- Handles maximized/fullscreen windows before docking

## Prerequisites

Before building this module, ensure you have the following installed:

### 1. Node.js (v16 or higher)
Download from: https://nodejs.org/

### 2. Python (v3.x)
Download from: https://www.python.org/downloads/
- During installation, check "Add Python to PATH"

### 3. Visual Studio Build Tools
Download Visual Studio 2022 Community or Build Tools from:
https://visualstudio.microsoft.com/downloads/

During installation, select:
- **"Desktop development with C++"** workload
- Windows 10/11 SDK (latest version)

### 4. node-gyp (installed automatically)
```bash
npm install -g node-gyp
```

## Build Instructions

### Option 1: Automatic (Recommended)
From the main project root (`electron-softphone/`):
```bash
npm install
```
This automatically runs `postinstall` which builds the native module.

### Option 2: Manual Build
From the main project root:
```bash
npm run build:native
```

Or from this directory (`native/win-appbar/`):
```bash
npm install
npm run build
```

### Option 3: Rebuild Only (after code changes)
From the main project root:
```bash
npm run rebuild:native
```

Or from this directory:
```bash
npm run build
```

## Troubleshooting

### Error: "EPERM: operation not permitted, unlink '...win_appbar.node'"
The Electron app is still running and has the module loaded. Close the app first, then rebuild.

### Error: "gyp ERR! find VS"
Visual Studio Build Tools not found. Install Visual Studio 2022 with C++ workload.

### Error: "gyp ERR! find Python"
Python not found. Install Python 3.x and ensure it's in your PATH.

### Error: "Cannot find module '../build/Release/win_appbar.node'"
The native module hasn't been built. Run `npm run build:native` from the project root.

## API Reference

### `registerAppBar(hwndBuffer, height, edge)`
Registers a window as a Windows AppBar.
- `hwndBuffer`: Native window handle buffer from Electron
- `height`: Height in pixels (for top/bottom edge)
- `edge`: Edge constant (Edge.TOP, Edge.BOTTOM, Edge.LEFT, Edge.RIGHT)
- Returns: `{ success, left, top, width, height, dpiScale }`

### `unregisterAppBar(hwndBuffer)`
Unregisters a window from AppBar and releases reserved screen space.
- Returns: `boolean`

### `setFrameless(hwndBuffer, frameless)`
Removes or restores the window frame/title bar.
- `frameless`: `true` to remove frame, `false` to restore
- Returns: `boolean`

### `cleanupAllAppBars()`
Unregisters all AppBars. Call on app exit.
- Returns: `boolean`

### `isAvailable()`
Checks if the native module is loaded and available.
- Returns: `boolean`

## Files Structure

```
native/win-appbar/
├── src/
│   └── win_appbar.cpp    # C++ implementation
├── lib/
│   └── index.js          # JavaScript wrapper
├── binding.gyp           # node-gyp build configuration
├── package.json          # Module metadata
└── README.md             # This file
```

## Build Artifacts (not in git)

```
native/win-appbar/
├── build/                # Compiled output (gitignored)
│   └── Release/
│       └── win_appbar.node
└── node_modules/         # Dependencies (gitignored)
```

## Configuration

The appbar height and behavior is configured in two places (must be kept in sync):

| File | Purpose |
|------|---------|
| `src/config/appbarConfig.js` | Renderer process (React components) |
| `electron/appbarManager.js` | Main process (Electron/native) |

```javascript
const APPBAR_CONFIG = {
  height: 45,        // Total reserved screen space (pixels)
  edge: 'top',       // 'top' or 'bottom'
  toolbarHeight: 48, // Visual toolbar height
  bottomPadding: 4   // Bottom padding/border
};
```

## Integration with Electron

This native module is used by `electron/appbarManager.js` which handles:

1. **Window state management** - Saves/restores original window size and position
2. **Maximized window handling** - Unmaximizes before docking, re-maximizes on undock
3. **Cleanup on exit** - Ensures `ABM_REMOVE` is called to release screen space
4. **IPC handlers** - Exposes `appbar:enable`, `appbar:disable`, `appbar:toggle` to renderer

## Related Files

| File | Description |
|------|-------------|
| `electron/appbarManager.js` | Main process manager |
| `src/services/stickyAppbarService.js` | Renderer IPC service |
| `src/hooks/useStickyAppbar.js` | React hook |
| `src/components/Appbar.jsx` | UI toggle switch |
| `src/config/appbarConfig.js` | Renderer config |
| `STICKY_APPBAR_IMPLEMENTATION.md` | Full implementation docs |
