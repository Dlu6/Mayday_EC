// electron-softphone/src/services/transferMonitorService.js
// Real-time Transfer Monitoring Service
// Provides live feedback on transfer operations for debugging and confidence

import { sipService, sipCallService } from "./sipService";
import { storageService } from "./storageService";
import serverConfig from "../config/serverConfig";

class TransferMonitorService {
  constructor() {
    this.transferLog = [];
    this.maxLogSize = 50;
    this.listeners = new Set();
    this.isMonitoring = false;
    this.currentTransfer = null;
  }

  /**
   * Start monitoring transfer events
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupEventListeners();
    console.log("[TransferMonitor] Monitoring started");
  }

  /**
   * Stop monitoring transfer events
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.removeEventListeners();
    console.log("[TransferMonitor] Monitoring stopped");
  }

  /**
   * Setup event listeners for transfer events
   */
  setupEventListeners() {
    const events = sipService.events;

    // Blind transfer events
    events.on("call:transfer_initiated", this.handleTransferInitiated);
    events.on("call:transfer_accepted", this.handleTransferAccepted);
    events.on("call:transfer_failed", this.handleTransferFailed);
    events.on("call:transfer_progress", this.handleTransferProgress);
    events.on("call:transfer_complete", this.handleTransferComplete);

    // Attended transfer events
    events.on("call:attended_transfer_started", this.handleAttendedStarted);
    events.on("call:attended_transfer_failed", this.handleAttendedFailed);
    events.on("transfer:consultation_ringing", this.handleConsultationRinging);
    events.on("transfer:consultation_established", this.handleConsultationEstablished);
    events.on("transfer:consultation_failed", this.handleConsultationFailed);
    events.on("transfer:consultation_rejected", this.handleConsultationRejected);
    events.on("transfer:managed_started", this.handleManagedStarted);
    events.on("transfer:managed_completed", this.handleManagedCompleted);
    events.on("transfer:managed_cancelled", this.handleManagedCancelled);
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    const events = sipService.events;

    events.off("call:transfer_initiated", this.handleTransferInitiated);
    events.off("call:transfer_accepted", this.handleTransferAccepted);
    events.off("call:transfer_failed", this.handleTransferFailed);
    events.off("call:transfer_progress", this.handleTransferProgress);
    events.off("call:transfer_complete", this.handleTransferComplete);
    events.off("call:attended_transfer_started", this.handleAttendedStarted);
    events.off("call:attended_transfer_failed", this.handleAttendedFailed);
    events.off("transfer:consultation_ringing", this.handleConsultationRinging);
    events.off("transfer:consultation_established", this.handleConsultationEstablished);
    events.off("transfer:consultation_failed", this.handleConsultationFailed);
    events.off("transfer:consultation_rejected", this.handleConsultationRejected);
    events.off("transfer:managed_started", this.handleManagedStarted);
    events.off("transfer:managed_completed", this.handleManagedCompleted);
    events.off("transfer:managed_cancelled", this.handleManagedCancelled);
  }

  // Event handlers (arrow functions to preserve 'this' context)
  handleTransferInitiated = (data) => {
    this.logEvent("TRANSFER_INITIATED", "info", data);
    this.currentTransfer = {
      type: data.transferType || "blind",
      target: data.targetExtension,
      startTime: Date.now(),
      status: "initiated",
    };
    this.notifyListeners("initiated", data);
  };

  handleTransferAccepted = (data) => {
    this.logEvent("TRANSFER_ACCEPTED", "success", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "accepted";
      this.currentTransfer.acceptedTime = Date.now();
    }
    this.notifyListeners("accepted", data);
  };

  handleTransferFailed = (data) => {
    this.logEvent("TRANSFER_FAILED", "error", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "failed";
      this.currentTransfer.error = data.error;
      this.currentTransfer.endTime = Date.now();
    }
    this.notifyListeners("failed", data);
  };

  handleTransferProgress = (data) => {
    this.logEvent("TRANSFER_PROGRESS", "info", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "in_progress";
    }
    this.notifyListeners("progress", data);
  };

  handleTransferComplete = (data) => {
    this.logEvent("TRANSFER_COMPLETE", "success", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "completed";
      this.currentTransfer.endTime = Date.now();
      this.currentTransfer.duration = this.currentTransfer.endTime - this.currentTransfer.startTime;
    }
    this.notifyListeners("completed", data);
    this.currentTransfer = null;
  };

  handleAttendedStarted = (data) => {
    this.logEvent("ATTENDED_TRANSFER_STARTED", "info", data);
    this.currentTransfer = {
      type: "attended",
      target: data.targetExtension,
      startTime: Date.now(),
      status: "started",
    };
    this.notifyListeners("attended_started", data);
  };

  handleAttendedFailed = (data) => {
    this.logEvent("ATTENDED_TRANSFER_FAILED", "error", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "failed";
      this.currentTransfer.error = data.error;
    }
    this.notifyListeners("attended_failed", data);
  };

  handleConsultationRinging = (data) => {
    this.logEvent("CONSULTATION_RINGING", "info", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "consultation_ringing";
    }
    this.notifyListeners("consultation_ringing", data);
  };

  handleConsultationEstablished = (data) => {
    this.logEvent("CONSULTATION_ESTABLISHED", "success", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "consultation_established";
      this.currentTransfer.consultationTime = Date.now();
    }
    this.notifyListeners("consultation_established", data);
  };

  handleConsultationFailed = (data) => {
    this.logEvent("CONSULTATION_FAILED", "error", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "consultation_failed";
    }
    this.notifyListeners("consultation_failed", data);
  };

  handleConsultationRejected = (data) => {
    this.logEvent("CONSULTATION_REJECTED", "warning", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "consultation_rejected";
      this.currentTransfer.rejectReason = data.reason;
    }
    this.notifyListeners("consultation_rejected", data);
  };

  handleManagedStarted = (data) => {
    this.logEvent("MANAGED_TRANSFER_STARTED", "info", data);
    this.notifyListeners("managed_started", data);
  };

  handleManagedCompleted = (data) => {
    this.logEvent("MANAGED_TRANSFER_COMPLETED", "success", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "completed";
      this.currentTransfer.endTime = Date.now();
    }
    this.notifyListeners("managed_completed", data);
    this.currentTransfer = null;
  };

  handleManagedCancelled = (data) => {
    this.logEvent("MANAGED_TRANSFER_CANCELLED", "warning", data);
    if (this.currentTransfer) {
      this.currentTransfer.status = "cancelled";
    }
    this.notifyListeners("managed_cancelled", data);
    this.currentTransfer = null;
  };

  /**
   * Log a transfer event
   */
  logEvent(event, level, data) {
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      event,
      level,
      data,
      extension: storageService.getUserData()?.user?.extension || "unknown",
    };

    this.transferLog.unshift(logEntry);

    // Keep log size manageable
    if (this.transferLog.length > this.maxLogSize) {
      this.transferLog = this.transferLog.slice(0, this.maxLogSize);
    }

    // Console output with color coding
    const colors = {
      info: "\x1b[36m",    // Cyan
      success: "\x1b[32m", // Green
      warning: "\x1b[33m", // Yellow
      error: "\x1b[31m",   // Red
      reset: "\x1b[0m",
    };

    console.log(
      `${colors[level]}[TransferMonitor] ${event}${colors.reset}`,
      data
    );
  }

  /**
   * Add a listener for transfer events
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data, this.currentTransfer);
      } catch (error) {
        console.error("[TransferMonitor] Listener error:", error);
      }
    });
  }

  /**
   * Get transfer log
   */
  getLog(limit = 20) {
    return this.transferLog.slice(0, limit);
  }

  /**
   * Get current transfer status
   */
  getCurrentTransfer() {
    return this.currentTransfer;
  }

  /**
   * Clear transfer log
   */
  clearLog() {
    this.transferLog = [];
  }

  /**
   * Run a comprehensive transfer capability check
   */
  async runCapabilityCheck() {
    const report = {
      timestamp: new Date().toISOString(),
      checks: [],
      overall: "unknown",
    };

    // Check 1: SIP Service Connected
    const sipConnected = sipService.isConnected;
    report.checks.push({
      name: "SIP Connection",
      status: sipConnected ? "pass" : "fail",
      message: sipConnected ? "SIP service is connected" : "SIP service is not connected",
    });

    // Check 2: User Agent Available
    const hasUserAgent = !!sipService.state?.userAgent;
    report.checks.push({
      name: "User Agent",
      status: hasUserAgent ? "pass" : "fail",
      message: hasUserAgent ? "User agent is available" : "User agent not initialized",
    });

    // Check 3: Registerer Active
    const hasRegisterer = !!sipService.state?.registerer;
    report.checks.push({
      name: "Registerer",
      status: hasRegisterer ? "pass" : "fail",
      message: hasRegisterer ? "Registerer is active" : "Registerer not available",
    });

    // Check 4: Transfer Support
    const transferSupported = sipCallService.isTransferSupported?.() || false;
    report.checks.push({
      name: "Transfer Support",
      status: transferSupported ? "pass" : "warning",
      message: transferSupported 
        ? "Transfer is supported on current session" 
        : "No active session or transfer not supported",
    });

    // Check 5: Transfer State
    const transferState = sipCallService.getTransferState?.();
    report.checks.push({
      name: "Transfer State",
      status: transferState?.transferState === "idle" ? "pass" : "warning",
      message: `Current transfer state: ${transferState?.transferState || "unknown"}`,
      details: transferState,
    });

    // Check 6: Server Health (if available)
    try {
      const serverHealth = await this.checkServerHealth();
      report.checks.push({
        name: "Server Health",
        status: serverHealth.success ? "pass" : "warning",
        message: serverHealth.message,
      });
    } catch (error) {
      report.checks.push({
        name: "Server Health",
        status: "warning",
        message: `Could not check server health: ${error.message}`,
      });
    }

    // Calculate overall status
    const failedChecks = report.checks.filter(c => c.status === "fail").length;
    const warningChecks = report.checks.filter(c => c.status === "warning").length;

    if (failedChecks > 0) {
      report.overall = "fail";
      report.message = "Critical issues detected - transfers may not work";
    } else if (warningChecks > 0) {
      report.overall = "warning";
      report.message = "Some warnings - transfers should work but review recommended";
    } else {
      report.overall = "pass";
      report.message = "All checks passed - transfers are ready";
    }

    return report;
  }

  /**
   * Check server health endpoint
   */
  async checkServerHealth() {
    try {
      const token = storageService.getAuthToken();

      const response = await fetch(`${serverConfig.apiUrl}/api/transfers/health`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      return {
        success: result.success && result.data?.overall !== "fail",
        message: result.data?.overall === "pass" 
          ? "Server transfer health check passed"
          : `Server health: ${result.data?.overall || "unknown"}`,
        details: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `Server health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Export transfer log for debugging
   */
  exportLog() {
    return {
      exportTime: new Date().toISOString(),
      extension: storageService.getUserData()?.user?.extension,
      logCount: this.transferLog.length,
      log: this.transferLog,
      currentTransfer: this.currentTransfer,
    };
  }
}

// Create singleton instance
const transferMonitorService = new TransferMonitorService();

// Auto-start monitoring in development
if (process.env.NODE_ENV === "development") {
  transferMonitorService.startMonitoring();
}

export default transferMonitorService;
