// Centralized Logout Manager Service (function-based)
// Handles all logout logic centrally and exposes a simple functional API

let isLoggingOut = false;
let logoutStartTime = null;
const registeredServices = new Map();
const logoutCallbacks = new Set();
const cleanupTasks = new Set();

// Initialize global flags to safe defaults (NOT during logout)
const initializeGlobalFlags = () => {
  window.isLoggingOut = false;
  window.apiCallsBlocked = false;
  window.logoutTimestamp = null;
  window.isAuthenticating = false;
  window.isDisconnecting = false;  // CRITICAL: Must be false on init
  window.isCleaningUp = false;     // CRITICAL: Must be false on init
  window.logoutInProgress = false; // CRITICAL: Must be false on init
  window._authRedirectInProgress = false; // CRITICAL: Reset auth redirect flag
};

// Set global flags when logout STARTS
const setLogoutFlags = () => {
  window.isLoggingOut = true;
  window.apiCallsBlocked = true;
  window.logoutTimestamp = Date.now();
  window.isDisconnecting = true;
  window.isCleaningUp = true;
  window.logoutInProgress = true;
};

const setupPageUnloadListener = () => {
  window.addEventListener("beforeunload", () => {
    if (isLoggingOut) {
      console.log("🔒 Page unload during logout - ensuring cleanup");
      performFinalCleanup();
    }
  });
};

const registerService = (serviceName, cleanupFunction) => {
  if (registeredServices.has(serviceName)) {
    console.warn(`⚠️ Service ${serviceName} already registered`);
    return;
  }
  registeredServices.set(serviceName, cleanupFunction);
  console.log(`✅ Service ${serviceName} registered for logout cleanup`);
};

const unregisterService = (serviceName) => {
  if (registeredServices.delete(serviceName)) {
    console.log(`✅ Service ${serviceName} unregistered from logout cleanup`);
  }
};

const onLogout = (callback) => {
  logoutCallbacks.add(callback);
  return () => logoutCallbacks.delete(callback);
};

const addCleanupTask = (taskName, taskFunction) => {
  cleanupTasks.add({ name: taskName, execute: taskFunction });
};

const isLogoutInProgress = () => isLoggingOut || window.isLoggingOut === true;

const shouldBlockApiCalls = () =>
  isLogoutInProgress() || window.apiCallsBlocked === true;

// Helper to run async function with timeout
const withTimeout = (promise, timeoutMs, name) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

const startLogout = async (force = false) => {
  if (isLoggingOut && !force) {
    console.log("🔒 Logout already in progress");
    return;
  }

  console.log("🚪 Starting centralized logout process...");

  // Set global flags immediately
  isLoggingOut = true;
  logoutStartTime = Date.now();
  setLogoutFlags();

  // Dispatch logout start event
  window.dispatchEvent(
    new CustomEvent("logout-start", {
      detail: { timestamp: logoutStartTime },
    })
  );

  // CRITICAL: Set a master timeout to prevent logout from hanging forever
  const LOGOUT_TIMEOUT = 8000; // 8 seconds max for entire logout
  const SERVICE_TIMEOUT = 3000; // 3 seconds max per service

  try {
    await withTimeout(
      (async () => {
        // Execute all registered logout callbacks
        console.log("🔄 Executing logout callbacks...");
        for (const callback of logoutCallbacks) {
          try {
            await withTimeout(Promise.resolve(callback()), SERVICE_TIMEOUT, "Logout callback");
          } catch (error) {
            console.warn("⚠️ Logout callback failed:", error.message);
          }
        }

        // Clean up all registered services
        console.log("🧹 Cleaning up registered services...");
        for (const [serviceName, cleanupFunction] of registeredServices) {
          try {
            console.log(`🧹 Cleaning up service: ${serviceName}`);
            await withTimeout(Promise.resolve(cleanupFunction()), SERVICE_TIMEOUT, serviceName);
          } catch (error) {
            console.warn(`⚠️ Failed to cleanup service ${serviceName}:`, error.message);
          }
        }

        // Execute all cleanup tasks
        console.log("🧹 Executing cleanup tasks...");
        for (const task of cleanupTasks) {
          try {
            console.log(`🧹 Executing cleanup task: ${task.name}`);
            await withTimeout(Promise.resolve(task.execute()), SERVICE_TIMEOUT, task.name);
          } catch (error) {
            console.warn(`⚠️ Cleanup task ${task.name} failed:`, error.message);
          }
        }
      })(),
      LOGOUT_TIMEOUT,
      "Logout process"
    );

    // Final cleanup
    await performFinalCleanup();

    console.log("✅ Centralized logout completed successfully");
  } catch (error) {
    console.error("❌ Centralized logout failed or timed out:", error.message);
    // Even if logout fails, ensure we're in a clean state
    await performFinalCleanup();
  } finally {
    // Reset state
    isLoggingOut = false;
    logoutStartTime = null;
  }
};

const performFinalCleanup = async () => {
  console.log("🧹 Performing final cleanup...");

  // Clear all timers and intervals
  try {
    const highestIntervalId = window.setInterval(() => {}, 0);
    for (let i = 1; i <= highestIntervalId; i++) {
      try {
        clearInterval(i);
      } catch (_) {}
    }

    const highestTimeoutId = window.setTimeout(() => {}, 0);
    for (let i = 1; i <= highestTimeoutId; i++) {
      try {
        clearTimeout(i);
      } catch (_) {}
    }
  } catch (error) {
    console.warn("⚠️ Error clearing timers:", error);
  }

  // Clear all event listeners
  try {
    const customEvents = [
      "websocket:event",
      "sip:event",
      "ami:event",
      "websocket:connected",
      "websocket:disconnected",
      "websocket:connection_error",
      "websocket:reconnected",
      "websocket:reconnect_attempt",
      "websocket:reconnect_error",
      "websocket:reconnect_failed",
      "connected",
      "disconnected",
      "connection_error",
      "reconnected",
      "reconnect_failed",
      "call:event",
      "registration:state",
      "registered",
      "unregistered",
    ];

    customEvents.forEach((eventName) => {
      try {
        window.removeEventListener(eventName, () => {});
      } catch (_) {}
    });
  } catch (error) {
    console.warn("⚠️ Error clearing event listeners:", error);
  }

  // Clear global variables
  const globalKeys = [
    "dashboardAgentsList",
    "handleDirectCall",
    "callMonitoringService",
    "connectionManager",
    "amiService",
    "websocketService",
    "sipService",
    "agentService",
    "callHistoryService",
    "API",
    "io",
  ];

  globalKeys.forEach((key) => {
    if (window[key]) {
      try {
        if (typeof window[key].disconnect === "function") {
          window[key].disconnect();
        }
        if (typeof window[key].cleanup === "function") {
          window[key].cleanup();
        }
        if (typeof window[key].destroy === "function") {
          window[key].destroy();
        }
        delete window[key];
      } catch (error) {
        console.warn(`⚠️ Error cleaning up global key ${key}:`, error);
        delete window[key];
      }
    }
  });

  // Clear storage
  // Note: We preserve "rememberMe" and encrypted credentials for the Remember Me functionality
  try {
    localStorage.removeItem("authToken");
    localStorage.removeItem("mongoToken");
    localStorage.removeItem("host");
    localStorage.removeItem("email");
    // localStorage.removeItem("rememberMe"); // Keep this for Remember Me functionality
    localStorage.removeItem("useRemoteUrl");
    // Note: encryptedCredentials are also preserved for Remember Me functionality
    sessionStorage.clear();
  } catch (error) {
    console.warn("⚠️ Error clearing storage:", error);
  }
};

const getStatus = () => ({
  isLoggingOut,
  logoutStartTime,
  registeredServices: Array.from(registeredServices.keys()),
  logoutCallbacks: logoutCallbacks.size,
  cleanupTasks: cleanupTasks.size,
});

const reset = () => {
  isLoggingOut = false;
  logoutStartTime = null;
  registeredServices.clear();
  logoutCallbacks.clear();
  cleanupTasks.clear();

  // Clear global flags
  delete window.isLoggingOut;
  delete window.apiCallsBlocked;
  delete window.logoutTimestamp;
  delete window.isAuthenticating;
  delete window.isDisconnecting;
  delete window.isCleaningUp;
  delete window.logoutInProgress;

  console.log("🔄 Logout manager reset");
};

// Initialize at import time - use safe defaults, NOT logout flags
initializeGlobalFlags();
setupPageUnloadListener();

const logoutManager = {
  // lifecycle
  startLogout,
  performFinalCleanup,
  reset,
  // registration
  registerService,
  unregisterService,
  onLogout,
  addCleanupTask,
  // status
  isLogoutInProgress,
  shouldBlockApiCalls,
  getStatus,
};

export default logoutManager;
