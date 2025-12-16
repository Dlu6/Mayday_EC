// server/routes/pauseRoutes.js
import express from "express";
import {
  getPauseReasons,
  createPauseReason,
  updatePauseReason,
  deletePauseReason,
  pauseAgent,
  unpauseAgent,
  getAgentPauseStatus,
  getAgentPauseHistory,
  getPausedAgents,
  getAllPauseLogs,
} from "../controllers/pauseController.js";
import { sipAuthMiddleware } from "../middleware/sipAuth.js";

const router = express.Router();

/**
 * @swagger
 * /api/pause/reasons:
 *   get:
 *     summary: Get all active pause reasons
 *     tags: [Pause]
 *     responses:
 *       200:
 *         description: List of pause reasons
 */
router.get("/reasons", getPauseReasons);

/**
 * @swagger
 * /api/pause/reasons:
 *   post:
 *     summary: Create a new pause reason (admin only)
 *     tags: [Pause]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - label
 *             properties:
 *               code:
 *                 type: string
 *               label:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *               icon:
 *                 type: string
 *               maxDurationMinutes:
 *                 type: integer
 *               requiresApproval:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Pause reason created
 */
router.post("/reasons", sipAuthMiddleware, createPauseReason);

/**
 * @swagger
 * /api/pause/reasons/{id}:
 *   put:
 *     summary: Update a pause reason (admin only)
 *     tags: [Pause]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pause reason updated
 */
router.put("/reasons/:id", sipAuthMiddleware, updatePauseReason);

/**
 * @swagger
 * /api/pause/reasons/{id}:
 *   delete:
 *     summary: Deactivate a pause reason (admin only)
 *     tags: [Pause]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pause reason deactivated
 */
router.delete("/reasons/:id", sipAuthMiddleware, deletePauseReason);

/**
 * @swagger
 * /api/pause/agent:
 *   post:
 *     summary: Pause an agent with a specific reason
 *     tags: [Pause]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - extension
 *               - reasonCode
 *             properties:
 *               extension:
 *                 type: string
 *                 description: Agent extension number
 *               reasonCode:
 *                 type: string
 *                 description: Pause reason code (e.g., BREAK, LUNCH)
 *               queueName:
 *                 type: string
 *                 description: Optional specific queue to pause in
 *     responses:
 *       200:
 *         description: Agent paused successfully
 */
router.post("/agent", sipAuthMiddleware, pauseAgent);

/**
 * @swagger
 * /api/pause/agent/unpause:
 *   post:
 *     summary: Unpause an agent (resume work)
 *     tags: [Pause]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - extension
 *             properties:
 *               extension:
 *                 type: string
 *                 description: Agent extension number
 *               queueName:
 *                 type: string
 *                 description: Optional specific queue to unpause in
 *     responses:
 *       200:
 *         description: Agent unpaused successfully
 */
router.post("/agent/unpause", sipAuthMiddleware, unpauseAgent);

/**
 * @swagger
 * /api/pause/agent/{extension}/status:
 *   get:
 *     summary: Get current pause status for an agent
 *     tags: [Pause]
 *     parameters:
 *       - in: path
 *         name: extension
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent pause status
 */
router.get("/agent/:extension/status", getAgentPauseStatus);

/**
 * @swagger
 * /api/pause/agent/{extension}/history:
 *   get:
 *     summary: Get pause history for an agent
 *     tags: [Pause]
 *     parameters:
 *       - in: path
 *         name: extension
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Agent pause history
 */
router.get("/agent/:extension/history", getAgentPauseHistory);

/**
 * @swagger
 * /api/pause/agents/paused:
 *   get:
 *     summary: Get all currently paused agents
 *     tags: [Pause]
 *     responses:
 *       200:
 *         description: List of paused agents
 */
router.get("/agents/paused", getPausedAgents);

/**
 * @swagger
 * /api/pause/logs:
 *   get:
 *     summary: Get all pause logs for auditing
 *     tags: [Pause]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: extension
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Pause logs retrieved successfully
 */
router.get("/logs", sipAuthMiddleware, getAllPauseLogs);

/**
 * @swagger
 * /api/pause/debug/{extension}:
 *   get:
 *     summary: Debug pause status for an agent (checks DB and AMI)
 *     tags: [Pause]
 *     parameters:
 *       - in: path
 *         name: extension
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Debug information about pause status
 */
router.get("/debug/:extension", async (req, res) => {
  try {
    const { extension } = req.params;
    const amiService = (await import("../services/amiService.js")).default;
    const QueueMember = (await import("../models/queueMemberModel.js")).default;
    const { AgentPauseLog } = await import("../models/pauseReasonModel.js");

    // Get queue member status from database
    const queueMembers = await QueueMember.findAll({
      where: { interface: `PJSIP/${extension}` },
      raw: true,
    });

    // Get active pause log
    const activePauseLog = await AgentPauseLog.findOne({
      where: { extension, endTime: null },
      order: [["startTime", "DESC"]],
    });

    // Get queue status from AMI
    let amiQueueStatus = null;
    try {
      amiQueueStatus = await amiService.executeAction({
        Action: "QueueStatus",
        Member: `PJSIP/${extension}`,
      });
    } catch (amiError) {
      amiQueueStatus = { error: amiError.message };
    }

    res.json({
      success: true,
      data: {
        extension,
        databaseStatus: {
          queueMembers,
          activePauseLog: activePauseLog ? {
            id: activePauseLog.id,
            startTime: activePauseLog.startTime,
            pauseReasonCode: activePauseLog.pauseReasonCode,
          } : null,
        },
        amiStatus: amiQueueStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
