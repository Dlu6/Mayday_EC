import express from "express";
import {
  blindTransfer,
  managedTransfer,
  completeManagedTransfer,
  transferToQueue,
  getTransferStatus as getEnhancedTransferStatus,
  cancelTransfer as cancelEnhancedTransfer,
} from "../controllers/enhancedTransferController.js";
import {
  getTransferStats,
  getTransferHistory,
  getAgentTransferAnalytics,
  getTransferStatus as getLegacyTransferStatus,
  executeTransfer,
  getAvailableAgentsForTransfer,
  debugActiveChannels,
} from "../controllers/transferController.js";
import {
  checkTransferHealth,
} from "../controllers/transferHealthController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import amiService from "../services/amiService.js";

const router = express.Router();

/**
 * Enhanced Transfer Routes for Mayday CRM
 * Provides comprehensive call transfer functionality using AMI
 * Combines legacy and enhanced transfer features
 */

// ============ PUBLIC ENDPOINTS (no auth required) ============
// Health check endpoint - accessible without authentication for pre-deployment verification
router.get("/health", checkTransferHealth);

// Apply authentication middleware to remaining routes
router.use(authMiddleware);

// ========== LEGACY TRANSFER ROUTES (Maintained for compatibility) ==========

/**
 * @route   GET /api/transfers/stats
 * @desc    Get transfer statistics for today
 * @access  Private
 */
router.get("/stats", getTransferStats);

/**
 * @route   GET /api/transfers/history
 * @desc    Get transfer history with optional date range
 * @access  Private
 */
router.get("/history", getTransferHistory);

/**
 * @route   GET /api/transfers/analytics/:extension
 * @desc    Get transfer analytics for a specific agent
 * @access  Private
 */
router.get("/analytics/:extension", getAgentTransferAnalytics);

/**
 * @route   GET /api/transfers/status
 * @desc    Get real-time transfer status (legacy)
 * @access  Private
 */
router.get("/status", getLegacyTransferStatus);

/**
 * @route   POST /api/transfers/execute
 * @desc    Execute AMI-based call transfer (legacy)
 * @access  Private
 */
router.post("/execute", executeTransfer);

/**
 * @route   GET /api/transfers/available-agents
 * @desc    Get available agents for transfer
 * @access  Private
 */
router.get("/available-agents", getAvailableAgentsForTransfer);

/**
 * @route   GET /api/transfers/debug-channels
 * @desc    Debug endpoint to check active channels
 * @access  Private
 */
router.get("/debug-channels", debugActiveChannels);

// ========== ENHANCED TRANSFER ROUTES (New functionality) ==========

/**
 * @route   POST /api/transfers/blind
 * @desc    Execute blind transfer (immediate transfer without consultation)
 * @access  Private
 * @body    { channel, targetExtension, context? }
 */
router.post("/blind", blindTransfer);

/**
 * @route   POST /api/transfers/managed
 * @desc    Execute managed transfer (transfer with consultation)
 * @access  Private
 * @body    { originalChannel, targetExtension, context?, consultationTimeout? }
 */
router.post("/managed", managedTransfer);

/**
 * @route   POST /api/transfers/complete
 * @desc    Complete managed transfer by bridging calls
 * @access  Private
 * @body    { transferId, action }
 */
router.post("/complete", completeManagedTransfer);

/**
 * @route   POST /api/transfers/queue
 * @desc    Transfer call to a specific queue
 * @access  Private
 * @body    { channel, queueName, context? }
 */
router.post("/queue", transferToQueue);

/**
 * @route   GET /api/transfers/enhanced-status
 * @desc    Get enhanced transfer status and history
 * @access  Private
 * @query   { channel?, transferId? }
 */
router.get("/enhanced-status", getEnhancedTransferStatus);

/**
 * @route   DELETE /api/transfers/:transferId
 * @desc    Cancel an active transfer
 * @access  Private
 */
router.delete("/:transferId", cancelEnhancedTransfer);

// ========== CAPABILITIES ENDPOINTS ==========

/**
 * @route   GET /api/transfers/capabilities
 * @desc    Get transfer system capabilities and supported features
 * @access  Private
 */
router.get("/capabilities", (req, res) => {
  res.json({
    success: true,
    data: {
      transferTypes: [
        {
          type: "blind",
          description: "Immediate transfer without consultation",
          method: "POST",
          requiredFields: ["channel", "targetExtension"],
          optionalFields: ["context"],
        },
        {
          type: "managed",
          description: "Transfer with consultation and confirmation",
          method: "POST",
          requiredFields: ["originalChannel", "targetExtension"],
          optionalFields: ["context", "consultationTimeout"],
        },
        {
          type: "queue",
          description: "Transfer call to a specific queue",
          method: "POST",
          requiredFields: ["channel", "queueName"],
          optionalFields: ["context"],
        },
      ],
      supportedContexts: [
        "from-internal",
        "from-queue",
        "from-trunk",
        "from-external",
      ],
      maxConcurrentTransfers: 10,
      consultationTimeout: {
        default: 30000,
        unit: "milliseconds",
        description: "Default timeout for consultation calls",
      },
    },
  });
});

// ========== BULK TRANSFER OPERATIONS ==========

/**
 * @route   POST /api/transfers/bulk
 * @desc    Execute multiple transfers in a single request
 * @access  Private
 * @body    { transfers: Array<TransferRequest> }
 */
router.post("/bulk", async (req, res) => {
  try {
    const { transfers } = req.body;

    if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "transfers array is required and must not be empty",
      });
    }

    if (transfers.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 transfers allowed per batch",
      });
    }

    const results = [];
    const errors = [];

    for (const transfer of transfers) {
      try {
        let result;

        switch (transfer.type) {
          case "blind":
            result = await blindTransfer(
              { body: transfer },
              { json: (data) => data }
            );
            break;
          case "managed":
            result = await managedTransfer(
              { body: transfer },
              { json: (data) => data }
            );
            break;
          case "queue":
            result = await transferToQueue(
              { body: transfer },
              { json: (data) => data }
            );
            break;
          default:
            throw new Error(`Unsupported transfer type: ${transfer.type}`);
        }

        results.push({
          type: transfer.type,
          success: true,
          result,
        });
      } catch (error) {
        errors.push({
          type: transfer.type,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: transfers.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to execute bulk transfers",
      error: error.message,
    });
  }
});

// ========== STATISTICS AND ANALYTICS ==========

/**
 * @route   GET /api/transfers/enhanced-stats
 * @desc    Get enhanced transfer statistics
 * @access  Private
 * @query   { period? }
 */
router.get("/enhanced-stats", async (req, res) => {
  try {
    const { period = "daily" } = req.query;

    // This would typically query the database for transfer statistics
    // For now, return mock data
    const stats = {
      period,
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      averageTransferTime: 0,
      transferTypes: {
        blind: 0,
        managed: 0,
        queue: 0,
      },
      topTargets: [],
      transferTrends: [],
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get transfer statistics",
      error: error.message,
    });
  }
});

// ========== TESTING AND DEBUGGING ENDPOINTS ==========

/**
 * @route   POST /api/transfers/test
 * @desc    Test various transfer system components
 * @access  Private
 * @body    { testType, parameters? }
 */
router.post("/test", async (req, res) => {
  try {
    const { testType, parameters = {} } = req.body;

    // Only allow testing in development
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Test endpoints are not available in production",
      });
    }

    let testResult;

    switch (testType) {
      case "ami-connection":
        testResult = await testAMIConnection();
        break;
      case "channel-validation":
        testResult = await testChannelValidation(parameters.channel);
        break;
      case "transfer-simulation":
        testResult = await testTransferSimulation(parameters);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown test type: ${testType}`,
        });
    }

    res.json({
      success: true,
      data: {
        testType,
        parameters,
        result: testResult,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Test execution failed",
      error: error.message,
    });
  }
});

// ========== TEST HELPER FUNCTIONS ==========

async function testAMIConnection() {
  try {
    // Test AMI connection
    const response = await amiService.executeAMIAction({
      Action: "Ping",
    });

    return {
      status: "connected",
      message: "AMI connection test successful",
    };
  } catch (error) {
    return {
      status: "failed",
      message: error.message,
    };
  }
}

async function testChannelValidation(channel) {
  try {
    if (!channel) {
      return {
        status: "error",
        message: "No channel provided for validation test",
      };
    }

    // Simulate channel validation
    return {
      status: "success",
      message: `Channel validation test for ${channel}`,
      channel,
      valid: true,
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
    };
  }
}

async function testTransferSimulation(parameters) {
  try {
    // Simulate transfer operation
    return {
      status: "success",
      message: "Transfer simulation completed",
      parameters,
      simulatedResult: {
        Response: "Success",
        Message: "Transfer simulated successfully",
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
    };
  }
}

export default router;
