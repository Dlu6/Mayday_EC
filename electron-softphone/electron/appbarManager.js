// appbarManager.js - Manages the sticky appbar functionality in Electron main process
// Handles registration with Windows AppBar APIs and window transformations

const { ipcMain, screen, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');

// Try to load the native module
let winAppbar = null;
let nativeModuleAvailable = false;

if (os.platform() === 'win32') {
  try {
    winAppbar = require('../native/win-appbar/lib/index.js');
    nativeModuleAvailable = winAppbar.isAvailable();
    console.log('[appbarManager] Native module available:', nativeModuleAvailable);
  } catch (err) {
    console.warn('[appbarManager] Failed to load native module:', err.message);
  }
}

// Base height in CSS/logical pixels - must match renderer config (appbarConfig.js)
// Renderer uses: toolbarHeight (48) + bottomPadding (4) = 52 CSS pixels
const BASE_HEIGHT_CSS = 52;

/**
 * Calculate the physical pixel height for the appbar window
 * Main process works with physical pixels, so we scale by DPI
 */
function calculateAppbarHeight() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor || 1;
  // Convert CSS pixels to physical pixels for window bounds
  return Math.round(BASE_HEIGHT_CSS * scaleFactor);
}

// Global appbar configuration
const APPBAR_CONFIG = {
  get height() {
    return calculateAppbarHeight();
  },
  edge: 'top',
  baseHeightCSS: BASE_HEIGHT_CSS // For reference
};

// State tracking
const appbarState = {
  isEnabled: false,
  originalBounds: null,
  originalResizable: true,
  originalMovable: true,
  originalMinimizable: true,
  originalMaximizable: true,
  originalFullScreenable: true,
  originalFrame: true,
  wasMaximized: false,
  height: null, // Set dynamically when docking
  edge: APPBAR_CONFIG.edge,
  windowRef: null,
  hwndBuffer: null,
  closeHandler: null
};

// Get default appbar height (DPI-scaled physical pixels)
function getDefaultAppbarHeight() {
  return calculateAppbarHeight();
}

/**
 * Get the native window handle buffer for Electron BrowserWindow
 */
function getNativeWindowHandle(win) {
  if (!win || win.isDestroyed()) {
    return null;
  }
  
  try {
    const handle = win.getNativeWindowHandle();
    return handle;
  } catch (err) {
    console.error('[appbarManager] Failed to get native window handle:', err);
    return null;
  }
}

/**
 * Enable sticky appbar mode
 * Registers the window with Windows Shell as an AppBar
 */
function enableStickyAppbar(win, options = {}) {
  if (!win || win.isDestroyed()) {
    console.error('[appbarManager] Invalid window');
    return { success: false, error: 'Invalid window' };
  }
  
  const height = options.height || getDefaultAppbarHeight();
  const edge = options.edge || 'top';
  
  console.log('[appbarManager] Enabling sticky appbar, height:', height, 'edge:', edge);
  
  // CRITICAL: Check if window is maximized or fullscreen and restore it first
  // setBounds() doesn't work properly on maximized windows
  const wasMaximized = win.isMaximized();
  const wasFullScreen = win.isFullScreen();
  
  if (wasFullScreen) {
    console.log('[appbarManager] Window is fullscreen, exiting fullscreen first');
    win.setFullScreen(false);
  }
  
  if (wasMaximized) {
    console.log('[appbarManager] Window is maximized, unmaximizing first');
    win.unmaximize();
  }
  
  // Save original window state (get bounds AFTER unmaximizing to get the restored bounds)
  appbarState.originalBounds = win.getBounds();
  appbarState.originalResizable = win.isResizable();
  appbarState.originalMovable = win.isMovable();
  appbarState.originalMinimizable = win.isMinimizable();
  appbarState.originalMaximizable = win.isMaximizable();
  appbarState.originalFullScreenable = win.isFullScreenable();
  appbarState.wasMaximized = wasMaximized; // Remember if it was maximized for undocking
  appbarState.height = height;
  appbarState.edge = edge;
  appbarState.windowRef = win;
  
  // Get primary display for positioning
  // Use bounds (full screen) not workArea (which excludes taskbar)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;
  const { x: screenX, y: screenY } = primaryDisplay.bounds;
  
  // Try native AppBar registration first
  console.log('[appbarManager] Native module available:', nativeModuleAvailable);
  if (nativeModuleAvailable) {
    const hwnd = getNativeWindowHandle(win);
    console.log('[appbarManager] Got window handle:', hwnd ? 'yes' : 'no');
    if (hwnd) {
      const edgeValue = edge === 'top' ? winAppbar.Edge.TOP : 
                        edge === 'bottom' ? winAppbar.Edge.BOTTOM :
                        edge === 'left' ? winAppbar.Edge.LEFT :
                        winAppbar.Edge.RIGHT;
      
      console.log('[appbarManager] Calling registerAppBar with height:', height, 'edge:', edgeValue);
      const result = winAppbar.registerAppBar(hwnd, height, edgeValue);
      console.log('[appbarManager] registerAppBar result:', result);
      
      if (result && result.success) {
        console.log('[appbarManager] Native AppBar registered successfully:', result);
        
        // Store hwnd for cleanup
        appbarState.hwndBuffer = hwnd;
        
        // CRITICAL: Remove window frame/title bar using native API
        console.log('[appbarManager] Removing window frame via native API');
        winAppbar.setFrameless(hwnd, true);
        
        // CRITICAL: Explicitly set window bounds to appbar size
        const appbarBounds = {
          x: result.left,
          y: result.top,
          width: result.width,
          height: result.height
        };
        
        console.log('[appbarManager] Setting window bounds to:', appbarBounds);
        win.setBounds(appbarBounds);
        
        // Set window properties for appbar mode
        win.setResizable(false);
        win.setMovable(false);
        win.setMinimizable(true);
        win.setMaximizable(false);
        win.setFullScreenable(false);
        win.setAlwaysOnTop(true, 'screen-saver');
        win.setSkipTaskbar(false);
        
        // Set visibleOnAllWorkspaces for virtual desktop support
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        
        // CRITICAL: Add close handler to unregister AppBar BEFORE window is destroyed
        const closeHandler = () => {
          console.log('[appbarManager] Window close event - unregistering AppBar');
          if (appbarState.hwndBuffer && nativeModuleAvailable && winAppbar) {
            try {
              winAppbar.unregisterAppBar(appbarState.hwndBuffer);
              console.log('[appbarManager] AppBar unregistered on window close');
            } catch (err) {
              console.error('[appbarManager] Error unregistering on close:', err);
            }
          }
          appbarState.isEnabled = false;
          appbarState.hwndBuffer = null;
        };
        
        // Store handler so we can remove it later if needed
        appbarState.closeHandler = closeHandler;
        win.on('close', closeHandler);
        
        appbarState.isEnabled = true;
        
        return {
          success: true,
          native: true,
          bounds: appbarBounds,
          dpiScale: result.dpiScale
        };
      }
    }
  }
  
  // Fallback: Use Electron APIs (won't reserve screen space at OS level)
  console.log('[appbarManager] Using fallback mode (native module not available)');
  console.log('[appbarManager] Display bounds:', primaryDisplay.bounds);
  console.log('[appbarManager] Scale factor:', primaryDisplay.scaleFactor);
  
  const scaleFactor = primaryDisplay.scaleFactor || 1;
  // Don't scale again if already in physical pixels
  const scaledHeight = height;
  
  let bounds;
  if (edge === 'top') {
    bounds = {
      x: screenX,
      y: screenY,
      width: screenWidth,
      height: scaledHeight
    };
  } else if (edge === 'bottom') {
    bounds = {
      x: screenX,
      y: screenHeight - scaledHeight,
      width: screenWidth,
      height: scaledHeight
    };
  }
  
  console.log('[appbarManager] Setting window bounds to:', bounds);
  
  // CRITICAL: Store original frame state and ensure window is frameless when docked
  // Save the original autoHideMenuBar state
  appbarState.originalAutoHideMenuBar = win.isMenuBarAutoHide ? win.isMenuBarAutoHide() : true;
  
  // Hide menu bar completely when docked
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);
  
  // Apply window transformations
  win.setResizable(false);
  win.setMovable(false);
  win.setMinimizable(true);
  win.setMaximizable(false);
  win.setFullScreenable(false);
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setSkipTaskbar(false);
  win.setBounds(bounds);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  
  appbarState.isEnabled = true;
  
  return {
    success: true,
    native: false,
    bounds,
    message: 'Using fallback mode - screen space not reserved at OS level'
  };
}

/**
 * Disable sticky appbar mode
 * Unregisters from Windows Shell and restores original window state
 */
function disableStickyAppbar(win) {
  if (!win || win.isDestroyed()) {
    console.error('[appbarManager] Invalid window');
    return { success: false, error: 'Invalid window' };
  }
  
  console.log('[appbarManager] Disabling sticky appbar');
  
  // Remove close handler first
  if (appbarState.closeHandler && win && !win.isDestroyed()) {
    win.removeListener('close', appbarState.closeHandler);
    appbarState.closeHandler = null;
  }
  
  // Unregister from native AppBar if applicable
  if (nativeModuleAvailable && winAppbar) {
    // Use stored hwnd if available, otherwise get fresh one
    const hwnd = appbarState.hwndBuffer || getNativeWindowHandle(win);
    if (hwnd) {
      try {
        // Restore window frame first
        console.log('[appbarManager] Restoring window frame');
        winAppbar.setFrameless(hwnd, false);
        
        // Unregister the AppBar
        console.log('[appbarManager] Unregistering AppBar');
        const result = winAppbar.unregisterAppBar(hwnd);
        console.log('[appbarManager] Unregister result:', result);
      } catch (err) {
        console.error('[appbarManager] Error during disable:', err);
      }
    }
    appbarState.hwndBuffer = null;
  }
  
  // Restore original window properties
  win.setResizable(appbarState.originalResizable);
  win.setMovable(appbarState.originalMovable);
  win.setMinimizable(appbarState.originalMinimizable);
  win.setMaximizable(appbarState.originalMaximizable);
  win.setFullScreenable(appbarState.originalFullScreenable);
  win.setAlwaysOnTop(false);
  win.setVisibleOnAllWorkspaces(false);
  
  // Restore original bounds
  if (appbarState.originalBounds) {
    win.setBounds(appbarState.originalBounds);
  }
  
  // If window was maximized before docking, re-maximize it
  if (appbarState.wasMaximized) {
    console.log('[appbarManager] Re-maximizing window (was maximized before docking)');
    win.maximize();
  }
  
  appbarState.isEnabled = false;
  appbarState.windowRef = null;
  appbarState.wasMaximized = false;
  
  return { success: true };
}

/**
 * Update appbar position (call on display changes)
 */
function updateAppbarPosition(win) {
  if (!appbarState.isEnabled || !win || win.isDestroyed()) {
    return { success: false };
  }
  
  if (nativeModuleAvailable) {
    const hwnd = getNativeWindowHandle(win);
    if (hwnd) {
      const result = winAppbar.updateAppBarPosition(hwnd);
      if (result && result.success) {
        return { success: true, bounds: result };
      }
    }
  }
  
  // Fallback: recalculate position
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const { x: screenX, y: screenY } = primaryDisplay.workArea;
  const scaleFactor = primaryDisplay.scaleFactor || 1;
  const scaledHeight = Math.round(appbarState.height * scaleFactor);
  
  let bounds;
  if (appbarState.edge === 'top') {
    bounds = {
      x: screenX,
      y: screenY,
      width: screenWidth,
      height: scaledHeight
    };
  } else {
    bounds = {
      x: screenX,
      y: screenY + primaryDisplay.workAreaSize.height - scaledHeight,
      width: screenWidth,
      height: scaledHeight
    };
  }
  
  win.setBounds(bounds);
  
  return { success: true, bounds };
}

/**
 * Get current appbar state
 */
function getAppbarState() {
  return {
    isEnabled: appbarState.isEnabled,
    height: appbarState.height,
    edge: appbarState.edge,
    nativeModuleAvailable
  };
}

/**
 * Check if native module is available
 */
function isNativeModuleAvailable() {
  return nativeModuleAvailable;
}

/**
 * Setup IPC handlers for renderer process communication
 */
function setupIpcHandlers() {
  // Enable sticky appbar
  ipcMain.handle('appbar:enable', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return enableStickyAppbar(win, options);
  });
  
  // Disable sticky appbar
  ipcMain.handle('appbar:disable', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return disableStickyAppbar(win);
  });
  
  // Toggle sticky appbar
  ipcMain.handle('appbar:toggle', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (appbarState.isEnabled) {
      return disableStickyAppbar(win);
    } else {
      return enableStickyAppbar(win, options);
    }
  });
  
  // Get appbar state
  ipcMain.handle('appbar:getState', async () => {
    return getAppbarState();
  });
  
  // Update position
  ipcMain.handle('appbar:updatePosition', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return updateAppbarPosition(win);
  });
  
  // Check native module availability
  ipcMain.handle('appbar:isNativeAvailable', async () => {
    return nativeModuleAvailable;
  });
  
  console.log('[appbarManager] IPC handlers registered');
}

/**
 * Handle display changes
 */
function setupDisplayListeners() {
  screen.on('display-added', () => {
    if (appbarState.isEnabled && appbarState.windowRef) {
      updateAppbarPosition(appbarState.windowRef);
    }
  });
  
  screen.on('display-removed', () => {
    if (appbarState.isEnabled && appbarState.windowRef) {
      updateAppbarPosition(appbarState.windowRef);
    }
  });
  
  screen.on('display-metrics-changed', () => {
    if (appbarState.isEnabled && appbarState.windowRef) {
      updateAppbarPosition(appbarState.windowRef);
    }
  });
}

/**
 * Cleanup on app exit - CRITICAL: Must unregister AppBar to free screen space
 */
function cleanup() {
  console.log('[appbarManager] Cleanup called, isEnabled:', appbarState.isEnabled, 'hwndBuffer:', !!appbarState.hwndBuffer);
  
  if (!nativeModuleAvailable || !winAppbar) {
    console.log('[appbarManager] Native module not available, skipping cleanup');
    appbarState.isEnabled = false;
    return;
  }
  
  // CRITICAL: Use stored hwnd buffer first (most reliable)
  if (appbarState.hwndBuffer) {
    try {
      console.log('[appbarManager] Unregistering AppBar via stored hwnd buffer');
      const result = winAppbar.unregisterAppBar(appbarState.hwndBuffer);
      console.log('[appbarManager] Unregister result:', result);
    } catch (err) {
      console.error('[appbarManager] Error unregistering via stored hwnd:', err);
    }
    appbarState.hwndBuffer = null;
  }
  
  // Fallback: try via window reference
  if (appbarState.windowRef && !appbarState.windowRef.isDestroyed()) {
    try {
      const hwnd = getNativeWindowHandle(appbarState.windowRef);
      if (hwnd) {
        console.log('[appbarManager] Unregistering AppBar via window reference');
        winAppbar.unregisterAppBar(hwnd);
      }
    } catch (err) {
      console.error('[appbarManager] Error unregistering via window ref:', err);
    }
  }
  
  // Final fallback: cleanup all AppBars
  try {
    console.log('[appbarManager] Calling cleanupAllAppBars as final cleanup');
    winAppbar.cleanupAllAppBars();
  } catch (err) {
    console.error('[appbarManager] Error in cleanupAllAppBars:', err);
  }
  
  // Force Windows to recalculate work areas using child_process
  try {
    const { execSync } = require('child_process');
    console.log('[appbarManager] Forcing Windows to recalculate work areas');
    execSync('powershell -Command "Add-Type -TypeDefinition \'using System.Runtime.InteropServices; public class Win32 { [DllImport(\\\"user32.dll\\\")] public static extern bool SystemParametersInfo(int uAction, int uParam, int lpvParam, int fuWinIni); }\'; [Win32]::SystemParametersInfo(0x0030, 0, 0, 0x02)"', { windowsHide: true });
  } catch (err) {
    console.warn('[appbarManager] Could not force work area recalculation:', err.message);
  }
  
  appbarState.isEnabled = false;
  appbarState.windowRef = null;
  appbarState.closeHandler = null;
  console.log('[appbarManager] Cleanup complete');
}

/**
 * Initialize the appbar manager
 */
function init() {
  setupIpcHandlers();
  setupDisplayListeners();
  
  console.log('[appbarManager] Initialized, native module available:', nativeModuleAvailable);
  
  return {
    enableStickyAppbar,
    disableStickyAppbar,
    updateAppbarPosition,
    getAppbarState,
    isNativeModuleAvailable,
    cleanup
  };
}

// Convenience methods for main.js
function isEnabled() {
  return appbarState.isEnabled;
}

function enable(options = {}) {
  if (appbarState.windowRef && !appbarState.windowRef.isDestroyed()) {
    return enableStickyAppbar(appbarState.windowRef, options);
  }
  // Try to get the focused window
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) {
    return enableStickyAppbar(win, options);
  }
  return { success: false, error: 'No window available' };
}

function disable() {
  if (appbarState.windowRef && !appbarState.windowRef.isDestroyed()) {
    return disableStickyAppbar(appbarState.windowRef);
  }
  // Try to get the focused window
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) {
    return disableStickyAppbar(win);
  }
  return { success: false, error: 'No window available' };
}

module.exports = {
  init,
  enableStickyAppbar,
  disableStickyAppbar,
  updateAppbarPosition,
  getAppbarState,
  isNativeModuleAvailable,
  cleanup,
  setupIpcHandlers,
  // Convenience methods
  isEnabled,
  enable,
  disable
};
