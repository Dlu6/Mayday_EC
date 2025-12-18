// socketService.js
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
// import { verifyToken } from "../utils/auth.js";
import { ariService } from "./ariService.js";
import { EventBusService } from "./eventBus.js";
import amiService from "./amiService.js";
// import CDR from "../models/cdr.js";
// import { Op } from "../config/sequelize.js";
import { callMonitoringService } from "./callMonitoringService.js";
import jwt from "jsonwebtoken";
import { generateFingerprint } from "../utils/serverFingerprinting.js";

let io = null;
let masterSocket = null;
let serverFingerprint = null;
const connectedClients = new Map();
let processHandlersInitialized = false;
let eventBusHandlersInitialized = false;
let ariHandlersInitialized = false;
let amiRealtimeInitialized = false;
let masterConnectionInitialized = false;
const state = {
  registeredPeers: new Map(),
  deviceStates: new Map(),
  endpointStates: new Map(),
  queueMemberStates: new Map(),
};

// Initialize Socket.IO
export function initializeSocket(httpServer) {
  if (io) {
    console.warn("[Socket.IO] Already initialized");
    return io;
  }

  io = new Server(httpServer, {
    path: "/socket.io/",
    transports: ["websocket"],
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Check multiple possible token locations
      let authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.headers?.Authorization;

      // If no token found, try to get it from the auth object
      if (!authHeader && socket.handshake.auth) {
        authHeader = socket.handshake.auth.token;
      }

      // console.log("[Socket.IO] Auth attempt:", {
      //   hasAuth: !!authHeader,
      //   authSource: authHeader ? "found" : "missing",
      //   handshakeAuth: !!socket.handshake.auth,
      //   handshakeHeaders: !!socket.handshake.headers,
      // });

      if (!authHeader) {
        console.error("[Socket.IO] No authentication token found");
        return next(new Error("TOKEN_MISSING"));
      }

      try {
        const token = authHeader.replace("Bearer ", "");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;

        // console.log("[Socket.IO] User authenticated:", {
        //   username: decoded.username,
        //   extension: decoded.extension,
        //   role: decoded.role,
        // });

        if (decoded.extension) {
          socket.join(`extension_${decoded.extension}`);
        }

        next();
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          console.error("[Socket.IO] Token expired for user");
          return next(new Error("TOKEN_EXPIRED"));
        }
        console.error("[Socket.IO] Invalid token:", error.message);
        next(new Error("TOKEN_INVALID"));
      }
    } catch (error) {
      console.error("[Socket.IO] Socket auth error:", error);
      next(new Error("AUTH_FAILED"));
    }
  });

  // Ensure process-level handlers are registered only once
  if (!processHandlersInitialized) {
    processHandlersInitialized = true;
    process.on("unhandledRejection", (error) => {
      console.error("Unhandled Rejection:", error);
    });
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
    });
    try {
      // Raise listener limit to prevent noisy warnings under high churn
      process.setMaxListeners?.(50);
    } catch (_) {
      // noop
    }
  }

  setupSocketEvents();
  if (!eventBusHandlersInitialized) {
    setupEventBusHandlers();
    eventBusHandlersInitialized = true;
  }
  if (!ariHandlersInitialized) {
    setupAriEvents();
    ariHandlersInitialized = true;
  }
  if (!amiRealtimeInitialized) {
    setupAmiRealtime();
    amiRealtimeInitialized = true;
  }
  setupCallMonitoringEvents(io);
  
  // Connect to master license server for real-time license updates
  if (!masterConnectionInitialized) {
    connectToMasterServer();
    masterConnectionInitialized = true;
  }
  
  return io;
}

// Add AMI status check helper
export const checkAmiTrunkStatus = async (trunkId) => {
  try {
    if (!amiService.getState().connected) {
      await amiService.connect();
    }

    const registrationStatus = new Promise((resolve, reject) => {
      let registrations = new Map();
      let eventTimeout;

      const handleEvent = (event) => {
        if (event.Event === "OutboundRegistrationDetail") {
          registrations.set(event.ObjectName, {
            endpoint: event.ObjectName.replace("_reg", ""),
            registered: event.Status === "Registered",
            timestamp: new Date().toISOString(),
            details: {
              state: event.Status === "Registered" ? "online" : "offline",
              status: event.Status,
              expiry: event.Expiration ? parseInt(event.Expiration) : null,
              serverUri: event.ServerUri,
              clientUri: event.ClientUri,
              maxRetries: event.MaxRetries,
              retryInterval: event.RetryInterval,
              transport: event.Transport,
            },
          });
        } else if (event.Event === "AuthDetail") {
          const registration = registrations.get(
            event.ObjectName.replace("_auth", "_reg")
          );
          if (registration) {
            registration.details.username = event.Username;
            registration.details.authType = event.AuthType;
          }
        } else if (event.Event === "OutboundRegistrationDetailComplete") {
          clearTimeout(eventTimeout);
          amiService.off("event", handleEvent);

          const trunkReg = Array.from(registrations.values()).find(
            (reg) => reg.endpoint === trunkId
          );

          resolve(trunkReg || null);
        }
      };

      amiService.on("event", handleEvent);

      amiService
        .executeAction({
          Action: "PJSIPShowRegistrationsOutbound",
        })
        .catch((error) => {
          amiService.off("event", handleEvent);
          reject(error);
        });

      eventTimeout = setTimeout(() => {
        amiService.off("event", handleEvent);
        console.log("[AMI] Registration check timed out for:", trunkId);
        resolve(null);
      }, 10000);
    });

    return await registrationStatus;
  } catch (error) {
    console.error("[AMI] Error:", error);
    throw error;
  }
};

// Add a new function to emit trunk status updates
export const emitTrunkStatus = (socket, status) => {
  if (socket) {
    socket.emit("trunk:status", status);
  }
};

// Socket.IO event handlers
function setupSocketEvents() {
  io.on("connection", async (socket) => {
    // Only log in debug mode to reduce noise
    if (process.env.DEBUG_SOCKETS === 'true') {
      console.log("Client connected:", socket.id);
    }

    // socketService.js - update registration handler
    socket.on("register_extension", async (data) => {
      const extension = data.extension || socket.user?.extension;
      console.log("[Socket] Registration attempt for extension>>:", extension);

      try {
        // Get both real-time and database status
        const status = await amiService.getExtensionStatus(extension);

        // console.log(
        //   "[AMI+DB] Extension status (DB-authoritative) for:",
        //   extension,
        //   status
        // );
        // Emit to client (ensure extension key present)
        emitToExtension(extension, "extension:status", {
          extension,
          ...status,
        });

        // Join room for future updates
        const roomName = `extension_${extension}`;
        socket.join(roomName);

        connectedClients.set(extension, {
          socketId: socket.id,
          userId: socket.user?.userId,
          status: "online",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[Socket] Registration error:", error);
        socket.emit("error", {
          type: "STATUS_CHECK_FAILED",
          message: error.message,
        });
      }
    });

    // Send initial agents snapshot immediately after connection (with caching to prevent DB overload)
    try {
      // Use cached data if available and fresh (within 5 seconds)
      const now = Date.now();
      if (!global._agentsSnapshotCache || now - global._agentsSnapshotCacheTime > 5000) {
        const all = await amiService.getAllExtensionStatuses();
        global._agentsSnapshotCache = Array.isArray(all)
          ? all.map((ext) => ({
              extension: String(ext.extension),
              status: ext.status || (ext.online ? "Registered" : "Offline"),
              online: !!ext.online,
              contactUri: ext.contactUri || null,
              lastSeen: ext.lastSeen || null,
            }))
          : [];
        global._agentsSnapshotCacheTime = now;
      }
      socket.emit("agents:snapshot", {
        agents: global._agentsSnapshotCache,
        ts: now,
      });
    } catch (e) {
      console.warn("[Socket] Failed to send agents snapshot:", e?.message || e);
    }

    // Handle SIP registration status
    socket.on("sip:status", async () => {
      const extension = socket.user?.extension;
      if (!extension) return;

      try {
        const status = await ariService.checkPeer(extension);
        socket.emit("sip:status", status);
      } catch (error) {
        console.error(`SIP status check failed for ${extension}:`, error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const extensionsToRemove = [];
      connectedClients.forEach((client, extension) => {
        if (client.socketId === socket.id) {
          extensionsToRemove.push(extension);
        }
      });

      extensionsToRemove.forEach((extension) => {
        connectedClients.delete(extension);
        console.log(
          `Extension ${extension} disconnected (socket: ${socket.id})`
        );
      });
    });

    // WhatsApp event handlers
    socket.on("whatsapp:join", (data) => {
      const { contactId } = data;
      socket.join(`whatsapp_chat_${contactId}`);
    });

    socket.on("whatsapp:leave", (data) => {
      const { contactId } = data;
      socket.leave(`whatsapp_chat_${contactId}`);
    });

    socket.on("trunk:status", async (trunkId) => {
      console.log("[Socket] Checking trunk status for:", trunkId);
      try {
        // Get trunk status
        const status = await checkAmiTrunkStatus(trunkId);

        // Emit status update
        socket.emit("trunk:status_update", status);

        // Also store in state for future reference
        state.registeredPeers.set(trunkId, status);
      } catch (error) {
        console.error("[Socket] Trunk status error:", error);
        socket.emit("trunk:status_update", {
          endpoint: trunkId,
          registered: false,
          timestamp: new Date().toISOString(),
          details: {
            state: "error",
            status: "Error checking status",
            error: error.message,
          },
        });
      }
    });

    // Add periodic trunk status check
    const checkInterval = setInterval(async () => {
      const trunks = Array.from(state.registeredPeers.keys());
      for (const trunkId of trunks) {
        try {
          const status = await checkAmiTrunkStatus(trunkId);
          socket.emit("trunk:status_update", status);
        } catch (error) {
          console.error(
            `[Socket] Failed to update trunk ${trunkId} status:`,
            error
          );
        }
      }
    }, 30000); // Check every 30 seconds

    socket.on("disconnect", () => {
      clearInterval(checkInterval);
      console.log("Client disconnected:", socket.id);
    });

    socket.on("trunk:checkStatus", async (trunkId) => {
      try {
        const status = await checkAmiTrunkStatus(trunkId);
        emitTrunkStatus(socket, status);
      } catch (error) {
        console.error("[Socket] Error checking trunk status:", error);
      }
    });
  });
}

// Connect to master license server for real-time updates
async function connectToMasterServer() {
  try {
    // Generate server fingerprint
    serverFingerprint = await generateFingerprint();
    console.log("🔍 Generated server fingerprint for license updates:", serverFingerprint);

    const masterUrl = process.env.LICENSE_MGMT_API_URL?.replace("/api", "") || "http://localhost:8001";
    console.log(`🔌 Connecting to master license server at: ${masterUrl}`);

    masterSocket = Client(masterUrl, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    masterSocket.on("connect", () => {
      console.log("✅ Connected to master license server for real-time updates.");
      // Notify master server of this slave's fingerprint
      masterSocket.emit("slave_connected", { serverFingerprint });
    });

    masterSocket.on("license:updated", async (data) => {
      console.log("📡 Received license update from master:", data);
      console.log("🔍 Current server fingerprint:", serverFingerprint);
      console.log("📡 Master server fingerprint:", data.serverFingerprint);

      // Check if this update is for our server
      if (data.serverFingerprint === serverFingerprint) {
        console.log("🔍 Fingerprint matches. Syncing license and notifying clients.");
        await handleLicenseUpdateFromMaster(data);
      } else {
        // Even if fingerprints don't match, try to sync (handles fingerprint updates)
        console.log("⚠️ Fingerprint mismatch, attempting sync anyway...");
        await handleLicenseUpdateFromMaster(data);
      }
    });

    masterSocket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from master license server:", reason);
    });

    masterSocket.on("connect_error", (error) => {
      console.error("❌ Failed to connect to master license server:", error.message);
    });
  } catch (error) {
    console.error("❌ Error setting up master server connection:", error);
  }
}

// Handle license update from master server
async function handleLicenseUpdateFromMaster(data) {
  try {
    // Dynamically import license service to avoid circular dependencies
    const { default: createLicenseService } = await import("./licenseService.js");
    const licenseService = createLicenseService();

    // Force a fresh sync to get the latest license
    console.log("🔄 Syncing license from master...");
    const syncResult = await licenseService.syncLicenseFromMaster();

    // Small delay to ensure cache is updated
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get the updated license to broadcast to clients
    const currentLicense = await licenseService.getCurrentLicense();

    // Emit to all connected dashboard clients
    if (io) {
      const updateData = {
        message: "License has been updated.",
        timestamp: new Date().toISOString(),
        license: currentLicense,
      };

      console.log("📤 Broadcasting license:updated to all connected clients");
      io.emit("license:updated", updateData);
      io.emit("license:update", updateData); // Also emit alternate event name

      const connectedCount = io.sockets.sockets.size;
      console.log(`📤 Emitted license update to ${connectedCount} connected clients`);
    }
  } catch (error) {
    console.error("❌ Error handling license update from master:", error);
    
    // Still try to emit update notification even if sync failed
    if (io) {
      io.emit("license:updated", {
        message: "License has been updated.",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// ARI event handlers
function setupAriEvents() {
  ariService.events.on("connected", () => {
    console.log("ARI connection established in socket service");
  });

  ariService.events.on("disconnected", () => {
    console.log("ARI connection lost in socket service");
  });
}

// AMI realtime → broadcast minimal availability deltas
function setupAmiRealtime() {
  try {
    // ContactStatus is primary source of availability
    amiService.on("extension:contactStatus", (evt) => {
      if (!io) return;
      const extension = String(evt.extension || evt.aor || "");
      if (!extension) return;
      const online = !!evt.online;
      const status = online ? "Registered" : "Offline";
      io.emit("agent:status", {
        extension,
        status,
        online,
        contactUri: evt.contactUri || null,
        ts: Date.now(),
      });
    });

    // Device state and endpoint changes can also hint availability; broadcast as soft deltas
    amiService.on("extension:endpointStatus", (evt) => {
      if (!io) return;
      const extension = String(evt.extension || "");
      if (!extension) return;
      io.emit("agent:status", {
        extension,
        status: evt.deviceState || "Unknown",
        ts: Date.now(),
      });
    });
  } catch (e) {
    console.warn("[Socket] setupAmiRealtime failed:", e?.message || e);
  }
}

// Utility function to emit to specific extension
function emitToExtension(extension, event, data) {
  if (!io || !extension) return;

  const roomName = `extension_${extension}`;
  try {
    io.to(roomName).emit(event, {
      ...data,
      extension,
      timestamp: data.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Failed to emit ${event} to ${roomName}:`, error);
  }
}

// Helper functions for extension management (registerExtension removed)
// Cleanup function
async function cleanup() {
  if (!io) return;

  return new Promise((resolve) => {
    connectedClients.clear();
    io.close(() => {
      io = null;
      resolve();
    });
  });
}

function setupEventBusHandlers() {
  // Add trunk status handler
  EventBusService.on("ami:trunk_status", (status) => {
    if (io) {
      io.emit("trunk:status_update", status);
    }
  });

  // Add registration status handler
  EventBusService.on("ami:registration_status", (data) => {
    emitToExtension(data.endpoint, "registration_status", data);
  });

  // AMI contact status
  EventBusService.on("ami:contact_status", (data) => {
    emitToExtension(data.aor, "contact_status", data);
  });

  EventBusService.on("ami:device_state", (data) => {
    emitToExtension(data.device, "device_state", data);
  });

  EventBusService.on("ami:extension_status", (data) => {
    emitToExtension(data.exten, "extension_status", data);
  });

  // When AMI indicates extension registration/contact status changes,
  // refresh call stats so dashboards update quickly
  EventBusService.on("extension:status", async () => {
    try {
      await broadcastCallStats(io);
    } catch (e) {
      return;
    }
  });
  EventBusService.on("extension:contactStatus", async () => {
    try {
      await broadcastCallStats(io);
    } catch (e) {
      return;
    }
  });
  // Refresh stats immediately when availability or agent status changes
  EventBusService.on("extension:availability_changed", async () => {
    try {
      await broadcastCallStats(io);
    } catch (err) {
      console.warn(
        "[Socket] Failed to broadcast stats on availability_changed:",
        err?.message || err
      );
    }
  });
  EventBusService.on("agent:status", async () => {
    try {
      await broadcastCallStats(io);
    } catch (err) {
      console.warn(
        "[Socket] Failed to broadcast stats on agent:status:",
        err?.message || err
      );
    }
  });

  // Network events
  EventBusService.on("network:updated", (data) => {
    io.emit("network-config-updated", data);
  });

  EventBusService.on("network:deleted", (data) => {
    io.emit("network-config-deleted", data.id);
  });

  // Call events
  EventBusService.on("call:incoming", ({ extension, data }) => {
    emitToExtension(extension, "incoming_call", data);
  });

  EventBusService.on("call:status", ({ extension, data }) => {
    emitToExtension(extension, "call_status", data);
  });

  // Agent events
  EventBusService.on("agent:status", ({ extension, data }) => {
    emitToExtension(extension, "agent:status", data);
    // Also broadcast to all clients for dashboard updates
    if (io) {
      io.emit("agent:status_update", { extension, ...data });
    }
  });

  // Agent pause events - broadcast to all clients for realtime dashboard updates
  EventBusService.on("agent:paused", (data) => {
    if (io) {
      console.log("[Socket] Broadcasting agent:paused event:", data.extension);
      io.emit("agent:paused", data);
      // Also emit as general status update
      io.emit("agent:status_update", {
        extension: data.extension,
        status: "Paused",
        pauseReason: data.pauseReason,
        startTime: data.startTime,
        timestamp: data.timestamp,
      });
    }
  });

  EventBusService.on("agent:unpaused", (data) => {
    if (io) {
      console.log("[Socket] Broadcasting agent:unpaused event:", data.extension);
      io.emit("agent:unpaused", data);
      // Also emit as general status update
      io.emit("agent:status_update", {
        extension: data.extension,
        status: "Available",
        pauseReason: null,
        pauseDuration: data.pauseDuration,
        timestamp: data.timestamp,
      });
    }
  });

  EventBusService.on("agent:presence", (data) => {
    if (io) {
      console.log("[Socket] Broadcasting agent:presence event:", data.extension);
      io.emit("agent:presence", data);
    }
  });

  // Add WhatsApp message handler
  EventBusService.on("whatsapp:message", (data) => {
    console.log("Socket service received whatsapp:message event:", data);
    const { contact } = data;

    // Emit to the specific chat room
    io.to(`whatsapp_chat_${contact.phoneNumber}`).emit(
      "whatsapp:message",
      data
    );

    // Also emit to all connected clients for chat list updates
    io.emit("whatsapp:chat_update", data);
  });

  EventBusService.on(
    "whatsapp:status_update",
    ({ messageId, status, contactId }) => {
      io.to(`whatsapp_chat_${contactId}`).emit("whatsapp:status_update", {
        messageId,
        status,
      });
    }
  );
}

function setupCallMonitoringEvents(io) {
  // Listen to EventBus events for call monitoring
  EventBusService.on("call:incoming", ({ extension, data }) => {
    emitToExtension(extension, "activeCall", {
      action: "new",
      data: {
        uniqueId: data.uniqueId,
        callerId: data.callerId,
        extension: data.extension,
        startTime: data.startTime,
        direction: data.direction,
        status: data.status,
      },
    });

    // Emit updated stats
    broadcastCallStats(io);
  });

  EventBusService.on("call:status", ({ extension, data }) => {
    const eventMap = {
      answered: "active",
      ended: "end",
      abandoned: "abandoned",
    };

    emitToExtension(extension, "activeCall", {
      action: eventMap[data.type] || data.type,
      data: {
        uniqueId: data.uniqueId,
        status: data.status,
        duration: data.duration,
        cause: data.causeText,
      },
    });

    broadcastCallStats(io);
  });

  // Handle stats subscription
  io.on("connection", (socket) => {
    socket.on("subscribeToCallStats", async () => {
      try {
        const stats = await getCompleteCallStats();
        socket.emit("callStats", stats);

        // Log what we're sending to help with debugging
        // console.log("Sending initial call stats to client:", {
        //   activeCalls: stats.activeCalls,
        //   activeAgents: stats.activeAgents,
        //   totalCalls: stats.totalCalls,
        //   abandonedCalls: stats.abandonedCalls,
        // });
      } catch (error) {
        console.error("Error sending initial call stats:", error);
      }
    });
  });
}

async function getCompleteCallStats() {
  try {
    // Get active calls directly from the monitoring service
    const activeCalls = callMonitoringService.getActiveCalls();

    // Get active agents with proper filtering
    const allAgents = await callMonitoringService.getActiveAgents();
    const onlineAgents = allAgents.filter(
      (agent) =>
        agent.status === "Available" ||
        agent.status === "Registered" ||
        agent.status === "On Call"
    );

    // Get queue metrics
    const queueMetrics = await getQueueMetrics();

    // Get call volume data
    const callsPerHour = await callMonitoringService.getCallVolumeByHour();

    return {
      // Active calls data
      activeCalls: activeCalls.length,
      activeCallsList: activeCalls,

      // Call counts
      totalCalls: await callMonitoringService.getTotalCallsCount(),
      abandonedCalls: await callMonitoringService.getAbandonedCallsCount(),

      // Queue data
      queueStatus: queueMetrics.queueStatus || [],
      queueMetrics: queueMetrics.metrics,

      // Agent data
      activeAgents: onlineAgents.length,
      activeAgentsList: allAgents,

      // Call volume data
      callsPerHour: callsPerHour,
    };
  } catch (error) {
    console.error("Error getting complete call stats:", error);
    return {
      activeCalls: 0,
      activeCallsList: [],
      totalCalls: 0,
      abandonedCalls: 0,
      queueMetrics: {
        avgWaitTime: "0:00",
        serviceLevelToday: 0,
        abandonRate: 0,
      },
      queueStatus: [],
      activeAgents: 0,
      activeAgentsList: [],
      callsPerHour: [],
    };
  }
}

async function broadcastCallStats(io) {
  try {
    const stats = await getCompleteCallStats();
    io.emit("callStats", stats);

    // Log what we're broadcasting to help with debugging
    // console.log("Broadcasting updated call stats🦐🦐:", {
    //   activeCalls: stats.activeCalls,
    //   activeAgents: stats.activeAgents,
    //   totalCalls: stats.totalCalls,
    //   abandonedCalls: stats.abandonedCalls,
    // });
  } catch (error) {
    console.error("Error broadcasting call stats:", error);
  }
}

// Helper functions to get stats
// function getActiveCalls() {
//   return callMonitoringService.getActiveCalls();
// }

async function getQueueMetrics() {
  try {
    // Get queue data from call monitoring service
    const queueData = await callMonitoringService.getQueueStats();

    // Format queue metrics for the dashboard
    const metrics = {
      avgWaitTime: "0:00",
      serviceLevelToday: 0,
      abandonRate: 0,
    };

    // If we have queue data, use the first queue's metrics or aggregate them
    if (queueData && queueData.length > 0) {
      const mainQueue = queueData[0];
      metrics.avgWaitTime = mainQueue.avgWaitTime || "0:00";
      metrics.serviceLevelToday = mainQueue.sla || 0;
      metrics.abandonRate = mainQueue.abandonRate || 0;
    }

    return {
      metrics,
      queueStatus: queueData,
    };
  } catch (error) {
    console.error("Error getting queue metrics:", error);
    return {
      metrics: {
        avgWaitTime: "0:00",
        serviceLevelToday: 0,
        abandonRate: 0,
      },
      queueStatus: [],
    };
  }
}

function broadcast(event, data) {
  if (!io) return;

  io.emit(event, data);
  // TODO ~ THIS IS NEEDED FOR DEBUGGING AND LOGGING
  // console.log(`Broadcasting ${event}:`, data);
}

export const socketService = {
  initialize: initializeSocket,
  emit: emitToExtension,
  broadcast,
  emitWhatsAppMessage: (contactId, data) => {
    io.emit("whatsapp:message", data);
  },
  emitStatusUpdate: (contactId, data) => {
    io.emit("whatsapp:status_update", data);
  },
  emitCallHistoryUpdate: (record) => {
    if (io) {
      io.emit("call_history_update", record);
    }
  },
  emitToUser: (userId, event, data) => {
    if (io) {
      // Emit to all sockets associated with this user
      const userSockets = Array.from(connectedClients.entries())
        .filter(([_, client]) => client.userId === userId)
        .map(([socketId, _]) => socketId);
      
      userSockets.forEach(socketId => {
        io.to(socketId).emit(event, data);
      });
    }
  },
  cleanup,
};
