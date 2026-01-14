// JavaScript wrapper for the native Windows AppBar module
// Provides a clean API for Electron's main process

const path = require('path');
const os = require('os');

let nativeModule = null;
let loadError = null;

// Only load on Windows
if (os.platform() === 'win32') {
  try {
    // Try to load the native module
    const bindingPath = path.join(__dirname, '..', 'build', 'Release', 'win_appbar.node');
    nativeModule = require(bindingPath);
  } catch (err) {
    // Try debug build
    try {
      const debugPath = path.join(__dirname, '..', 'build', 'Debug', 'win_appbar.node');
      nativeModule = require(debugPath);
    } catch (debugErr) {
      loadError = err;
      console.warn('[win-appbar] Native module not available:', err.message);
    }
  }
}

// Edge position constants
const Edge = {
  TOP: 1,
  BOTTOM: 3,
  LEFT: 0,
  RIGHT: 2
};

// Check if the native module is available
function isAvailable() {
  return nativeModule !== null;
}

// Get load error if module failed to load
function getLoadError() {
  return loadError;
}

/**
 * Register a window as a Windows AppBar
 * This reserves screen space at the OS level, making other windows avoid this area
 * 
 * @param {Buffer} hwndBuffer - Native window handle buffer from Electron
 * @param {number} height - Height of the appbar in pixels (before DPI scaling)
 * @param {number} [edge=Edge.TOP] - Edge to dock to (TOP, BOTTOM, LEFT, RIGHT)
 * @returns {Object} Result with position info or null on failure
 */
function registerAppBar(hwndBuffer, height, edge = Edge.TOP) {
  if (!nativeModule) {
    console.error('[win-appbar] Native module not loaded');
    return null;
  }
  
  try {
    return nativeModule.registerAppBar(hwndBuffer, height, edge);
  } catch (err) {
    console.error('[win-appbar] Failed to register AppBar:', err);
    return null;
  }
}

/**
 * Unregister a window as an AppBar and restore its original position
 * 
 * @param {Buffer} hwndBuffer - Native window handle buffer
 * @returns {boolean} Success status
 */
function unregisterAppBar(hwndBuffer) {
  if (!nativeModule) {
    return false;
  }
  
  try {
    return nativeModule.unregisterAppBar(hwndBuffer);
  } catch (err) {
    console.error('[win-appbar] Failed to unregister AppBar:', err);
    return false;
  }
}

/**
 * Update the AppBar position (call after monitor/DPI changes)
 * 
 * @param {Buffer} hwndBuffer - Native window handle buffer
 * @returns {Object|boolean} New position info or false on failure
 */
function updateAppBarPosition(hwndBuffer) {
  if (!nativeModule) {
    return false;
  }
  
  try {
    return nativeModule.updateAppBarPosition(hwndBuffer);
  } catch (err) {
    console.error('[win-appbar] Failed to update AppBar position:', err);
    return false;
  }
}

/**
 * Check if a window is registered as an AppBar
 * 
 * @param {Buffer} hwndBuffer - Native window handle buffer
 * @returns {boolean} Registration status
 */
function isAppBarRegistered(hwndBuffer) {
  if (!nativeModule) {
    return false;
  }
  
  try {
    return nativeModule.isAppBarRegistered(hwndBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Get monitor information for the window
 * 
 * @param {Buffer} hwndBuffer - Native window handle buffer
 * @returns {Object|null} Monitor info including work area and DPI scale
 */
function getMonitorInfo(hwndBuffer) {
  if (!nativeModule) {
    return null;
  }
  
  try {
    return nativeModule.getMonitorInfo(hwndBuffer);
  } catch (err) {
    console.error('[win-appbar] Failed to get monitor info:', err);
    return null;
  }
}

/**
 * Set window always-on-top state
 * 
 * @param {Buffer} hwndBuffer - Native window handle buffer
 * @param {boolean} onTop - Whether to set always on top
 * @returns {boolean} Success status
 */
function setAlwaysOnTop(hwndBuffer, onTop) {
  if (!nativeModule) {
    return false;
  }
  
  try {
    return nativeModule.setAlwaysOnTop(hwndBuffer, onTop);
  } catch (err) {
    console.error('[win-appbar] Failed to set always on top:', err);
    return false;
  }
}

/**
 * Set window frameless mode
 * 
 * @param {Buffer} hwndBuffer - Native window handle buffer
 * @param {boolean} frameless - Whether to remove window frame
 * @returns {boolean} Success status
 */
function setFrameless(hwndBuffer, frameless) {
  if (!nativeModule) {
    return false;
  }
  
  try {
    return nativeModule.setFrameless(hwndBuffer, frameless);
  } catch (err) {
    console.error('[win-appbar] Failed to set frameless:', err);
    return false;
  }
}

/**
 * Cleanup all registered AppBars (call on app exit)
 * 
 * @returns {boolean} Success status
 */
function cleanupAllAppBars() {
  if (!nativeModule) {
    return true;
  }
  
  try {
    return nativeModule.cleanupAllAppBars();
  } catch (err) {
    console.error('[win-appbar] Failed to cleanup AppBars:', err);
    return false;
  }
}

module.exports = {
  Edge,
  isAvailable,
  getLoadError,
  registerAppBar,
  unregisterAppBar,
  updateAppBarPosition,
  isAppBarRegistered,
  getMonitorInfo,
  setAlwaysOnTop,
  setFrameless,
  cleanupAllAppBars
};
