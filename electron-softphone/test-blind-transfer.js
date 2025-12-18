// Test script for transfer debugging and verification
// Run this in the browser console when testing transfers
//
// USAGE:
//   1. Load this script in the browser console
//   2. Run transferDebug.runCheck() to verify transfer capability
//   3. Make a test call
//   4. Run transferDebug.testBlind('1019') or transferDebug.testAttended('1019')
//   5. Check results with transferDebug.getLog()

// Helper to monitor transfer events
function monitorTransferEvents() {
  const sipService = window.sipService || window.sipCallService;
  if (!sipService) {
    console.error("SIP service not found");
    return;
  }

  // Monitor all transfer-related events
  const events = [
    "call:transfer_initiated",
    "call:transfer_accepted",
    "call:transfer_failed",
    "call:transfer_progress",
    "call:transfer_complete",
    "call:ended",
    "session:stateChange",
  ];

  events.forEach((event) => {
    sipService.events.on(event, (data) => {
      console.log(`[TRANSFER EVENT] ${event}:`, data);
    });
  });

  console.log("Transfer event monitoring started");
}

// Helper to check current session state
function checkSessionState() {
  const sipService = window.sipService || window.sipCallService;
  if (!sipService) {
    console.log("SIP service not found");
    return;
  }

  // Use getTransferState for comprehensive state info
  const transferState = sipService.getTransferState();
  console.log("Transfer state:", transferState);

  if (!transferState.currentSession) {
    console.log("No active session");
    return;
  }

  console.log("Current session state:", {
    id: transferState.currentSession.id,
    state: transferState.currentSession.state,
    hasDialog: transferState.currentSession.hasDialog,
    remoteIdentity: transferState.currentSession.remoteIdentity,
    canTransfer: transferState.canTransfer,
    transferState: transferState.transferState,
    isInConsultation: transferState.isInConsultation,
    consultationCall: transferState.consultationCall,
  });
}

// Helper to check attended transfer state
function checkAttendedTransferState() {
  const sipService = window.sipService || window.sipCallService;
  if (!sipService) {
    console.log("SIP service not found");
    return;
  }

  const transferState = sipService.getTransferState();
  
  if (!transferState.isInConsultation) {
    console.log("Not in attended transfer consultation");
    return;
  }

  console.log("Attended transfer state:", {
    transferId: transferState.consultationCall?.transferId,
    targetExtension: transferState.consultationCall?.targetExtension,
    startTime: transferState.consultationCall?.startTime,
    hasSession: transferState.consultationCall?.hasSession,
    hasOriginalSession: transferState.consultationCall?.hasOriginalSession,
    duration: transferState.consultationCall?.startTime 
      ? Math.floor((Date.now() - transferState.consultationCall.startTime) / 1000) + "s"
      : "N/A",
  });
}

// Helper to perform test transfer
async function testBlindTransfer(targetExtension) {
  const sipService = window.sipService || window.sipCallService;
  if (!sipService) {
    console.error("SIP service not found");
    return;
  }

  console.log("Starting blind transfer test to:", targetExtension);

  try {
    // Check state before transfer
    checkSessionState();

    // Get transfer state
    const transferState = sipService.getTransferState();
    console.log("Transfer state before:", transferState);

    if (!transferState.canTransfer) {
      console.error("Cannot transfer - session not ready");
      return;
    }

    // Attempt transfer
    console.log("Calling transferCall...");
    const result = await sipService.transferCall(targetExtension, "blind");
    console.log("Transfer result:", result);
  } catch (error) {
    console.error("Transfer test failed:", error);
    console.error("Error stack:", error.stack);
  }
}

// Helper to test attended transfer
async function testAttendedTransfer(targetExtension) {
  const sipService = window.sipService || window.sipCallService;
  if (!sipService) {
    console.error("SIP service not found");
    return;
  }

  console.log("Starting attended transfer test to:", targetExtension);

  try {
    checkSessionState();

    const transferState = sipService.getTransferState();
    if (!transferState.canTransfer) {
      console.error("Cannot transfer - session not ready");
      return;
    }

    console.log("Calling attendedTransfer...");
    const result = await sipService.attendedTransfer(targetExtension);
    console.log("Attended transfer initiated:", result);
    console.log("Now in consultation. Use completeAttendedTransfer() or cancelAttendedTransfer() to finish.");
  } catch (error) {
    console.error("Attended transfer test failed:", error);
  }
}

// Helper to complete attended transfer
async function completeAttendedTransfer() {
  const sipService = window.sipService || window.sipCallService;
  if (!sipService) {
    console.error("SIP service not found");
    return;
  }

  try {
    console.log("Completing attended transfer...");
    const result = await sipService.completeAttendedTransfer();
    console.log("Attended transfer completed:", result);
  } catch (error) {
    console.error("Complete attended transfer failed:", error);
  }
}

// Helper to cancel attended transfer
async function cancelAttendedTransfer() {
  const sipService = window.sipService || window.sipCallService;
  if (!sipService) {
    console.error("SIP service not found");
    return;
  }

  try {
    console.log("Cancelling attended transfer...");
    const result = await sipService.cancelAttendedTransfer();
    console.log("Attended transfer cancelled:", result);
  } catch (error) {
    console.error("Cancel attended transfer failed:", error);
  }
}

// Run comprehensive capability check
async function runCapabilityCheck() {
  console.log("Running transfer capability check...");
  
  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
    overall: "unknown",
  };

  const sipService = window.sipService || window.sipCallService;
  
  // Check 1: SIP Service Available
  report.checks.push({
    name: "SIP Service",
    status: sipService ? "pass" : "fail",
    message: sipService ? "SIP service is available" : "SIP service not found",
  });

  if (!sipService) {
    report.overall = "fail";
    console.log("❌ CAPABILITY CHECK FAILED - SIP service not available");
    return report;
  }

  // Check 2: Transfer State
  const transferState = sipService.getTransferState?.();
  report.checks.push({
    name: "Transfer State",
    status: transferState ? "pass" : "warning",
    message: transferState 
      ? `Transfer state: ${transferState.transferState}, Can transfer: ${transferState.canTransfer}`
      : "Could not get transfer state",
    details: transferState,
  });

  // Check 3: Current Session
  report.checks.push({
    name: "Active Session",
    status: transferState?.currentSession ? "pass" : "warning",
    message: transferState?.currentSession 
      ? `Active session with ${transferState.currentSession.remoteIdentity}`
      : "No active call session (make a call first to test transfers)",
  });

  // Check 4: Transfer Support
  const isSupported = sipService.isTransferSupported?.() || false;
  report.checks.push({
    name: "Transfer Support",
    status: isSupported ? "pass" : "warning",
    message: isSupported 
      ? "REFER method is available on current session"
      : "No active session or REFER not available",
  });

  // Check 5: Server Health
  try {
    const apiHost = window.location.hostname === "localhost" 
      ? "localhost:8004" 
      : "192.168.1.14";
    const apiProtocol = window.location.protocol === "https:" ? "https" : "http";
    
    const response = await fetch(`${apiProtocol}://${apiHost}/api/transfers/health`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      report.checks.push({
        name: "Server Health",
        status: result.data?.overall === "pass" ? "pass" : 
                result.data?.overall === "warning" ? "warning" : "fail",
        message: `Server transfer health: ${result.data?.overall || "unknown"}`,
        details: result.data?.summary,
      });
    } else {
      report.checks.push({
        name: "Server Health",
        status: "warning",
        message: `Server returned ${response.status}`,
      });
    }
  } catch (error) {
    report.checks.push({
      name: "Server Health",
      status: "warning",
      message: `Could not check server: ${error.message}`,
    });
  }

  // Calculate overall
  const failed = report.checks.filter(c => c.status === "fail").length;
  const warnings = report.checks.filter(c => c.status === "warning").length;
  
  if (failed > 0) {
    report.overall = "fail";
  } else if (warnings > 0) {
    report.overall = "warning";
  } else {
    report.overall = "pass";
  }

  // Print results
  console.log("\n========== TRANSFER CAPABILITY CHECK ==========");
  console.log(`Time: ${report.timestamp}`);
  console.log(`Overall: ${report.overall.toUpperCase()}`);
  console.log("");
  
  report.checks.forEach(check => {
    const icon = check.status === "pass" ? "✅" : 
                 check.status === "warning" ? "⚠️" : "❌";
    console.log(`${icon} ${check.name}: ${check.message}`);
    if (check.details) {
      console.log("   Details:", check.details);
    }
  });
  
  console.log("");
  if (report.overall === "pass") {
    console.log("✅ ALL CHECKS PASSED - Transfers should work correctly");
  } else if (report.overall === "warning") {
    console.log("⚠️ SOME WARNINGS - Review before testing transfers");
  } else {
    console.log("❌ CHECKS FAILED - Fix issues before testing transfers");
  }
  console.log("================================================\n");

  return report;
}

// Get transfer event log (if monitor service is available)
function getTransferLog() {
  if (window.transferMonitorService) {
    return window.transferMonitorService.getLog();
  }
  console.log("Transfer monitor service not available. Run monitor() first.");
  return [];
}

// Export transfer log for debugging
function exportTransferLog() {
  if (window.transferMonitorService) {
    const exported = window.transferMonitorService.exportLog();
    console.log("Transfer log exported:", exported);
    return exported;
  }
  console.log("Transfer monitor service not available.");
  return null;
}

// Export functions to window for easy access
window.transferDebug = {
  // Monitoring
  monitor: monitorTransferEvents,
  getLog: getTransferLog,
  exportLog: exportTransferLog,
  
  // State checking
  checkState: checkSessionState,
  checkAttended: checkAttendedTransferState,
  runCheck: runCapabilityCheck,
  
  // Testing
  testBlind: testBlindTransfer,
  testAttended: testAttendedTransfer,
  complete: completeAttendedTransfer,
  cancel: cancelAttendedTransfer,
};

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║         TRANSFER DEBUG TOOLS LOADED                        ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log("║ VERIFICATION:                                              ║");
console.log("║   transferDebug.runCheck()     - Full capability check     ║");
console.log("║   transferDebug.checkState()   - Check session state       ║");
console.log("║                                                            ║");
console.log("║ MONITORING:                                                ║");
console.log("║   transferDebug.monitor()      - Start event monitoring    ║");
console.log("║   transferDebug.getLog()       - Get transfer event log    ║");
console.log("║                                                            ║");
console.log("║ TESTING (requires active call):                            ║");
console.log("║   transferDebug.testBlind('1019')     - Blind transfer     ║");
console.log("║   transferDebug.testAttended('1019')  - Attended transfer  ║");
console.log("║   transferDebug.complete()            - Complete attended  ║");
console.log("║   transferDebug.cancel()              - Cancel attended    ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log("");
console.log("💡 TIP: Run transferDebug.runCheck() first to verify capability");
