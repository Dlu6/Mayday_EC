// routes/transferRoutes.js
import express from "express";
import {
  getTransferStats,
  getTransferHistory,
  getAgentTransferAnalytics,
  getTransferStatus,
  executeTransfer,
  getAvailableAgentsForTransfer,
  debugActiveChannels,
} from "../controllers/transferController.js";
import {
  checkTransferHealth,
  testTransferDryRun,
  getTransferCapabilityReport,
} from "../controllers/transferHealthController.js";
import logger from "../utils/logger.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ============ PUBLIC ENDPOINTS (no auth required) ============
// Health check endpoint - accessible without authentication for pre-deployment verification
router.get("/health", checkTransferHealth);

// Apply authentication middleware to remaining routes
router.use(authMiddleware);

// Get transfer statistics for today
router.get("/stats", getTransferStats);

// Get transfer history with optional date range
router.get("/history", getTransferHistory);

// Get transfer analytics for a specific agent
router.get("/analytics/:extension", getAgentTransferAnalytics);

// Get real-time transfer status
router.get("/status", getTransferStatus);

// Execute AMI-based call transfer
router.post("/execute", executeTransfer);

// Get available agents for transfer
router.get("/available-agents", getAvailableAgentsForTransfer);

// Debug endpoint to check active channels
router.get("/debug-channels", debugActiveChannels);

// ============ TRANSFER HEALTH CHECK ENDPOINTS (authenticated) ============
// These endpoints require authentication

// Test a transfer dry run (without making actual call)
router.post("/test-dry-run", testTransferDryRun);

// Get transfer capability report for all extensions
router.get("/capability-report", getTransferCapabilityReport);

// View logs endpoint
router.get("/logs/:type", (req, res) => {
  try {
    const { type } = req.params;
    const { lines = 100 } = req.query;

    const logPaths = logger.getLogFilePaths();
    const logFile = logPaths[type];

    if (!logFile) {
      return res.status(400).json({
        success: false,
        message: `Invalid log type. Available types: ${Object.keys(
          logPaths
        ).join(", ")}`,
      });
    }

    const recentLogs = logger.getRecentLogs(logFile, parseInt(lines));

    res.json({
      success: true,
      data: {
        logType: type,
        logFile: logFile,
        lines: parseInt(lines),
        content: recentLogs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to read logs",
      error: error.message,
    });
  }
});

// Clear logs endpoint
router.post("/logs/clear", (req, res) => {
  try {
    logger.clearLogs();
    res.json({
      success: true,
      message: "All logs cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to clear logs",
      error: error.message,
    });
  }
});

export default router;
