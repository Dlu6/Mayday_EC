// server/services/pauseSchedulerService.js
// Service to handle automatic unpause when pause duration expires

import { AgentPauseLog, PauseReason } from "../models/pauseReasonModel.js";
import QueueMember from "../models/queueMemberModel.js";
import UserModel from "../models/UsersModel.js";
import amiService from "./amiService.js";
import { EventBusService } from "./eventBus.js";
import sequelizePkg from "sequelize";
const { Op } = sequelizePkg;

// Store active timers for each paused agent
const pauseTimers = new Map();

/**
 * Schedule auto-unpause for an agent based on pause reason's max duration
 */
export const scheduleAutoUnpause = (extension, pauseReason, pauseLogId) => {
  // Clear any existing timer for this extension
  clearAutoUnpause(extension);

  // If no max duration, don't schedule auto-unpause
  if (!pauseReason.maxDurationMinutes) {
    console.log(`[PauseScheduler] No max duration for ${pauseReason.code}, skipping auto-unpause`);
    return;
  }

  const durationMs = pauseReason.maxDurationMinutes * 60 * 1000;
  console.log(`[PauseScheduler] Scheduling auto-unpause for ${extension} in ${pauseReason.maxDurationMinutes} minutes`);

  const timer = setTimeout(async () => {
    try {
      console.log(`[PauseScheduler] Auto-unpausing ${extension} - max duration reached`);
      await autoUnpauseAgent(extension, pauseLogId);
    } catch (error) {
      console.error(`[PauseScheduler] Error auto-unpausing ${extension}:`, error);
    }
  }, durationMs);

  pauseTimers.set(extension, {
    timer,
    pauseLogId,
    scheduledUnpauseTime: new Date(Date.now() + durationMs),
  });
};

/**
 * Clear scheduled auto-unpause for an agent
 */
export const clearAutoUnpause = (extension) => {
  const timerInfo = pauseTimers.get(extension);
  if (timerInfo) {
    clearTimeout(timerInfo.timer);
    pauseTimers.delete(extension);
    console.log(`[PauseScheduler] Cleared auto-unpause timer for ${extension}`);
  }
};

/**
 * Auto-unpause an agent
 */
const autoUnpauseAgent = async (extension, pauseLogId) => {
  try {
    // Get the agent's queues
    const queueMembers = await QueueMember.findAll({
      where: { interface: `PJSIP/${extension}` },
      attributes: ["queue_name"],
      raw: true,
    });
    const queuesToUnpause = queueMembers.map((qm) => qm.queue_name);

    if (queuesToUnpause.length === 0) {
      queuesToUnpause.push("default");
    }

    // Update realtime database
    await QueueMember.update(
      { paused: false, paused_reason: null },
      { where: { interface: `PJSIP/${extension}` } }
    );

    // Execute AMI QueuePause (unpause) for each queue
    for (const queue of queuesToUnpause) {
      try {
        await amiService.executeAction({
          Action: "QueuePause",
          Queue: queue,
          Interface: `PJSIP/${extension}`,
          Paused: "0",
        });
        console.log(`[PauseScheduler] Successfully unpaused ${extension} in queue ${queue}`);
      } catch (amiError) {
        console.warn(`[PauseScheduler] Failed to unpause ${extension} in queue ${queue}:`, amiError.message);
      }
    }

    // Reload queues
    try {
      await amiService.executeAction({
        Action: "Command",
        Command: "queue reload all",
      });
    } catch (reloadError) {
      console.warn(`[PauseScheduler] Failed to reload queue:`, reloadError.message);
    }

    // Update pause log
    const activePauseLog = await AgentPauseLog.findOne({
      where: { extension, endTime: null },
      order: [["startTime", "DESC"]],
    });

    if (activePauseLog) {
      const endTime = new Date();
      const durationSeconds = Math.floor((endTime - activePauseLog.startTime) / 1000);
      await activePauseLog.update({
        endTime,
        durationSeconds,
        autoUnpaused: true,
      });
    }

    // Update user presence
    await UserModel.update(
      {
        presence: "READY",
        pauseReason: null,
        lastPresenceUpdate: new Date(),
      },
      { where: { extension } }
    );

    // Emit event
    EventBusService.emit("agent:unpaused", {
      extension,
      autoUnpaused: true,
      pauseDuration: activePauseLog?.durationSeconds || 0,
      timestamp: new Date().toISOString(),
    });

    // Clean up timer
    pauseTimers.delete(extension);

    console.log(`[PauseScheduler] Auto-unpause completed for ${extension}`);
  } catch (error) {
    console.error(`[PauseScheduler] Error in autoUnpauseAgent:`, error);
    throw error;
  }
};

/**
 * Get remaining pause time for an agent
 */
export const getRemainingPauseTime = (extension) => {
  const timerInfo = pauseTimers.get(extension);
  if (!timerInfo) return null;

  const remainingMs = timerInfo.scheduledUnpauseTime - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

/**
 * Check and restore timers on server restart
 */
export const restorePauseTimers = async () => {
  try {
    console.log("[PauseScheduler] Restoring pause timers from database...");

    // Find all active pause logs
    const activePauseLogs = await AgentPauseLog.findAll({
      where: { endTime: null },
      include: [{ model: PauseReason, as: "pauseReason" }],
    });

    for (const log of activePauseLogs) {
      if (!log.pauseReason?.maxDurationMinutes) continue;

      const elapsedMs = Date.now() - new Date(log.startTime).getTime();
      const maxDurationMs = log.pauseReason.maxDurationMinutes * 60 * 1000;
      const remainingMs = maxDurationMs - elapsedMs;

      if (remainingMs <= 0) {
        // Duration already expired, unpause immediately
        console.log(`[PauseScheduler] Pause expired for ${log.extension}, unpausing now`);
        await autoUnpauseAgent(log.extension, log.id);
      } else {
        // Schedule unpause for remaining time
        console.log(`[PauseScheduler] Restoring timer for ${log.extension}, ${Math.ceil(remainingMs / 60000)} minutes remaining`);
        
        const timer = setTimeout(async () => {
          try {
            await autoUnpauseAgent(log.extension, log.id);
          } catch (error) {
            console.error(`[PauseScheduler] Error auto-unpausing ${log.extension}:`, error);
          }
        }, remainingMs);

        pauseTimers.set(log.extension, {
          timer,
          pauseLogId: log.id,
          scheduledUnpauseTime: new Date(Date.now() + remainingMs),
        });
      }
    }

    console.log(`[PauseScheduler] Restored ${pauseTimers.size} pause timers`);
  } catch (error) {
    console.error("[PauseScheduler] Error restoring pause timers:", error);
  }
};

/**
 * Get all active pause timers info
 */
export const getActivePauseTimers = () => {
  const timers = [];
  for (const [extension, info] of pauseTimers.entries()) {
    timers.push({
      extension,
      scheduledUnpauseTime: info.scheduledUnpauseTime,
      remainingSeconds: getRemainingPauseTime(extension),
    });
  }
  return timers;
};

export default {
  scheduleAutoUnpause,
  clearAutoUnpause,
  getRemainingPauseTime,
  restorePauseTimers,
  getActivePauseTimers,
};
