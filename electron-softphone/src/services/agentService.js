import { EventEmitter } from "events";
import { storageService } from "./storageService";
import { io } from "socket.io-client";
import logoutManager from "./logoutManager";
import serverConfig from "../config/serverConfig";

// Use centralized server configuration
const preferredOrigin = serverConfig.apiUrl;
const baseUrl = `${preferredOrigin}/api`;
const wsBaseUrl = preferredOrigin.replace(/^http/, "ws");

let wsClient = null; // deprecated raw WS (kept for safety)
let socket = null; // Socket.IO client
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
const eventEmitter = new EventEmitter();

const state = {
  extension: null,
  status: "NOT_READY",
  isRegistered: false,
};

const getPauseStatus = async (extension) => {
  // Block calls during centralized logout
  if (logoutManager.shouldBlockApiCalls()) {
    return { success: false, data: null, message: "Blocked during logout" };
  }

  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");
  if (!extension) throw new Error("Extension is required");

  const response = await fetch(`${baseUrl}/pause/agent/${extension}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch pause status");
  return response.json();
};

const updateStatus = (status) => {
  Object.assign(state, status);
  eventEmitter.emit("status:update", state);
};

const registerExtension = (extension) => {
  if (!extension) return;
  state.extension = extension;
  eventEmitter.emit("register_extension", { extension });
};

const connect = async () => {
  // Block connections during centralized logout
  if (logoutManager.shouldBlockApiCalls()) {
    throw new Error("Logout in progress");
  }

  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  return new Promise((resolve, reject) => {
    try {
      // Use Socket.IO – matches backend expectations in server/services/socketService.js
      const url = wsBaseUrl; // Uses centralized serverConfig
      console.log("Connecting to agent Socket.IO with URL:", url);

      // Clean up previous socket if any
      if (socket) {
        try {
          socket.removeAllListeners?.();
          socket.disconnect?.();
        } catch (_) {}
      }

      socket = io(url, {
        path: "/socket.io/",
        transports: ["websocket"],
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });

      socket.on("connect", () => {
        console.log("Agent Socket.IO connected", socket.id);
        reconnectAttempts = 0;

        eventEmitter.emit("ws:connect", { id: socket.id });

        // Register current extension room so server can emit targeted updates
        if (state.extension) {
          socket.emit("register_extension", { extension: state.extension });
        }
        resolve();
      });

      // Socket.IO manager reconnect events
      try {
        socket.io?.on?.("reconnect", (attempt) => {
          eventEmitter.emit("ws:reconnect", { attempt });
          // Re-register extension after reconnect
          if (state.extension) {
            socket.emit("register_extension", { extension: state.extension });
          }
        });
      } catch (_) {}

      socket.on("connect_error", (error) => {
        console.error(
          "Agent Socket.IO connect_error:",
          error?.message || error
        );
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(() => connect(), 2000);
        } else {
          reject(error);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("Agent Socket.IO disconnected:", reason);

        eventEmitter.emit("ws:disconnect", { reason });

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(() => connect(), 2000);
        }
      });

      // Server → client events
      socket.on("extension:status", (payload) => {
        eventEmitter.emit("extension:status", payload);
        eventEmitter.emit("statusChange", payload);
      });

      socket.on("agent:status", (payload) => {
        // Normalize to our local events
        eventEmitter.emit("status:update", payload);
        eventEmitter.emit("statusChange", payload);
      });

      // Agent pause/unpause events for realtime dashboard updates
      socket.on("agent:paused", (payload) => {
        console.log("[AgentService] Received agent:paused event:", payload);
        eventEmitter.emit("agent:paused", payload);
        // Also emit as status change for backward compatibility
        eventEmitter.emit("statusChange", {
          ...payload,
          status: "Paused",
        });
      });

      socket.on("agent:unpaused", (payload) => {
        console.log("[AgentService] Received agent:unpaused event:", payload);
        eventEmitter.emit("agent:unpaused", payload);
        // Also emit as status change for backward compatibility
        eventEmitter.emit("statusChange", {
          ...payload,
          status: "Available",
        });
      });

      socket.on("agent:status_update", (payload) => {
        console.log("[AgentService] Received agent:status_update event:", payload);
        eventEmitter.emit("agent:status_update", payload);
        eventEmitter.emit("statusChange", payload);
      });
    } catch (error) {
      console.error("Error connecting to agent WebSocket:", error);
      reject(error);
    }
  });
};

const getAgentStatus = async () => {
  // Block calls during centralized logout
  if (logoutManager.shouldBlockApiCalls()) {
    return { success: false, data: [], message: "Blocked during logout" };
  }

  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  try {
    // Use the AMI endpoint to get all extension statuses
    const response = await fetch(`${baseUrl}/ami/extensions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch extension statuses");

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch extension statuses");
    }

    // Transform AMI data to match the expected format
    const extensions = result.data || [];
    const agents = extensions.map((ext) => ({
      extension: ext.extension,
      username: ext.extension,
      status: ext.status || "Offline",
      isRegistered: ext.isRegistered || false,
      amiStatus: ext.amiStatus || "Offline",
      amiConnected: ext.amiStatus !== "Offline",
      lastSeen: ext.lastSeen || null,
      online: ext.online || false,
      contactUri: ext.contactUri || null,
      rawStatus: ext.rawStatus || null,
      expirationTime: ext.expirationTime || null,
    }));

    return {
      success: true,
      data: agents,
      message: "Extension statuses retrieved successfully",
    };
  } catch (error) {
    console.error("Error fetching extension statuses:", error);

    // Return a safe fallback
    return {
      success: false,
      data: [],
      message: "Failed to fetch extension statuses",
      error: error.message,
    };
  }
};

const getAgentDetailsByExtension = async (extension) => {
  // Centralized guard
  if (logoutManager.shouldBlockApiCalls()) {
    return {
      extension,
      username: "Unknown",
      status: "Offline",
      isRegistered: false,
      amiStatus: "Offline",
      amiConnected: false,
      lastSeen: null,
      online: false,
    };
  }

  const token = storageService.getAuthToken();
  if (!token) throw new Error("Not authenticated");

  try {
    // Use the AMI endpoint we already set up instead of the non-existent users endpoint
    const response = await fetch(`${baseUrl}/ami/extensions/${extension}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Extension not found");
      }
      throw new Error("Failed to fetch extension status");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch extension status");
    }

    const amiData = result.data || {};

    // Transform AMI data to match the expected format
    const data = {
      extension: extension,
      username: extension, // Use extension as username for now
      status: amiData.status || "Offline",
      isRegistered: amiData.isRegistered || false,
      amiStatus: amiData.amiStatus || "Offline",
      amiConnected: amiData.amiStatus !== "Offline",
      lastSeen: amiData.lastSeen || null,
      online: amiData.online || false,
      contactUri: amiData.contactUri || null,
      rawStatus: amiData.rawStatus || null,
      expirationTime: amiData.expirationTime || null,
    };

    return data;
  } catch (error) {
    console.error("Error fetching extension status:", error);

    // Return a safe fallback object
    return {
      extension,
      username: extension,
      status: "Offline",
      isRegistered: false,
      amiStatus: "Offline",
      amiConnected: false,
      lastSeen: null,
      online: false,
      contactUri: null,
      rawStatus: null,
      expirationTime: null,
    };
  }
};

const broadcastLocalAvailability = (extension, status = "Offline") => {
  try {
    if (!extension) return;
    eventEmitter.emit("extension:status", {
      extension: String(extension),
      status,
    });
    eventEmitter.emit("statusChange", { extension: String(extension), status });
  } catch (e) {
    console.warn("agentService.broadcastLocalAvailability failed:", e);
  }
};

const logout = async (sipTerminateFunction = null) => {
  console.log("=== AGENT SERVICE LOGOUT STARTED ===");

  try {
    const token = storageService.getAuthToken();
    console.log("Agent logout - token present:", !!token);

    // Step 1: Close WebSocket connection first
    try {
      if (socket) {
        console.log("Closing Agent Socket.IO connection...");
        socket.removeAllListeners?.();
        socket.disconnect?.();
        socket = null;
        console.log("Agent Socket.IO connection closed");
      }
      if (wsClient) {
        wsClient.close?.();
        wsClient = null;
      }
    } catch (wsError) {
      console.warn("Error closing agent socket:", wsError);
    }

    // Step 2: Attempt server logout with timeout
    if (token) {
      console.log("Attempting server logout...");
      try {
        const logoutPromise = fetch(`${baseUrl}/users/agent-logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Server logout timeout")), 3000)
        );

        const response = await Promise.race([logoutPromise, timeoutPromise]);

        if (response.ok) {
          console.log("Server logout successful");
        } else {
          console.warn("Server logout failed with status:", response.status);
        }
      } catch (serverError) {
        console.warn("Server logout failed:", serverError.message);
      }
    } else {
      console.log("No token found, skipping server logout");
    }

    // Step 3: Clear local state (but first broadcast local Offline to UI)
    console.log("Clearing local state...");
    try {
      broadcastLocalAvailability(state.extension, "Offline");
    } catch (_) {}
    state.extension = null;
    state.status = "NOT_READY";
    state.isRegistered = false;
    reconnectAttempts = 0;

    // Step 4: Clear any stored data
    try {
      localStorage.removeItem("agentState");
      sessionStorage.removeItem("agentState");
    } catch (storageError) {
      console.warn("Error clearing storage:", storageError);
    }

    console.log("=== AGENT SERVICE LOGOUT COMPLETED ===");
    return true;
  } catch (error) {
    console.error("Agent service logout failed:", error);
    // Still clear local state even if there's an error
    state.extension = null;
    state.status = "NOT_READY";
    state.isRegistered = false;
    reconnectAttempts = 0;
    throw error;
  }
};

// Register with centralized logout manager for automatic cleanup
logoutManager.registerService("AgentService", async () => {
  try {
    await logout();
  } catch (_) {}
});

export const agentService = {
  connect,
  logout,
  getAgentStatus,
  getAgentDetailsByExtension,
  // Fetch all agents from backend (used to include offline extensions)
  getAllAgents: async () => {
    if (logoutManager.shouldBlockApiCalls()) {
      return [];
    }
    const token = storageService.getAuthToken();
    if (!token) return [];
    try {
      // Try the new all-agents endpoint first (includes status)
      const res = await fetch(`${baseUrl}/admin/all-agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          return data.data.map((a) => ({
            extension: String(a.extension || ""),
            name: a.name || `Agent ${a.extension}`,
            status: a.status || "Offline",
            isRegistered: a.isRegistered || false,
            lastSeen: a.lastSeen,
            typology: a.typology,
          })).filter((a) => a.extension);
        }
      }
      // Fallback to old endpoint
      const fallbackRes = await fetch(`${baseUrl}/users/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!fallbackRes.ok) return [];
      const fallbackData = await fallbackRes.json();
      const list = Array.isArray(fallbackData) ? fallbackData : fallbackData?.data || [];
      return list
        .map((u) => ({
          extension: String(
            u.extension || u.pjsipExtension || u.username || ""
          ),
          name: u.fullName || u.username || String(u.extension || ""),
          status: "Offline",
        }))
        .filter((a) => a.extension);
    } catch (_) {
      return [];
    }
  },
  updateStatus,
  registerExtension,
  broadcastLocalAvailability,

  // Get current extension status from AMI
  getCurrentExtensionStatus: async () => {
    if (!state.extension) {
      return {
        extension: null,
        status: "NOT_READY",
        isRegistered: false,
        online: false,
      };
    }

    try {
      return await getAgentDetailsByExtension(state.extension);
    } catch (error) {
      console.warn("Failed to get current extension status:", error.message);
      return {
        extension: state.extension,
        status: "Offline",
        isRegistered: false,
        online: false,
      };
    }
  },

  getPauseStatus,

  on: eventEmitter.on.bind(eventEmitter),
  off: eventEmitter.off.bind(eventEmitter),
  emit: eventEmitter.emit.bind(eventEmitter),
  state,
};

export default agentService;
