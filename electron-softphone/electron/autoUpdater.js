const { ipcMain, BrowserWindow, app } = require("electron");

let autoUpdater = null;
let log = null;

/**
 * Lazy load autoUpdater to avoid initialization before app is ready
 */
function getAutoUpdater() {
  if (!autoUpdater) {
    const { autoUpdater: updater } = require("electron-updater");
    autoUpdater = updater;
    
    // Configure logging
    log = require("electron-log");
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = "info";
    
    // Disable auto download - let user decide
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
  }
  return autoUpdater;
}

/**
 * Initialize auto-updater with event handlers
 */
function initAutoUpdater() {
  const updater = getAutoUpdater();
  
  // Check for updates error
  updater.on("error", (error) => {
    console.error("[AutoUpdater] Error:", error);
    sendUpdateStatus("error", {
      message: error.message || "Update check failed",
    });
  });

  // Checking for updates
  updater.on("checking-for-update", () => {
    console.log("[AutoUpdater] Checking for updates...");
    sendUpdateStatus("checking", { message: "Checking for updates..." });
  });

  // Update available
  updater.on("update-available", (info) => {
    console.log("[AutoUpdater] Update available:", info.version);
    sendUpdateStatus("available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      message: `Version ${info.version} is available!`,
    });
  });

  // No update available
  updater.on("update-not-available", (info) => {
    console.log("[AutoUpdater] No update available. Current version:", info.version);
    sendUpdateStatus("not-available", {
      version: info.version,
      message: "You have the latest version!",
    });
  });

  // Download progress
  updater.on("download-progress", (progress) => {
    console.log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(1)}%`);
    sendUpdateStatus("downloading", {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
      message: `Downloading: ${progress.percent.toFixed(1)}%`,
    });
  });

  // Update downloaded
  updater.on("update-downloaded", (info) => {
    console.log("[AutoUpdater] Update downloaded:", info.version);
    sendUpdateStatus("downloaded", {
      version: info.version,
      message: `Version ${info.version} downloaded. Restart to install.`,
    });
  });

  // Set up IPC handlers
  setupIpcHandlers();
}

/**
 * Set up IPC handlers for renderer communication
 */
function setupIpcHandlers() {
  // Check for updates manually
  ipcMain.handle("check-for-updates", async () => {
    try {
      console.log("[AutoUpdater] Manual update check triggered");
      const result = await getAutoUpdater().checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
      console.error("[AutoUpdater] Check failed:", error);
      return { success: false, error: error.message };
    }
  });

  // Download update
  ipcMain.handle("download-update", async () => {
    try {
      console.log("[AutoUpdater] Starting download...");
      await getAutoUpdater().downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error("[AutoUpdater] Download failed:", error);
      return { success: false, error: error.message };
    }
  });

  // Install update (quit and install)
  ipcMain.handle("install-update", async () => {
    console.log("[AutoUpdater] Installing update...");
    
    // Set flag to prevent any cleanup interference
    app.isQuitting = true;
    
    // Close all windows first to release file locks
    const windows = BrowserWindow.getAllWindows();
    console.log(`[AutoUpdater] Closing ${windows.length} windows before install...`);
    
    for (const win of windows) {
      try {
        // Remove all close event listeners to prevent interference
        win.removeAllListeners('close');
        // Destroy window immediately instead of just closing
        win.destroy();
      } catch (e) {
        console.warn('[AutoUpdater] Error closing window:', e);
      }
    }
    
    // Longer delay to ensure all resources are released on Windows
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force quit and install
    // isSilent: true - don't show installer UI, just install silently
    // isForceRunAfter: true - restart app after install
    // Using silent install to avoid the "cannot be closed" dialog
    setImmediate(() => {
      getAutoUpdater().quitAndInstall(true, true);
    });
  });

  // Get current version
  ipcMain.handle("get-app-version", () => {
    const { app } = require("electron");
    return app.getVersion();
  });
}

/**
 * Send update status to all renderer windows
 */
function sendUpdateStatus(status, data = {}) {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    if (win && win.webContents) {
      win.webContents.send("update-status", { status, ...data });
    }
  });
}

/**
 * Check for updates (can be called on app start)
 */
function checkForUpdates() {
  // Only check in production
  if (process.env.NODE_ENV === "development") {
    console.log("[AutoUpdater] Skipping update check in development mode");
    return;
  }
  
  getAutoUpdater().checkForUpdates().catch((error) => {
    console.error("[AutoUpdater] Auto-check failed:", error);
  });
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
};
