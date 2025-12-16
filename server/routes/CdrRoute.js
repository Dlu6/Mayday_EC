import express from "express";
import {
  getCallHistory,
  getCallCountsByExtension,
} from "../controllers/cdrController.js";
import { sipAuthMiddleware } from "../middleware/sipAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/cdr/call-history:
 *   get:
 *     summary: Get call history records
 *     tags: [CDR]
 *     parameters:
 *       - in: query
 *         name: extension
 *         schema:
 *           type: string
 *         description: Filter by extension
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit the number of records returned
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Call history records retrieved successfully
 */
router.get("/call-history", getCallHistory);

// Get call history with pagination and filtering
router.get("/history", sipAuthMiddleware, getCallHistory);

/**
 * @swagger
 * /api/cdr/counts:
 *   get:
 *     summary: Get call counts by extension
 *     tags: [CDR]
 *     parameters:
 *       - in: query
 *         name: extension
 *         schema:
 *           type: string
 *         required: true
 *         description: Extension to get call counts for
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering calls (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering calls (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Call counts retrieved successfully
 */
router.get("/counts", sipAuthMiddleware, getCallCountsByExtension);

export default router;
