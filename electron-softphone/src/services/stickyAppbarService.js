// stickyAppbarService.js - Renderer-side service for sticky appbar functionality
// Communicates with the main process via IPC to control the Windows AppBar

// Import global appbar configuration
import APPBAR_CONFIG from '../config/appbarConfig';

// Check if we're running in Electron
const isElectron = typeof window !== 'undefined' && 
  window.process && 
  window.process.type === 'renderer';

// Get ipcRenderer if available
let ipcRenderer = null;
if (isElectron) {
  try {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (err) {
    console.warn('[stickyAppbarService] Failed to load electron:', err);
  }
}

// Default appbar configuration
const DEFAULT_CONFIG = {
  height: APPBAR_CONFIG.height,
  edge: APPBAR_CONFIG.edge
};

// State
let currentState = {
  isEnabled: false,
  isNativeAvailable: false,
  config: { ...DEFAULT_CONFIG },
  wasEnabledBeforeAuth: false // Track if sticky was enabled before auth redirect
};

// Event listeners
const listeners = new Set();

/**
 * Notify all listeners of state change
 */
function notifyListeners(state) {
  listeners.forEach(callback => {
    try {
      callback(state);
    } catch (err) {
      console.error('[stickyAppbarService] Listener error:', err);
    }
  });
}

/**
 * Check if the service is available (running in Electron)
 */
function isAvailable() {
  return isElectron && ipcRenderer !== null;
}

/**
 * Check if native Windows AppBar support is available
 */
async function isNativeAvailable() {
  if (!isAvailable()) {
    return false;
  }
  
  try {
    const result = await ipcRenderer.invoke('appbar:isNativeAvailable');
    currentState.isNativeAvailable = result;
    return result;
  } catch (err) {
    console.error('[stickyAppbarService] Failed to check native availability:', err);
    return false;
  }
}

/**
 * Get current appbar state from main process
 */
async function getState() {
  if (!isAvailable()) {
    return currentState;
  }
  
  try {
    const state = await ipcRenderer.invoke('appbar:getState');
    currentState = {
      ...currentState,
      ...state
    };
    return currentState;
  } catch (err) {
    console.error('[stickyAppbarService] Failed to get state:', err);
    return currentState;
  }
}

/**
 * Enable sticky appbar mode
 * @param {Object} options - Configuration options
 * @param {number} options.height - Appbar height in pixels
 * @param {string} options.edge - Edge to dock to ('top' or 'bottom')
 */
async function enable(options = {}) {
  if (!isAvailable()) {
    console.warn('[stickyAppbarService] Service not available');
    return { success: false, error: 'Not running in Electron' };
  }
  
  const config = {
    ...DEFAULT_CONFIG,
    ...options
  };
  
  try {
    console.log('[stickyAppbarService] Enabling sticky appbar with config:', config);
    const result = await ipcRenderer.invoke('appbar:enable', config);
    
    if (result.success) {
      currentState.isEnabled = true;
      currentState.config = config;
      notifyListeners(currentState);
    }
    
    return result;
  } catch (err) {
    console.error('[stickyAppbarService] Failed to enable:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Disable sticky appbar mode
 */
async function disable() {
  if (!isAvailable()) {
    return { success: false, error: 'Not running in Electron' };
  }
  
  try {
    console.log('[stickyAppbarService] Disabling sticky appbar');
    const result = await ipcRenderer.invoke('appbar:disable');
    
    if (result.success) {
      currentState.isEnabled = false;
      notifyListeners(currentState);
    }
    
    return result;
  } catch (err) {
    console.error('[stickyAppbarService] Failed to disable:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle sticky appbar mode
 * @param {Object} options - Configuration options (used when enabling)
 */
async function toggle(options = {}) {
  if (!isAvailable()) {
    return { success: false, error: 'Not running in Electron' };
  }
  
  const config = {
    ...DEFAULT_CONFIG,
    ...currentState.config,
    ...options
  };
  
  try {
    console.log('[stickyAppbarService] Toggling sticky appbar');
    const result = await ipcRenderer.invoke('appbar:toggle', config);
    
    if (result.success) {
      currentState.isEnabled = !currentState.isEnabled;
      if (currentState.isEnabled) {
        currentState.config = config;
      }
      notifyListeners(currentState);
    }
    
    return result;
  } catch (err) {
    console.error('[stickyAppbarService] Failed to toggle:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update appbar position (call after display changes)
 */
async function updatePosition() {
  if (!isAvailable() || !currentState.isEnabled) {
    return { success: false };
  }
  
  try {
    return await ipcRenderer.invoke('appbar:updatePosition');
  } catch (err) {
    console.error('[stickyAppbarService] Failed to update position:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe to state changes
 * @param {Function} callback - Called with new state when it changes
 * @returns {Function} Unsubscribe function
 */
function subscribe(callback) {
  listeners.add(callback);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Get current state synchronously (may be stale)
 */
function getCurrentState() {
  return { ...currentState };
}

/**
 * Check if sticky appbar is currently enabled
 */
function isEnabled() {
  return currentState.isEnabled;
}

/**
 * Disable sticky appbar for authentication flow
 * Saves the current state so it can be restored after login
 * @returns {Promise<Object>} Result with wasEnabled flag
 */
async function disableForAuth() {
  if (!isAvailable()) {
    return { success: true, wasEnabled: false };
  }
  
  const wasEnabled = currentState.isEnabled;
  
  if (wasEnabled) {
    console.log('[stickyAppbarService] Disabling sticky mode for authentication');
    currentState.wasEnabledBeforeAuth = true;
    
    // Store in localStorage as backup in case of page reload
    try {
      localStorage.setItem('stickyAppbar_wasEnabledBeforeAuth', 'true');
    } catch (e) {
      // Ignore localStorage errors
    }
    
    const result = await disable();
    return { ...result, wasEnabled: true };
  }
  
  return { success: true, wasEnabled: false };
}

/**
 * Restore sticky appbar after successful authentication
 * Only re-enables if it was enabled before auth redirect
 * @returns {Promise<Object>} Result of enable operation
 */
async function restoreAfterAuth() {
  if (!isAvailable()) {
    return { success: false, error: 'Not running in Electron' };
  }
  
  // Check both memory state and localStorage backup
  let shouldRestore = currentState.wasEnabledBeforeAuth;
  
  if (!shouldRestore) {
    try {
      shouldRestore = localStorage.getItem('stickyAppbar_wasEnabledBeforeAuth') === 'true';
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  
  if (shouldRestore) {
    console.log('[stickyAppbarService] Restoring sticky mode after authentication');
    
    // Clear the flag
    currentState.wasEnabledBeforeAuth = false;
    try {
      localStorage.removeItem('stickyAppbar_wasEnabledBeforeAuth');
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return await enable(currentState.config);
  }
  
  return { success: true, restored: false };
}

/**
 * Check if sticky mode should be restored after auth
 */
function shouldRestoreAfterAuth() {
  if (currentState.wasEnabledBeforeAuth) {
    return true;
  }
  
  try {
    return localStorage.getItem('stickyAppbar_wasEnabledBeforeAuth') === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Clear the restore-after-auth flag without restoring
 */
function clearRestoreFlag() {
  currentState.wasEnabledBeforeAuth = false;
  try {
    localStorage.removeItem('stickyAppbar_wasEnabledBeforeAuth');
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Initialize by checking native availability
if (isAvailable()) {
  isNativeAvailable().then(available => {
    console.log('[stickyAppbarService] Native module available:', available);
  });
}

export const stickyAppbarService = {
  isAvailable,
  isNativeAvailable,
  getState,
  enable,
  disable,
  toggle,
  updatePosition,
  subscribe,
  getCurrentState,
  isEnabled,
  disableForAuth,
  restoreAfterAuth,
  shouldRestoreAfterAuth,
  clearRestoreFlag,
  DEFAULT_CONFIG
};

export default stickyAppbarService;
