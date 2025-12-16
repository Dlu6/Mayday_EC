// server/controllers/transferHealthController.js
// Transfer Health Check Controller - Verifies transfer capability before production deployment
//
// This controller checks:
// 1. AMI connection status (via amiService.getState())
// 2. Extension registration status (from ps_contacts via amiService.getAllExtensionStatuses())
// 3. AMI action execution capability (tests that we can send commands)
//
// Note: Dialplan is stored in realtime database (voice_extensions), not static files,
// so we don't check ShowDialplan - we verify extensions are registered instead.

import amiService from "../services/amiService.js";
import logger from "../utils/logger.js";

/**
 * Comprehensive transfer health check endpoint
 * Tests all transfer prerequisites and returns detailed status
 */
export const checkTransferHealth = async (req, res) => {
  const healthReport = {
    timestamp: new Date().toISOString(),
    overall: "unknown",
    checks: {},
    recommendations: [],
    errors: [],
  };

  try {
    // 1. Check AMI Connection State
    healthReport.checks.amiConnection = checkAMIConnection();
    
    // 2. Check Extension Registration (from ps_contacts database)
    healthReport.checks.extensionRegistration = await checkExtensionRegistration();
    
    // 3. Check AMI Action Capability (can we execute commands?)
    healthReport.checks.amiActionCapability = await checkAMIActionCapability();

    // Calculate overall health
    const allChecks = Object.values(healthReport.checks);
    const passedChecks = allChecks.filter(c => c.status === "pass").length;
    const failedChecks = allChecks.filter(c => c.status === "fail").length;
    const warningChecks = allChecks.filter(c => c.status === "warning").length;

    if (failedChecks > 0) {
      healthReport.overall = "fail";
      healthReport.recommendations.push("Critical issues detected. Do NOT deploy to production until resolved.");
    } else if (warningChecks > 0) {
      healthReport.overall = "warning";
      healthReport.recommendations.push("Some warnings detected. Review before production deployment.");
    } else {
      healthReport.overall = "pass";
      healthReport.recommendations.push("All transfer checks passed. Safe to deploy to production.");
    }

    healthReport.summary = {
      total: allChecks.length,
      passed: passedChecks,
      failed: failedChecks,
      warnings: warningChecks,
    };

    const statusCode = healthReport.overall === "fail" ? 503 : 200;
    res.status(statusCode).json({
      success: healthReport.overall !== "fail",
      data: healthReport,
    });

  } catch (error) {
    logger.logError("Transfer health check failed", error);
    healthReport.overall = "error";
    healthReport.errors.push(error.message);
    res.status(500).json({
      success: false,
      data: healthReport,
      error: error.message,
    });
  }
};

/**
 * Test a simulated transfer (dry run without actual call)
 */
export const testTransferDryRun = async (req, res) => {
  const { fromExtension, toExtension } = req.body;

  if (!fromExtension || !toExtension) {
    return res.status(400).json({
      success: false,
      message: "fromExtension and toExtension are required",
    });
  }

  const testResult = {
    timestamp: new Date().toISOString(),
    fromExtension,
    toExtension,
    steps: [],
    overall: "unknown",
  };

  try {
    // Step 1: Verify source extension exists and is registered
    testResult.steps.push(await verifyExtensionRegistered(fromExtension, "source"));

    // Step 2: Verify target extension exists and is registered
    testResult.steps.push(await verifyExtensionRegistered(toExtension, "target"));

    // Step 3: Verify AMI can execute transfer actions
    testResult.steps.push(await verifyAMITransferCapability());

    // Calculate result
    const failedSteps = testResult.steps.filter(s => s.status === "fail");
    if (failedSteps.length > 0) {
      testResult.overall = "fail";
      testResult.message = `Transfer would fail: ${failedSteps.map(s => s.reason).join(", ")}`;
    } else {
      testResult.overall = "pass";
      testResult.message = `Transfer from ${fromExtension} to ${toExtension} is expected to succeed`;
    }

    res.json({
      success: testResult.overall === "pass",
      data: testResult,
    });

  } catch (error) {
    logger.logError("Transfer dry run failed", error);
    testResult.overall = "error";
    testResult.error = error.message;
    res.status(500).json({
      success: false,
      data: testResult,
    });
  }
};

/**
 * Get transfer capability report for all registered extensions
 */
export const getTransferCapabilityReport = async (req, res) => {
  try {
    const extensions = await amiService.getAllExtensionStatuses();
    
    const report = {
      timestamp: new Date().toISOString(),
      totalExtensions: 0,
      registeredExtensions: 0,
      transferCapable: 0,
      extensions: [],
    };

    if (Array.isArray(extensions)) {
      report.totalExtensions = extensions.length;
      
      for (const ext of extensions) {
        const extReport = {
          extension: ext.extension,
          registered: ext.isRegistered || false,
          status: ext.status,
          transferCapable: false,
          issues: [],
        };

        if (!ext.isRegistered) {
          extReport.issues.push("Not registered");
        } else {
          report.registeredExtensions++;
          
          // Check if extension can participate in transfers
          if (ext.status === "Available" || ext.status === "Registered" || ext.status === "On Call") {
            extReport.transferCapable = true;
            report.transferCapable++;
          } else {
            extReport.issues.push(`Status "${ext.status}" may not support transfers`);
          }
        }

        report.extensions.push(extReport);
      }
    }

    report.summary = {
      canTransfer: report.transferCapable > 1,
      message: report.transferCapable > 1 
        ? `${report.transferCapable} extensions can participate in transfers`
        : "Need at least 2 registered extensions for transfers",
    };

    res.json({
      success: true,
      data: report,
    });

  } catch (error) {
    logger.logError("Transfer capability report failed", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Helper functions

/**
 * Check AMI connection using amiService.getState()
 * This is a synchronous check of the cached connection state
 */
function checkAMIConnection() {
  try {
    const state = amiService.getState();
    const isConnected = state?.connected === true;
    
    return {
      name: "AMI Connection",
      status: isConnected ? "pass" : "fail",
      message: isConnected ? "AMI is connected" : "AMI is not connected",
      details: {
        connected: state?.connected,
        cacheSize: state?.cacheSize,
        lastCacheUpdate: state?.lastCacheUpdate,
      },
      critical: true,
    };
  } catch (error) {
    return {
      name: "AMI Connection",
      status: "fail",
      message: `AMI connection check failed: ${error.message}`,
      critical: true,
    };
  }
}

/**
 * Check extension registration from ps_contacts database
 * Uses amiService.getAllExtensionStatuses() which queries the database
 */
async function checkExtensionRegistration() {
  try {
    const extensions = await amiService.getAllExtensionStatuses();
    
    let registeredCount = 0;
    let totalCount = 0;
    const registeredExtensions = [];
    
    if (Array.isArray(extensions)) {
      totalCount = extensions.length;
      for (const ext of extensions) {
        if (ext.isRegistered) {
          registeredCount++;
          registeredExtensions.push(ext.extension);
        }
      }
    }

    const hasEnoughExtensions = registeredCount >= 2;
    
    return {
      name: "Extension Registration",
      status: hasEnoughExtensions ? "pass" : "warning",
      message: hasEnoughExtensions 
        ? `${registeredCount}/${totalCount} extensions registered (minimum 2 required for transfers)` 
        : `Only ${registeredCount}/${totalCount} extension(s) registered. Need at least 2 for transfers.`,
      details: { 
        registeredCount,
        totalCount,
        registeredExtensions: registeredExtensions.slice(0, 10), // Limit to first 10
      },
      critical: false,
    };
  } catch (error) {
    return {
      name: "Extension Registration",
      status: "fail",
      message: `Extension registration check failed: ${error.message}`,
      critical: true,
    };
  }
}

/**
 * Check that we can execute AMI actions
 * Uses a lightweight Ping action to verify AMI is responsive
 */
async function checkAMIActionCapability() {
  try {
    // Use Ping action - it's lightweight and always available
    const result = await amiService.executeAMIAction({
      Action: "Ping",
    });

    const isResponsive = result && result.Response === "Success";
    
    return {
      name: "AMI Action Capability",
      status: isResponsive ? "pass" : "fail",
      message: isResponsive 
        ? "AMI is responding to commands" 
        : "AMI is not responding to commands",
      details: {
        response: result?.Response,
        ping: result?.Ping,
      },
      critical: true,
    };
  } catch (error) {
    return {
      name: "AMI Action Capability",
      status: "fail",
      message: `AMI action check failed: ${error.message}`,
      critical: true,
    };
  }
}

async function verifyExtensionRegistered(extension, role) {
  try {
    const extensions = await amiService.getAllExtensionStatuses();
    
    let extStatus = null;
    if (Array.isArray(extensions)) {
      extStatus = extensions.find(e => String(e.extension) === String(extension));
    }

    if (!extStatus) {
      return {
        step: `Verify ${role} extension ${extension}`,
        status: "fail",
        reason: `Extension ${extension} not found`,
      };
    }

    if (!extStatus.isRegistered) {
      return {
        step: `Verify ${role} extension ${extension}`,
        status: "fail",
        reason: `Extension ${extension} is not registered`,
      };
    }

    return {
      step: `Verify ${role} extension ${extension}`,
      status: "pass",
      details: { status: extStatus.status },
    };
  } catch (error) {
    return {
      step: `Verify ${role} extension ${extension}`,
      status: "fail",
      reason: error.message,
    };
  }
}

async function verifyAMITransferCapability() {
  try {
    const state = amiService.getState();
    const isConnected = state?.connected === true;
    
    if (!isConnected) {
      return {
        step: "Verify AMI transfer capability",
        status: "fail",
        reason: "AMI is not connected",
      };
    }

    return {
      step: "Verify AMI transfer capability",
      status: "pass",
    };
  } catch (error) {
    return {
      step: "Verify AMI transfer capability",
      status: "fail",
      reason: error.message,
    };
  }
}

export default {
  checkTransferHealth,
  testTransferDryRun,
  getTransferCapabilityReport,
};
