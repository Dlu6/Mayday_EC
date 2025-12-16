import express from "express";
import {
  getComprehensiveDataToolMetrics,
  downloadComprehensiveDataToolReport,
} from "../controllers/enhancedDataToolController.js";

const router = express.Router();

/**
 * @swagger
 * /api/enhanced-datatool/metrics:
 *   get:
 *     summary: Get comprehensive datatool metrics
 *     description: Retrieve comprehensive analytics combining datatool and call center data
 *     tags: [Enhanced DataTool]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Comprehensive datatool metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportInfo:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     period:
 *                       type: object
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                 datatoolAnalytics:
 *                   type: object
 *                 callCenterAnalytics:
 *                   type: object
 *                 integratedInsights:
 *                   type: object
 *                 recommendations:
 *                   type: array
 *       500:
 *         description: Internal server error
 */
router.get("/metrics", getComprehensiveDataToolMetrics);

/**
 * @swagger
 * /api/enhanced-datatool/download:
 *   get:
 *     summary: Download comprehensive datatool report
 *     description: Download a comprehensive datatool report in CSV or JSON format
 *     tags: [Enhanced DataTool]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (ISO 8601 format)
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Output format for the report
 *     responses:
 *       200:
 *         description: Report downloaded successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request - missing required parameters
 *       500:
 *         description: Internal server error
 */
router.get("/download", downloadComprehensiveDataToolReport);

export default router;
