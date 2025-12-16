// server/controllers/pauseController.js
import {
  PauseReason,
  AgentPauseLog,
  DEFAULT_PAUSE_REASONS,
} from "../models/pauseReasonModel.js";
import amiService from "../services/amiService.js";
import { EventBusService } from "../services/eventBus.js";
import UserModel from "../models/UsersModel.js";
import QueueMember from "../models/queueMemberModel.js";
import pauseSchedulerService from "../services/pauseSchedulerService.js";

/**
 * Get all active pause reasons
 */
export const getPauseReasons = async (req, res) => {
  try {
    const reasons = await PauseReason.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"]],
    });

    res.json({
      success: true,
      data: reasons,
      message: "Pause reasons retrieved successfully",
    });
  } catch (error) {
    console.error("[Pause] Error fetching pause reasons:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pause reasons",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Create a new pause reason (admin only)
 */
export const createPauseReason = async (req, res) => {
  try {
    const { code, label, description, color, icon, maxDurationMinutes, requiresApproval, sortOrder } = req.body;

    if (!code || !label) {
      return res.status(400).json({
        success: false,
        message: "Code and label are required",
      });
    }

    const existing = await PauseReason.findOne({ where: { code } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Pause reason with this code already exists",
      });
    }

    const reason = await PauseReason.create({
      code: code.toUpperCase(),
      label,
      description,
      color: color || "#ff9800",
      icon: icon || "pause",
      maxDurationMinutes,
      requiresApproval: requiresApproval || false,
      sortOrder: sortOrder || 0,
    });

    res.status(201).json({
      success: true,
      data: reason,
      message: "Pause reason created successfully",
    });
  } catch (error) {
    console.error("[Pause] Error creating pause reason:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create pause reason",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Update a pause reason (admin only)
 */
export const updatePauseReason = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const reason = await PauseReason.findByPk(id);
    if (!reason) {
      return res.status(404).json({
        success: false,
        message: "Pause reason not found",
      });
    }

    await reason.update(updates);

    res.json({
      success: true,
      data: reason,
      message: "Pause reason updated successfully",
    });
  } catch (error) {
    console.error("[Pause] Error updating pause reason:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update pause reason",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Delete a pause reason (admin only)
 */
export const deletePauseReason = async (req, res) => {
  try {
    const { id } = req.params;

    const reason = await PauseReason.findByPk(id);
    if (!reason) {
      return res.status(404).json({
        success: false,
        message: "Pause reason not found",
      });
    }

    // Soft delete by setting isActive to false
    await reason.update({ isActive: false });

    res.json({
      success: true,
      message: "Pause reason deactivated successfully",
    });
  } catch (error) {
    console.error("[Pause] Error deleting pause reason:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete pause reason",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Pause an agent with a specific reason
 * This is the main function that integrates with AMI QueuePause
 */
export const pauseAgent = async (req, res) => {
  try {
    const { extension, reasonCode, queueName } = req.body;

    if (!extension || !reasonCode) {
      return res.status(400).json({
        success: false,
        message: "Extension and reason code are required",
      });
    }

    console.log(
      `[Pause] Pausing agent ${extension} with reason: ${reasonCode}`
    );

    // Validate the pause reason exists
    const pauseReason = await PauseReason.findOne({
      where: { code: reasonCode, isActive: true },
    });

    if (!pauseReason) {
      return res.status(400).json({
        success: false,
        message: "Invalid pause reason code",
      });
    }

    // Get agent's assigned queues if no specific queue provided
    let queuesToPause = [];
    if (queueName) {
      queuesToPause = [queueName];
    } else {
      // Get all queues the agent is a member of
      const queueMembers = await QueueMember.findAll({
        where: { interface: `PJSIP/${extension}` },
        attributes: ["queue_name"],
        raw: true,
      });
      queuesToPause = queueMembers.map((qm) => qm.queue_name);
    }

    // If no queues found, try default queue
    if (queuesToPause.length === 0) {
      queuesToPause = ["default"];
    }

    // Update the realtime database first (queue_members.paused = true, paused_reason = code)
    try {
      await QueueMember.update(
        { 
          paused: true,
          paused_reason: pauseReason.code,
        },
        { where: { interface: `PJSIP/${extension}` } }
      );
      console.log(`[Pause] Updated realtime database for ${extension} - paused=true, reason=${pauseReason.code}`);
    } catch (dbError) {
      console.warn(`[Pause] Failed to update realtime database:`, dbError.message);
    }

    // Execute AMI QueuePause for each queue (this reloads from realtime DB)
    const pauseResults = [];
    for (const queue of queuesToPause) {
      try {
        const result = await amiService.executeAction({
          Action: "QueuePause",
          Queue: queue,
          Interface: `PJSIP/${extension}`,
          Paused: "1",
          Reason: pauseReason.label,
        });
        pauseResults.push({ queue, success: true, result });
        console.log(`[Pause] Successfully paused ${extension} in queue ${queue}`);
      } catch (amiError) {
        console.warn(
          `[Pause] Failed to pause ${extension} in queue ${queue}:`,
          amiError.message
        );
        pauseResults.push({ queue, success: false, error: amiError.message });
      }
    }

    // Reload queue to ensure Asterisk picks up the realtime DB change
    try {
      await amiService.executeAction({
        Action: "Command",
        Command: "queue reload all",
      });
      console.log(`[Pause] Queue reloaded after pause`);
    } catch (reloadError) {
      console.warn(`[Pause] Failed to reload queue:`, reloadError.message);
    }

    // Create pause log entry
    const pauseLog = await AgentPauseLog.create({
      extension,
      pauseReasonId: pauseReason.id,
      pauseReasonCode: pauseReason.code,
      pauseReasonLabel: pauseReason.label,
      startTime: new Date(),
      queueName: queuesToPause.join(","),
    });

    // Schedule auto-unpause if the pause reason has a max duration
    if (pauseReason.maxDurationMinutes) {
      pauseSchedulerService.scheduleAutoUnpause(extension, pauseReason, pauseLog.id);
      console.log(`[Pause] Scheduled auto-unpause for ${extension} in ${pauseReason.maxDurationMinutes} minutes`);
    }

    // Update user presence in database
    await UserModel.update(
      {
        presence: "PAUSED",
        pauseReason: pauseReason.code,
        lastPresenceUpdate: new Date(),
      },
      { where: { extension } }
    );

    // Emit real-time event for dashboards
    EventBusService.emit("agent:paused", {
      extension,
      pauseReason: {
        code: pauseReason.code,
        label: pauseReason.label,
        color: pauseReason.color,
        icon: pauseReason.icon,
      },
      startTime: pauseLog.startTime,
      queues: queuesToPause,
      timestamp: new Date().toISOString(),
    });

    // Also emit general status change
    EventBusService.emit("agent:status", {
      extension,
      data: {
        status: "Paused",
        pauseReason: pauseReason.code,
        pauseReasonLabel: pauseReason.label,
        timestamp: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: `Agent ${extension} paused successfully`,
      data: {
        extension,
        pauseReason: {
          code: pauseReason.code,
          label: pauseReason.label,
          color: pauseReason.color,
        },
        pauseLogId: pauseLog.id,
        queues: queuesToPause,
        pauseResults,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Pause] Error pausing agent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to pause agent",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Unpause an agent (resume work)
 */
export const unpauseAgent = async (req, res) => {
  try {
    const { extension, queueName } = req.body;

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension is required",
      });
    }

    console.log(`[Pause] Unpausing agent ${extension}`);

    // Clear any scheduled auto-unpause timer
    pauseSchedulerService.clearAutoUnpause(extension);

    // Get agent's assigned queues if no specific queue provided
    let queuesToUnpause = [];
    if (queueName) {
      queuesToUnpause = [queueName];
    } else {
      const queueMembers = await QueueMember.findAll({
        where: { interface: `PJSIP/${extension}` },
        attributes: ["queue_name"],
        raw: true,
      });
      queuesToUnpause = queueMembers.map((qm) => qm.queue_name);
    }

    if (queuesToUnpause.length === 0) {
      queuesToUnpause = ["default"];
    }

    // Update the realtime database first (queue_members.paused = false, clear reason)
    try {
      await QueueMember.update(
        { 
          paused: false,
          paused_reason: null,
        },
        { where: { interface: `PJSIP/${extension}` } }
      );
      console.log(`[Pause] Updated realtime database for ${extension} - paused=false, reason cleared`);
    } catch (dbError) {
      console.warn(`[Pause] Failed to update realtime database:`, dbError.message);
    }

    // Execute AMI QueuePause (unpause) for each queue
    const unpauseResults = [];
    for (const queue of queuesToUnpause) {
      try {
        const result = await amiService.executeAction({
          Action: "QueuePause",
          Queue: queue,
          Interface: `PJSIP/${extension}`,
          Paused: "0",
        });
        unpauseResults.push({ queue, success: true, result });
        console.log(`[Pause] Successfully unpaused ${extension} in queue ${queue}`);
      } catch (amiError) {
        console.warn(
          `[Pause] Failed to unpause ${extension} in queue ${queue}:`,
          amiError.message
        );
        unpauseResults.push({ queue, success: false, error: amiError.message });
      }
    }

    // Reload queue to ensure Asterisk picks up the realtime DB change
    try {
      await amiService.executeAction({
        Action: "Command",
        Command: "queue reload all",
      });
      console.log(`[Pause] Queue reloaded after unpause`);
    } catch (reloadError) {
      console.warn(`[Pause] Failed to reload queue:`, reloadError.message);
    }

    // Find and close the active pause log
    const activePauseLog = await AgentPauseLog.findOne({
      where: { extension, endTime: null },
      order: [["startTime", "DESC"]],
    });

    if (activePauseLog) {
      const endTime = new Date();
      const durationSeconds = Math.floor(
        (endTime - activePauseLog.startTime) / 1000
      );
      await activePauseLog.update({
        endTime,
        durationSeconds,
      });
    }

    // Update user presence in database
    await UserModel.update(
      {
        presence: "READY",
        pauseReason: null,
        lastPresenceUpdate: new Date(),
      },
      { where: { extension } }
    );

    // Emit real-time event for dashboards
    EventBusService.emit("agent:unpaused", {
      extension,
      queues: queuesToUnpause,
      pauseDuration: activePauseLog?.durationSeconds || 0,
      timestamp: new Date().toISOString(),
    });

    // Also emit general status change
    EventBusService.emit("agent:status", {
      extension,
      data: {
        status: "Available",
        pauseReason: null,
        timestamp: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: `Agent ${extension} unpaused successfully`,
      data: {
        extension,
        queues: queuesToUnpause,
        unpauseResults,
        pauseDuration: activePauseLog?.durationSeconds || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Pause] Error unpausing agent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unpause agent",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Get current pause status for an agent
 */
export const getAgentPauseStatus = async (req, res) => {
  try {
    const { extension } = req.params;

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension is required",
      });
    }

    // Get active pause log
    const activePauseLog = await AgentPauseLog.findOne({
      where: { extension, endTime: null },
      include: [{ model: PauseReason, as: "pauseReason" }],
      order: [["startTime", "DESC"]],
    });

    // Get user presence from database
    const user = await UserModel.findOne({
      where: { extension },
      attributes: ["presence", "pauseReason", "lastPresenceUpdate"],
    });

    // Also check realtime database (queue_members) for pause status
    const queueMemberStatus = await QueueMember.findOne({
      where: { interface: `PJSIP/${extension}` },
      attributes: ["paused", "paused_reason"],
    });

    // Determine if paused from either source
    const isPausedFromLog = !!activePauseLog;
    const isPausedFromQueue = queueMemberStatus?.paused === true;
    const isPaused = isPausedFromLog || isPausedFromQueue;

    const pauseDuration = isPausedFromLog
      ? Math.floor((new Date() - activePauseLog.startTime) / 1000)
      : 0;

    res.json({
      success: true,
      data: {
        extension,
        isPaused,
        presence: user?.presence || "UNKNOWN",
        pauseReason: activePauseLog?.pauseReason || null,
        pauseReasonCode: queueMemberStatus?.paused_reason || null,
        pauseStartTime: activePauseLog?.startTime || null,
        pauseDurationSeconds: pauseDuration,
        lastPresenceUpdate: user?.lastPresenceUpdate || null,
        queuePauseStatus: {
          paused: queueMemberStatus?.paused || false,
          reason: queueMemberStatus?.paused_reason || null,
        },
      },
    });
  } catch (error) {
    console.error("[Pause] Error getting pause status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pause status",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Get pause history for an agent
 */
export const getAgentPauseHistory = async (req, res) => {
  try {
    const { extension } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension is required",
      });
    }

    const whereClause = { extension };

    if (startDate) {
      whereClause.startTime = { $gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.startTime = {
        ...whereClause.startTime,
        $lte: new Date(endDate),
      };
    }

    const pauseLogs = await AgentPauseLog.findAll({
      where: whereClause,
      include: [{ model: PauseReason, as: "pauseReason" }],
      order: [["startTime", "DESC"]],
      limit: parseInt(limit),
    });

    // Calculate total pause time
    const totalPauseSeconds = pauseLogs.reduce((sum, log) => {
      return sum + (log.durationSeconds || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        extension,
        pauseLogs,
        totalPauseSeconds,
        totalPauseFormatted: formatDuration(totalPauseSeconds),
        count: pauseLogs.length,
      },
    });
  } catch (error) {
    console.error("[Pause] Error getting pause history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pause history",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Get all pause logs (for auditing)
 */
export const getAllPauseLogs = async (req, res) => {
  try {
    const { startDate, endDate, extension, limit = 100, offset = 0 } = req.query;
    const { Op } = require("sequelize");

    const whereClause = {};

    if (extension) {
      whereClause.extension = extension;
    }

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) {
        whereClause.startTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.startTime[Op.lte] = end;
      }
    }

    const { count, rows: pauseLogs } = await AgentPauseLog.findAndCountAll({
      where: whereClause,
      include: [{ model: PauseReason, as: "pauseReason" }],
      order: [["startTime", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculate total pause time for filtered results
    const totalPauseSeconds = pauseLogs.reduce((sum, log) => {
      return sum + (log.durationSeconds || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        pauseLogs,
        totalPauseSeconds,
        totalPauseFormatted: formatDuration(totalPauseSeconds),
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + pauseLogs.length < count,
        },
      },
    });
  } catch (error) {
    console.error("[Pause] Error getting all pause logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pause logs",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Get all currently paused agents
 */
export const getPausedAgents = async (req, res) => {
  try {
    const pausedAgents = await AgentPauseLog.findAll({
      where: { endTime: null },
      include: [{ model: PauseReason, as: "pauseReason" }],
      order: [["startTime", "ASC"]],
    });

    const enrichedAgents = pausedAgents.map((log) => ({
      extension: log.extension,
      pauseReason: log.pauseReason,
      startTime: log.startTime,
      durationSeconds: Math.floor((new Date() - log.startTime) / 1000),
      durationFormatted: formatDuration(
        Math.floor((new Date() - log.startTime) / 1000)
      ),
    }));

    res.json({
      success: true,
      data: enrichedAgents,
      count: enrichedAgents.length,
    });
  } catch (error) {
    console.error("[Pause] Error getting paused agents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get paused agents",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default {
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
};
