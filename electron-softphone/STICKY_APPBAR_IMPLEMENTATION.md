# Windows Sticky Appbar Implementation

## Overview

This implementation adds a toggle switch to the Electron softphone Appbar that transforms the application into a persistent, system-level top bar when activated. The feature uses Windows Shell AppBar APIs to properly reserve screen space at the operating system level.

## Features

- **System-Level Screen Space Reservation**: When enabled with the native module, the appbar reserves screen space like the Windows taskbar
- **Windows Snap Support**: Other windows maximized or snapped will avoid the appbar area
- **Multi-Monitor Support**: Automatically adjusts position based on the current monitor
- **DPI Scaling Support**: Handles various display scaling levels
- **Virtual Desktop Support**: Visible on all virtual desktops
- **Graceful Fallback**: Works without native module (uses always-on-top mode)

## Architecture

### Components

1. **Native C++ Module** (`native/win-appbar/`)
   - `src/win_appbar.cpp`: Windows Shell AppBar API implementation
   - `binding.gyp`: Node-gyp build configuration
   - `lib/index.js`: JavaScript wrapper for the native module

2. **Electron Main Process** (`electron/`)
   - `appbarManager.js`: Manages appbar registration and window transformations
   - `main.js`: Integrates appbar manager with app lifecycle

3. **Renderer Process** (`src/`)
   - `services/stickyAppbarService.js`: IPC communication service
   - `hooks/useStickyAppbar.js`: React hook for UI integration
   - `components/Appbar.jsx`: Toggle switch UI

## Windows AppBar API

The native module uses these Windows Shell functions:

- `SHAppBarMessage(ABM_NEW, ...)`: Register as an AppBar
- `SHAppBarMessage(ABM_QUERYPOS, ...)`: Query available position
- `SHAppBarMessage(ABM_SETPOS, ...)`: Set and reserve the position
- `SHAppBarMessage(ABM_REMOVE, ...)`: Unregister the AppBar

## Building the Native Module

### Prerequisites

- Visual Studio 2019/2022 with C++ workload
- Node.js 16+
- node-gyp (`npm install -g node-gyp`)
- Python 3.x

### Build Commands

```bash
# Full build (runs automatically on npm install)
npm run build:native

# Rebuild only
npm run rebuild:native

# Manual build from native module directory
cd native/win-appbar
npm install
npm run build
```

## Usage

### Toggle Switch

The sticky appbar toggle appears in the Appbar toolbar (next to the collapse toggle) when running in Electron on Windows. The toggle shows:

- **"Dock"** label when disabled
- **"STICKY"** label when enabled
- Orange color when native module is available (true screen space reservation)
- Yellow color when using fallback mode (always-on-top only)

### Programmatic Control

```javascript
import { stickyAppbarService } from '../services/stickyAppbarService';

// Enable sticky mode
await stickyAppbarService.enable({ height: 56, edge: 'top' });

// Disable sticky mode
await stickyAppbarService.disable();

// Toggle
await stickyAppbarService.toggle();

// Check state
const state = stickyAppbarService.getCurrentState();
console.log(state.isEnabled, state.isNativeAvailable);
```

### React Hook

```javascript
import { useStickyAppbar } from '../hooks/useStickyAppbar';

function MyComponent() {
  const {
    isEnabled,
    isLoading,
    isAvailable,
    isNativeAvailable,
    toggle,
    enable,
    disable
  } = useStickyAppbar({ height: 56, edge: 'top' });

  return (
    <button onClick={toggle} disabled={isLoading}>
      {isEnabled ? 'Disable' : 'Enable'} Sticky Mode
    </button>
  );
}
```

## Behavior

### When Enabled

1. Window is resized to appbar dimensions (full screen width, 56px height)
2. Window is positioned at the top of the screen
3. Screen space is reserved (native mode) or window set to always-on-top (fallback)
4. Window becomes non-resizable and non-movable
5. Window is visible on all virtual desktops

### When Disabled

1. AppBar is unregistered from Windows Shell
2. Original window size and position are restored
3. Window properties (resizable, movable) are restored
4. Window is removed from always-on-top and visible-on-all-workspaces

### Cleanup

- Automatic cleanup when toggled off
- Automatic cleanup when application closes
- Handles `window-all-closed` and `before-quit` events

## Configuration

Configuration is centralized in `src/config/appbarConfig.js`:

```javascript
export const APPBAR_CONFIG = {
  height: 90,        // Total reserved screen space at the top
  edge: 'top',       // 'top' or 'bottom'
  toolbarHeight: 48, // Visual height of toolbar content
  bottomPadding: 4   // Bottom border/padding
};
```

The same values are mirrored in `electron/appbarManager.js` for the main process.

## Troubleshooting

### Native Module Not Loading

1. Ensure Visual Studio C++ workload is installed
2. Run `npm run rebuild:native`
3. Check console for build errors

### AppBar Not Reserving Space

1. Verify native module is loaded (check console logs)
2. Ensure running as administrator if needed
3. Check for conflicts with other appbars

### Display Issues

1. Check DPI scaling settings
2. Try restarting the application
3. Verify monitor configuration

## Files Modified/Created

### New Files
- `native/win-appbar/src/win_appbar.cpp`
- `native/win-appbar/binding.gyp`
- `native/win-appbar/package.json`
- `native/win-appbar/lib/index.js`
- `electron/appbarManager.js`
- `src/services/stickyAppbarService.js`
- `src/hooks/useStickyAppbar.js`

### Modified Files
- `electron/main.js` - Added appbar manager integration
- `src/components/Appbar.jsx` - Added toggle switch UI
- `package.json` - Added build scripts
- `electron-builder.json` - Added native module packaging

## Testing

1. Start the application: `npm run electron:dev`
2. Log in and navigate to the Appbar view
3. Look for the "Dock" toggle switch next to the collapse toggle
4. Click to enable sticky mode
5. Verify:
   - Window docks to top of screen
   - Other windows avoid the appbar area when maximized
   - Windows Snap respects the reserved space
6. Toggle off to restore normal window behavior

## Known Limitations

- Only works on Windows (graceful no-op on other platforms)
- Requires native module build for true screen space reservation
- Single monitor primary support (multi-monitor follows window)
