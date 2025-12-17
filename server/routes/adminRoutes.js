import express from "express";
import adminStatsController from "../controllers/adminStatsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authMiddleware);

// Call statistics routes
router.get("/call-stats", adminStatsController.getCallStats);
router.get("/queue-activity", adminStatsController.getQueueActivity);
router.get("/historical-stats", adminStatsController.getHistoricalStats);
router.get("/abandon-rate-stats", adminStatsController.getAbandonRateStats);
router.get("/all-agents", adminStatsController.getAllAgentsWithStatus);

export default router;
