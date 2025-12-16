import { EventEmitter } from "events";
import { io } from "socket.io-client";
import logoutManager from "./logoutManager";

class WebSocketService extends EventEmitter {
  constructor() {
    super();

    // Connection state
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.isReconnecting = false;

    // Reconnection configuration
    this.config = {
      maxReconnectAttempts: 20,
      baseDelay: 1000,
      maxDelay: 30000,
      jitterRange: 1000,
      healthCheckInterval: 30000,
      connectionTimeout: 15000,
      heartbeatInterval: 25000,
      unhealthyThreshold: 3,
    };

    // Reconnection state
    this.reconnectState = {
      attempts: 0,
      consecutiveFailures: 0,
      lastAttempt: null,
      nextAttempt: null,
      timeout: null,
      backoffMultiplier: 1.5,
    };

    // Health monitoring
    this.healthState = {
      lastHeartbeat: null,
      lastHealthCheck: null,
      healthCheckTimer: null,
      heartbeatTimer: null,
      connectionQuality: "unknown",
    };

    // Event handlers
    this.boundHandlers = {};

    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.send = this.send.bind(this);
    this.getStatus = this.getStatus.bind(this);

    // Set max listeners
    this.setMaxListeners(50);
  }

  // Get Socket.IO URL based on environment (HTTP origin)
  getSocketUrl() {
    const isDev =
      process.env.NODE_ENV === "development" ||
      (typeof import.meta !== "undefined" &&
        import.meta.env?.MODE === "development");

    if (isDev) {
      return "http://localhost:8004";
    }

    // Check if we're in Electron (file:// protocol)
    if (
      typeof window !== "undefined" &&
      window.location?.origin &&
      !window.location.origin.startsWith("file://")
    ) {
      return window.location.origin;
    }

    // Default to production URL for Electron or when window is not available
    return import.meta.env?.VITE_API_URL || "https://mhuhelpline.com";
  }

  // Get authentication token
  getAuthToken() {
    return (
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
    );
  }

  // Connect to Socket.IO
  async connect() {
    if (typeof window !== "undefined" && window.isLoggingOut) return false;
    if (this.isConnecting || this.isConnected) {
      return false;
    }

    const token = this.getAuthToken();
    if (!token) {
      console.warn("🔐 WebSocket: No auth token available");
      this.emit("connection:auth_required");
      return false;
    }

    try {
      this.isConnecting = true;
      this.isReconnecting = false;

      // attempt connection

      const url = this.getSocketUrl();
      const bareToken = String(token).replace(/^Bearer\s+/i, "");
      const options = {
        path: "/socket.io/",
        transports: ["websocket"],
        timeout: this.config.connectionTimeout,
        reconnection: true,
        auth: { token: bareToken },
        extraHeaders: { Authorization: `Bearer ${bareToken}` },
      };

      this.socket = io(url, options);
      this.setupEventHandlers();

      return true;
    } catch (error) {
      console.error("❌ WebSocket: Connection error:", error);
      this.handleConnectionFailure(error.message);
      return false;
    }
  }

  // Set up Socket.IO event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection opened
    this.socket.on("connect", () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.isReconnecting = false;

      // Reset reconnection state
      this.resetReconnectionState();

      // Start health monitoring
      this.startHealthMonitoring();

      // Emit events
      this.emit("connection:connected");
      this.emit("connection:stateChanged", {
        type: "websocket",
        connected: true,
        health: "healthy",
      });

      // Subscribe to services
      this.subscribeToServices();
    });

    // Connection closed
    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.isConnecting = false;

      // Clear timers
      this.clearHealthTimers();

      // Emit events
      this.emit("connection:disconnected", { reason });
      this.emit("connection:stateChanged", {
        type: "websocket",
        connected: false,
        health: "unhealthy",
      });

      // Socket.IO auto-reconnects; mark flag during attempts
    });

    // Connection error
    this.socket.on("connect_error", (error) => {
      // connection error
      this.handleConnectionFailure("WebSocket error");
    });

    // Reconnect lifecycle
    this.socket.on("reconnect_attempt", (attempt) => {
      this.isReconnecting = true;
      this.reconnectState.attempts = attempt;
      this.emit("connection:reconnecting", { attempt });
    });
    this.socket.on("reconnect", () => {
      this.isReconnecting = false;
      this.emit("connection:reconnected");
    });

    // Message received
    this.socket.on("message", (data) => {
      try {
        this.handleMessage(data);
      } catch (error) {
        console.warn("⚠️ WebSocket: Failed to handle message:", error);
      }
    });
  }

  // Handle incoming messages
  handleMessage(data) {
    // Handle heartbeat responses
    if (data.type === "heartbeat") {
      this.healthState.lastHeartbeat = new Date();
      this.healthState.connectionQuality = "healthy";
      return;
    }

    // Handle authentication responses
    if (data.type === "auth_response") {
      if (data.success) {
        console.log("✅ WebSocket: Authentication successful");
        this.emit("connection:authenticated");
      } else {
        console.error("❌ WebSocket: Authentication failed:", data.error);
        this.emit("connection:auth_failed", data.error);
      }
      return;
    }

    // Emit message event
    this.emit("message", data);
  }

  // Authenticate with server (handled at connect via auth headers)
  authenticate() {}

  // Subscribe to services
  subscribeToServices() {
    if (this.socket && this.isConnected) {
      this.socket.emit("subscribeToCallStats");
    }
  }

  // Send message (Socket.IO emit)
  send(data) {
    if (!this.socket || !this.isConnected) {
      console.warn("⚠️ WebSocket: Cannot send message, connection not open");
      return false;
    }
    try {
      if (data && typeof data === "object" && data.type) {
        const { type, ...payload } = data;
        this.socket.emit(type, payload);
      } else {
        this.socket.emit("message", data);
      }
      return true;
    } catch (error) {
      console.error("❌ WebSocket: Failed to send message:", error);
      return false;
    }
  }

  // Disconnect
  disconnect() {
    console.log("🔌 WebSocket: Disconnecting...");

    this.isReconnecting = false;
    this.clearHealthTimers();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;

    this.emit("connection:disconnected", {
      code: 1000,
      reason: "Client disconnect",
    });
  }

  // Handle connection failure
  handleConnectionFailure(error) {
    this.isConnecting = false;
    this.reconnectState.consecutiveFailures++;
    this.reconnectState.lastError = error;

    console.error("❌ WebSocket: Connection failed:", error);
    this.emit("connection:failed", error);

    // Schedule reconnection if not already scheduled
    if (!this.reconnectState.timeout) {
      this.scheduleReconnection();
    }
  }

  // Schedule reconnection with exponential backoff
  scheduleReconnection() {
    if (
      (typeof window !== "undefined" && window.isLoggingOut) ||
      this.isReconnecting ||
      this.reconnectState.timeout
    ) {
      return;
    }

    if (this.reconnectState.attempts >= this.config.maxReconnectAttempts) {
      console.error("❌ WebSocket: Max reconnection attempts reached");
      this.emit("connection:max_attempts_reached");
      return;
    }

    this.isReconnecting = true;
    this.reconnectState.attempts++;

    // Calculate delay with exponential backoff and jitter
    const baseDelay =
      this.config.baseDelay *
      Math.pow(
        this.reconnectState.backoffMultiplier,
        this.reconnectState.attempts - 1
      );
    const jitter = Math.random() * this.config.jitterRange;
    const delay = Math.min(baseDelay + jitter, this.config.maxDelay);

    // reconnection scheduled in delay ms

    this.reconnectState.nextAttempt = new Date(Date.now() + delay);
    this.reconnectState.timeout = setTimeout(() => {
      this.reconnectState.timeout = null;
      this.reconnect();
    }, delay);

    this.emit("connection:reconnecting", {
      attempt: this.reconnectState.attempts,
      delay: Math.round(delay),
      nextAttempt: this.reconnectState.nextAttempt,
    });
  }

  // Execute reconnection
  async reconnect() {
    if (!this.isReconnecting) {
      return false;
    }

    // execute reconnection

    try {
      const success = await this.connect();
      if (success) {
        this.isReconnecting = false;
        this.emit("connection:reconnected");
        return true;
      } else {
        throw new Error("Reconnection failed");
      }
    } catch (error) {
      console.error("❌ WebSocket: Reconnection failed:", error);
      this.handleConnectionFailure(error.message);
      return false;
    }
  }

  // Force reconnection
  async forceReconnection() {
    // force reconnection requested

    if (this.reconnectState.timeout) {
      clearTimeout(this.reconnectState.timeout);
      this.reconnectState.timeout = null;
    }

    this.isReconnecting = false;
    this.reconnectState.attempts = 0;
    this.reconnectState.consecutiveFailures = 0;

    return await this.reconnect();
  }

  // Reset reconnection state
  resetReconnectionState() {
    this.reconnectState.attempts = 0;
    this.reconnectState.consecutiveFailures = 0;
    this.reconnectState.lastError = null;
    this.reconnectState.nextAttempt = null;

    if (this.reconnectState.timeout) {
      clearTimeout(this.reconnectState.timeout);
      this.reconnectState.timeout = null;
    }
  }

  // Start health monitoring
  startHealthMonitoring() {
    this.clearHealthTimers();

    // Health check timer
    this.healthState.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Heartbeat timer
    this.healthState.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  // Clear health timers
  clearHealthTimers() {
    if (this.healthState.healthCheckTimer) {
      clearInterval(this.healthState.healthCheckTimer);
      this.healthState.healthCheckTimer = null;
    }

    if (this.healthState.heartbeatTimer) {
      clearInterval(this.healthState.heartbeatTimer);
      this.healthState.heartbeatTimer = null;
    }
  }

  // Perform health check
  performHealthCheck() {
    if (!this.isConnected) return;

    const now = new Date();
    this.healthState.lastHealthCheck = now;

    // Check if we've received recent heartbeats
    if (this.healthState.lastHeartbeat) {
      const timeSinceHeartbeat = now - this.healthState.lastHeartbeat;
      if (timeSinceHeartbeat > this.config.heartbeatInterval * 2) {
        console.warn(
          "⚠️ WebSocket: No recent heartbeat, connection may be stale"
        );
        this.healthState.connectionQuality = "degraded";
        this.emit("connection:health_degraded");
      }
    }

    // Emit health check event
    this.emit("connection:health_check", {
      timestamp: now,
      quality: this.healthState.connectionQuality,
      lastHeartbeat: this.healthState.lastHeartbeat,
    });
  }

  // Send heartbeat
  sendHeartbeat() {
    if (this.isConnected) {
      this.send({ type: "heartbeat", timestamp: Date.now() });
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      isReconnecting: this.isReconnecting,
      readyState: this.socket ? this.socket.readyState : null,
      reconnectAttempts: this.reconnectState.attempts,
      consecutiveFailures: this.reconnectState.consecutiveFailures,
      lastError: this.reconnectState.lastError,
      nextAttempt: this.reconnectState.nextAttempt,
      connectionQuality: this.healthState.connectionQuality,
      lastHeartbeat: this.healthState.lastHeartbeat,
      lastHealthCheck: this.healthState.lastHealthCheck,
    };
  }

  // Get connection health score (0-100)
  getHealthScore() {
    if (!this.isConnected) return 0;

    let score = 100;

    // Deduct points for consecutive failures
    score -= Math.min(this.reconnectState.consecutiveFailures * 10, 30);

    // Deduct points for poor connection quality
    if (this.healthState.connectionQuality === "degraded") {
      score -= 20;
    } else if (this.healthState.connectionQuality === "failed") {
      score -= 50;
    }

    // Deduct points for high reconnection attempts
    if (this.reconnectState.attempts > 5) {
      score -= Math.min((this.reconnectState.attempts - 5) * 5, 20);
    }

    return Math.max(0, score);
  }

  // Cleanup
  destroy() {
    this.disconnect();
    this.clearHealthTimers();
    this.removeAllListeners();
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Register with logout manager for centralized cleanup
try {
  logoutManager.registerService("websocketService", async () => {
    try {
      websocketService.destroy();
    } catch (_) {}
  });
} catch (_) {}

export default websocketService;
