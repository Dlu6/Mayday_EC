// electron-softphone/src/services/pauseService.js
import { EventEmitter } from "events";
import { storageService } from "./storageService";
import logoutManager from "./logoutManager";
import serverConfig from "../config/serverConfig";

/**
 * Pause Service - Manages agent pause/break functionality
 * Integrates with backend AMI QueuePause for queue management
 */

// Use centralized server configuration
const baseUrl = `${serverConfig.apiUrl}/api/pause`;

const eventEmitter = new EventEmitter();

// Local state
const state = {
  isPaused: false,
  pauseReason: null,
  pauseStartTime: null,
  pauseReasons: [],
  pauseReasonsLoaded: false,
};

/**
 * Fetch available pause reasons from backend
 */
const getPauseReasons = async () => {
  if (logoutManager.shouldBlockApiCalls()) {
    return state.pauseReasons;
  }

  const token = storageService.getAuthToken();
  if (!token) {
    console.warn("[PauseService] No auth token available");
    return [];
  }

  try {
    const response = await fetch(`${baseUrl}/reasons`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pause reasons: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success) {
      state.pauseReasons = result.data || [];
      state.pauseReasonsLoaded = true;
      eventEmitter.emit("pauseReasons:loaded", state.pauseReasons);
      return state.pauseReasons;
    }

    return [];
  } catch (error) {
    console.error("[PauseService] Error fetching pause reasons:", error);
    return [];
  }
};

/**
 * Pause the agent with a specific reason
 * @param {string} extension - Agent extension number
 * @param {string} reasonCode - Pause reason code (e.g., BREAK, LUNCH)
 * @param {string} queueName - Optional specific queue to pause in
 */
const pauseAgent = async (extension, reasonCode, queueName = null) => {
  if (logoutManager.shouldBlockApiCalls()) {
    throw new Error("Cannot pause during logout");
  }

  const token = storageService.getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  if (!extension || !reasonCode) {
    throw new Error("Extension and reason code are required");
  }

  try {
    console.log(`[PauseService] Pausing agent ${extension} with reason: ${reasonCode}`);

    const response = await fetch(`${baseUrl}/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        extension,
        reasonCode,
        queueName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to pause agent: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Update local state
      state.isPaused = true;
      state.pauseReason = result.data.pauseReason;
      state.pauseStartTime = new Date();

      // Emit event for UI updates
      eventEmitter.emit("agent:paused", {
        extension,
        pauseReason: result.data.pauseReason,
        startTime: state.pauseStartTime,
      });

      return result.data;
    }

    throw new Error(result.message || "Failed to pause agent");
  } catch (error) {
    console.error("[PauseService] Error pausing agent:", error);
    throw error;
  }
};

/**
 * Unpause the agent (resume work)
 * @param {string} extension - Agent extension number
 * @param {string} queueName - Optional specific queue to unpause in
 */
const unpauseAgent = async (extension, queueName = null) => {
  if (logoutManager.shouldBlockApiCalls()) {
    throw new Error("Cannot unpause during logout");
  }

  const token = storageService.getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  if (!extension) {
    throw new Error("Extension is required");
  }

  try {
    console.log(`[PauseService] Unpausing agent ${extension}`);

    const response = await fetch(`${baseUrl}/agent/unpause`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        extension,
        queueName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to unpause agent: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Calculate pause duration
      const pauseDuration = state.pauseStartTime
        ? Math.floor((new Date() - state.pauseStartTime) / 1000)
        : result.data.pauseDuration || 0;

      // Update local state
      state.isPaused = false;
      state.pauseReason = null;
      state.pauseStartTime = null;

      // Emit event for UI updates
      eventEmitter.emit("agent:unpaused", {
        extension,
        pauseDuration,
      });

      return result.data;
    }

    throw new Error(result.message || "Failed to unpause agent");
  } catch (error) {
    console.error("[PauseService] Error unpausing agent:", error);
    throw error;
  }
};

/**
 * Get current pause status for an agent
 * @param {string} extension - Agent extension number
 */
const getPauseStatus = async (extension) => {
  if (logoutManager.shouldBlockApiCalls()) {
    return {
      isPaused: state.isPaused,
      pauseReason: state.pauseReason,
      pauseStartTime: state.pauseStartTime,
    };
  }

  const token = storageService.getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${baseUrl}/agent/${extension}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get pause status: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Update local state
      state.isPaused = result.data.isPaused;
      state.pauseReason = result.data.pauseReason;
      state.pauseStartTime = result.data.pauseStartTime
        ? new Date(result.data.pauseStartTime)
        : null;

      return result.data;
    }

    return null;
  } catch (error) {
    console.error("[PauseService] Error getting pause status:", error);
    return null;
  }
};

/**
 * Get pause history for an agent
 * @param {string} extension - Agent extension number
 * @param {object} options - Query options (startDate, endDate, limit)
 */
const getPauseHistory = async (extension, options = {}) => {
  if (logoutManager.shouldBlockApiCalls()) {
    return [];
  }

  const token = storageService.getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const queryParams = new URLSearchParams();
    if (options.startDate) queryParams.append("startDate", options.startDate);
    if (options.endDate) queryParams.append("endDate", options.endDate);
    if (options.limit) queryParams.append("limit", options.limit);

    const url = `${baseUrl}/agent/${extension}/history?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get pause history: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error("[PauseService] Error getting pause history:", error);
    return null;
  }
};

/**
 * Get all currently paused agents
 */
const getPausedAgents = async () => {
  if (logoutManager.shouldBlockApiCalls()) {
    return [];
  }

  const token = storageService.getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${baseUrl}/agents/paused`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get paused agents: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error("[PauseService] Error getting paused agents:", error);
    return [];
  }
};

/**
 * Format pause duration for display
 * @param {number} seconds - Duration in seconds
 */
const formatPauseDuration = (seconds) => {
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
};

/**
 * Get current pause duration in seconds
 */
const getCurrentPauseDuration = () => {
  if (!state.isPaused || !state.pauseStartTime) return 0;
  return Math.floor((new Date() - state.pauseStartTime) / 1000);
};

// Reset state on logout
logoutManager.registerService("PauseService", async () => {
  state.isPaused = false;
  state.pauseReason = null;
  state.pauseStartTime = null;
  eventEmitter.removeAllListeners();
});

export const pauseService = {
  // Core functions
  getPauseReasons,
  pauseAgent,
  unpauseAgent,
  getPauseStatus,
  getPauseHistory,
  getPausedAgents,

  // Utility functions
  formatPauseDuration,
  getCurrentPauseDuration,

  // State access
  get state() {
    return { ...state };
  },
  get isPaused() {
    return state.isPaused;
  },
  get pauseReason() {
    return state.pauseReason;
  },
  get pauseReasons() {
    return state.pauseReasons;
  },

  // Event emitter
  on: eventEmitter.on.bind(eventEmitter),
  off: eventEmitter.off.bind(eventEmitter),
  emit: eventEmitter.emit.bind(eventEmitter),
};

export default pauseService;
