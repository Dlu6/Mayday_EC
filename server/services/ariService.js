// services/ariService.js
import ari from "ari-client";
import { EventEmitter } from "events";
import WebSocket from "ws";
import { PJSIPEndpoint } from "../models/pjsipModel.js";
import chalk from "chalk";

const eventEmitter = new EventEmitter();
let ariClient = null;
let wsClient = null;
let isConnected = false;
let reconnectAttempts = 0;

const config = {
  url: process.env.ARI_URL,
  username: process.env.ARI_USERNAME,
  password: process.env.ARI_PASSWORD,
  appName: "mayday",
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
};

async function initialize() {
  try {
    console.log("Initializing Asterisk ARI connection...");
    const isAvailable = await validateConnection();

    if (!isAvailable) {
      throw new Error("ARI validation failed");
    }

    await connect();
    setupWebSocket();
    setupEventHandlers();

    console.log(chalk.yellowBright("Asterisk ARI initialized successfully"));
    return true;
  } catch (error) {
    console.error("Asterisk ARI initialization failed:", error);
    return false;
  }
}

async function validateConnection() {
  try {
    console.log("Validating ARI connection...");
    const auth = Buffer.from(`${config.username}:${config.password}`).toString(
      "base64"
    );

    // Try both localhost and public IP with detailed logging
    const urls = [
      "http://127.0.0.1:8088",
      "http://localhost:8088",
      process.env.ARI_URL,
      `http://${process.env.PUBLIC_IP}:8088`,
    ].filter(Boolean);

    console.log(
      "Testing URLs:",
      urls.map((url) => url.replace(/\/\/$/, ""))
    );

    for (const url of urls) {
      try {
        const testUrl = `${url.replace(
          /\/\/$/,
          ""
        )}/ari/api-docs/resources.json`;
        console.log(`Testing connection to: ${testUrl}`);

        const response = await fetch(testUrl, {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("ARI validation successful:", {
            url,
            apiVersion: data.apiVersion,
            swaggerVersion: data.swaggerVersion,
          });

          // Update config URL with working URL
          config.url = url.replace(/\/\/$/, "");
          return true;
        }
      } catch (error) {
        console.log(`Connection failed to ${url}:`, error.message);
      }
    }

    throw new Error("No valid ARI endpoints found");
  } catch (error) {
    console.error("ARI validation error:", error);
    return false;
  }
}

async function connect() {
  try {
    console.log(`Connecting to ARI at ${config.url}...`);

    // Cleanup existing WebSocket before ARI client connection
    if (wsClient && wsClient.cleanup) {
      wsClient.cleanup();
    }

    ariClient = await ari.connect(config.url, config.username, config.password);
    isConnected = true;
    reconnectAttempts = 0;

    await ariClient.start(config.appName);
    console.log("ARI client connected and started");
    return true;
  } catch (error) {
    console.error("ARI connection error:", error);
    handleConnectionError(error);
    return false;
  }
}

function setupWebSocket() {
  if (wsClient) {
    // Properly close existing connection
    wsClient.removeAllListeners();
    wsClient.close(1000, "Closing due to reconnection");
    wsClient = null;
  }

  const wsUrl = `ws://${new URL(config.url).host}/ari/events?api_key=${
    config.username
  }:${config.password}&app=${config.appName}`;

  wsClient = new WebSocket(wsUrl, ["ari"], {
    protocolVersion: 13,
    perMessageDeflate: true,
    rejectUnauthorized: false,
    handshakeTimeout: 5000,
  });

  let isReconnecting = false;
  let intentionalClose = false;

  wsClient.on("open", () => {
    console.log(chalk.yellow("ARI WebSocket connected successfully!"));
    isConnected = true;
    reconnectAttempts = 0;
    isReconnecting = false;
  });

  wsClient.on("message", (data) => {
    try {
      const event = JSON.parse(data);
      handleEvent(event);
    } catch (error) {
      console.error("WebSocket message processing error:", error);
    }
  });

  wsClient.on("error", (error) => {
    console.error("WebSocket connection error:", {
      message: error.message,
      code: error.code,
      url: wsUrl.replace(config.password, "****"),
    });
    isConnected = false;
  });

  wsClient.on("close", (code, reason) => {
    console.log("WebSocket closed:", { code, reason: reason.toString() });
    isConnected = false;

    // Don't attempt reconnection if it was an intentional close
    if (
      !intentionalClose &&
      code !== 1000 &&
      reconnectAttempts < config.maxReconnectAttempts
    ) {
      isReconnecting = true;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`Attempting WebSocket reconnection in ${delay}ms`);
      reconnectAttempts++;

      setTimeout(() => {
        if (!isConnected) {
          setupWebSocket();
        }
      }, delay);
    }
  });

  // Add cleanup method
  wsClient.cleanup = () => {
    intentionalClose = true;
    if (wsClient) {
      wsClient.close(1000, "Cleanup requested");
    }
  };

  // Add ping/pong for connection keep-alive
  let pingInterval;
  wsClient.on("open", () => {
    pingInterval = setInterval(() => {
      if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.ping();
      }
    }, 30000);
  });
  wsClient.on("close", () => {
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  });

  wsClient.on("pong", () => {
    // Connection is alive
    isConnected = true;
  });
}

function setupEventHandlers() {
  if (!ariClient) {
    console.warn("No ARI client available for event handling");
    return;
  }

  // Core ARI events
  ariClient.on("StasisStart", (event, channel) => {
    eventEmitter.emit("stasisStart", { event, channel });
  });

  ariClient.on("StasisEnd", (event, channel) => {
    eventEmitter.emit("stasisEnd", { event, channel });
  });

  // PJSIP specific events
  ariClient.on("EndpointStateChange", async (event, endpoint) => {
    if (!endpoint?.resource) return;

    try {
      const status = await getEndpointStatus(endpoint.resource);
      eventEmitter.emit("endpoint:state", status);

      // Emit specific state events
      if (status.online) {
        eventEmitter.emit("endpoint:online", {
          extension: endpoint.resource,
          timestamp: Date.now(),
        });
      } else {
        eventEmitter.emit("endpoint:offline", {
          extension: endpoint.resource,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error handling endpoint state change:", error);
    }
  });

  // Channel events
  ariClient.on("ChannelStateChange", (event, channel) => {
    eventEmitter.emit("channel:state", {
      channelId: channel.id,
      state: channel.state,
      timestamp: Date.now(),
    });
  });

  // Handle disconnects
  ariClient.on("disconnect", () => {
    console.log("ARI client disconnected");
    isConnected = false;
    handleConnectionError();
  });
}

function handleConnectionError() {
  isConnected = false;

  if (reconnectAttempts < config.maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(
      `ARI reconnection attempt ${reconnectAttempts}/${config.maxReconnectAttempts}`
    );

    // Exponential backoff for reconnection attempts
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    setTimeout(async () => {
      try {
        await connect();
        if (isConnected) {
          console.log("ARI reconnection successful");
          setupEventHandlers();
          setupWebSocket();
        }
      } catch (error) {
        console.error("ARI reconnection failed:", error);
      }
    }, delay);
  } else {
    console.error("Maximum ARI reconnection attempts reached");
    eventEmitter.emit("maxReconnectAttemptsReached");
  }
}

function handleEvent(event) {
  eventEmitter.emit(event.type, event);

  switch (event.type) {
    case "EndpointStateChange":
      handleEndpointStateChange(event);
      break;
    case "DeviceStateChanged":
      handleDeviceStateChange(event);
      break;
  }
}

async function handleEndpointStateChange(event) {
  if (!event.endpoint?.resource) return;

  try {
    const status = await getEndpointStatus(event.endpoint.resource);
    eventEmitter.emit("endpoint:state", status);
  } catch (error) {
    console.error("Error handling endpoint state change:", error);
  }
}

function handleDeviceStateChange(event) {
  eventEmitter.emit("device:state", {
    device: event.device,
    state: event.state,
    timestamp: Date.now(),
  });
}

async function getEndpointStatus(extension) {
  if (!isConnected || !ariClient) {
    throw new Error("ARI not connected");
  }

  try {
    const endpoint = await ariClient.endpoints.get({
      tech: "PJSIP",
      resource: extension,
    });

    return {
      extension,
      state: endpoint.state,
      online: endpoint.state === "online",
      channelIds: endpoint.channelIds || [],
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Failed to get endpoint status: ${extension}`, error);
    throw error;
  }
}

async function reloadPJSIP() {
  if (!isConnected || !ariClient) throw new Error("ARI not connected");

  try {
    await ariClient.asterisk.reloadModule({ moduleName: "res_pjsip.so" });
    return true;
  } catch (error) {
    console.error("PJSIP reload failed:", error);
    throw error;
  }
}

async function cleanup() {
  if (wsClient) {
    wsClient.terminate();
    wsClient = null;
  }

  if (ariClient) {
    try {
      await ariClient.close();
      ariClient = null;
      isConnected = false;
    } catch (error) {
      console.error("ARI cleanup error:", error);
    }
  }
}

async function monitorEndpoint(extension) {
  if (!ariClient) {
    console.warn(
      `ARI client not available, cannot monitor extension ${extension}`
    );
    return { state: "unknown", online: false };
  }

  try {
    const endpointExists = await PJSIPEndpoint.findOne({
      where: { id: extension },
    });

    if (!endpointExists) {
      console.warn(`Extension ${extension} not found in database`);
      return { state: "not_configured", online: false };
    }

    const endpoint = await ariClient.endpoints.get({
      tech: "PJSIP",
      resource: extension,
    });

    return {
      extension,
      state: endpoint.state,
      online: endpoint.state === "online",
      channelIds: endpoint.channelIds || [],
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Monitor endpoint failed for ${extension}:`, error);
    // Return a valid status object even on error
    return {
      extension,
      state: "error",
      online: false,
      channelIds: [],
      timestamp: Date.now(),
      error: error.message,
    };
  }
}

// Export the API
export const ariService = {
  initialize,
  getEndpointStatus,
  reloadPJSIP,
  cleanup,
  events: eventEmitter,
  getConnectionStatus: () => ({
    connected: isConnected,
    reconnectAttempts,
  }),

  // Add getClient function
  getClient: () => ariClient,

  // checkPeer function needed by socketService
  checkPeer: async (extension) => {
    if (!isConnected || !ariClient) {
      return { state: "unknown", online: false };
    }
    try {
      const endpoint = await ariClient.endpoints.get({
        tech: "PJSIP",
        resource: extension,
      });
      return {
        state: endpoint.state,
        online: endpoint.state === "online",
        channelIds: endpoint.channelIds || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Check peer failed for ${extension}:`, error);
      return { state: "unknown", online: false };
    }
  },
  // Monitor endpoint function needed by socketService
  monitorEndpoint: monitorEndpoint,
};
