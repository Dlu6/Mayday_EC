import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import {
  getBillingAnalysis,
  getCallDetail,
  getCallVolumeAnalytics,
  getCustomReport,
  getPerformanceMetrics,
  getQualityMetrics,
  getQueueAnalytics,
  getSystemHealthMetrics,
  downloadReport,
  getCallVolume,
  getAgentPerformance,
  getQueueDistribution,
  getSLACompliance,
  exportReport,
} from "../controllers/reportsController.js";
import { validateDateRange } from "../middleware/dateValidation.js";

const router = express.Router();

// Base route prefix: /api/v1/reports

// Call Detail Reports
router.get("/calls/:callId", authMiddleware, getCallDetail);

// Quality Metrics
router.get("/quality", authMiddleware, validateDateRange, getQualityMetrics);

// Call Volume Analytics
router.get(
  "/volume",
  authMiddleware,
  validateDateRange,
  getCallVolumeAnalytics
);

// Billing Analysis
router.get("/billing", authMiddleware, validateDateRange, getBillingAnalysis);

// Performance Metrics
router.get(
  "/performance",
  authMiddleware,
  validateDateRange,
  getPerformanceMetrics
);

// Queue Analytics
router.get("/queues", authMiddleware, validateDateRange, getQueueAnalytics);

// Custom Reports
router.post("/custom", authMiddleware, validateDateRange, getCustomReport);

// System Health Metrics
router.get(
  "/system-health",
  authMiddleware,
  validateDateRange,
  getSystemHealthMetrics
);

router.get(
  "/:type/download",
  authMiddleware,
  validateDateRange,
  downloadReport
);

/**
 * @swagger
 * /api/reports/call-volume:
 *   get:
 *     tags: [Reports]
 *     summary: Get call volume data
 *     description: Retrieves call volume data for the specified date range
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Call volume data
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get("/call-volume", authMiddleware, getCallVolume);

/**
 * @swagger
 * /api/reports/agent-performance:
 *   get:
 *     tags: [Reports]
 *     summary: Get agent performance data
 *     description: Retrieves agent performance metrics for the specified date range
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Agent performance data
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get("/agent-performance", authMiddleware, getAgentPerformance);

/**
 * @swagger
 * /api/reports/queue-distribution:
 *   get:
 *     tags: [Reports]
 *     summary: Get queue distribution data
 *     description: Retrieves call distribution across different queues
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Queue distribution data
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get("/queue-distribution", authMiddleware, getQueueDistribution);

/**
 * @swagger
 * /api/reports/sla-compliance:
 *   get:
 *     tags: [Reports]
 *     summary: Get SLA compliance data
 *     description: Retrieves SLA compliance metrics by hour
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: SLA compliance data
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get("/sla-compliance", authMiddleware, getSLACompliance);

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     tags: [Reports]
 *     summary: Export report data as CSV
 *     description: Exports report data in CSV format for download
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [call-volume, agent-performance, queue-metrics, datatool, datatool-all-time]
 *         required: true
 *         description: Type of report to export
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get("/export", authMiddleware, exportReport);

export default router;
