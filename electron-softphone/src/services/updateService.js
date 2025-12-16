/**
 * Update Service - Handles communication with Electron's auto-updater
 */

// Safely get ipcRenderer - handle both Electron and browser environments
let ipcRenderer = null;
try {
  if (typeof window !== "undefined" && window.require) {
    const electron = window.require("electron");
    ipcRenderer = electron.ipcRenderer;
  }
} catch (e) {
  console.log("[UpdateService] Not in Electron environment");
}

class UpdateService {
  constructor() {
    this.listeners = new Set();
    this.currentStatus = null;
    this.setupListeners();
  }

  /**
   * Set up IPC listeners for update events
   */
  setupListeners() {
    if (!ipcRenderer) {
      console.warn("[UpdateService] Not running in Electron environment");
      return;
    }

    ipcRenderer.on("update-status", (event, data) => {
      this.currentStatus = data;
      this.notifyListeners(data);
    });
  }

  /**
   * Subscribe to update status changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately notify with current status if available
    if (this.currentStatus) {
      callback(this.currentStatus);
    }
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners(data) {
    this.listeners.forEach((callback) => callback(data));
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates() {
    if (!ipcRenderer) {
      return { success: false, error: "Not in Electron environment" };
    }
    return await ipcRenderer.invoke("check-for-updates");
  }

  /**
   * Download the available update
   */
  async downloadUpdate() {
    if (!ipcRenderer) {
      return { success: false, error: "Not in Electron environment" };
    }
    return await ipcRenderer.invoke("download-update");
  }

  /**
   * Install the downloaded update (restarts the app)
   */
  async installUpdate() {
    if (!ipcRenderer) {
      return { success: false, error: "Not in Electron environment" };
    }
    return await ipcRenderer.invoke("install-update");
  }

  /**
   * Get current app version
   */
  async getAppVersion() {
    if (!ipcRenderer) {
      return "unknown";
    }
    return await ipcRenderer.invoke("get-app-version");
  }
}

// Export singleton instance
export const updateService = new UpdateService();
export default updateService;
