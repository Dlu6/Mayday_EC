// // services/asteriskARI.js
// import ari from "ari-client";
// import WebSocket from "ws";
// import { EventEmitter } from "events";

// // Create a singleton event emitter for ARI events
// const ariEvents = new EventEmitter();

// // Configuration object from environment variables
// const config = {
//   ariUrl: process.env.ARI_URL,
//   ariUsername: process.env.ARI_USERNAME,
//   ariPassword: process.env.ARI_PASSWORD,
//   wsUrl: `ws://${process.env.ASTERISK_HOST}:8088/ari/events`,
//   appName: "mayday",
//   reconnectDelay: 5000,
//   maxReconnectAttempts: 5,
// };

// // Private variables using closure
// let ariClient = null;
// let wsClient = null;
// let reconnectAttempts = 0;
// let isConnected = false;

// // WebSocket event handlers
// const wsEventHandlers = {
//   DeviceStateChanged: (event) => {
//     ariEvents.emit("deviceStateChanged", {
//       device: event.device,
//       state: event.state,
//       timestamp: Date.now(),
//     });
//   },
//   PeerStatusChange: (event) => {
//     ariEvents.emit("peerStatusChanged", {
//       peer: event.peer,
//       status: event.status,
//       timestamp: Date.now(),
//     });
//   },
//   ContactStatusChange: (event) => {
//     ariEvents.emit("contactStatusChanged", {
//       contact: event.contact,
//       status: event.status,
//       timestamp: Date.now(),
//     });
//   },
// };

// // Initialize WebSocket connection
// function setupWebSocket() {
//   if (wsClient) {
//     wsClient.terminate();
//   }

//   wsClient = new WebSocket(config.wsUrl, {
//     headers: {
//       Authorization:
//         "Basic " +
//         Buffer.from(`${config.ariUsername}:${config.ariPassword}`).toString(
//           "base64"
//         ),
//     },
//   });

//   wsClient.on("open", () => {
//     console.log("ARI WebSocket connected");
//   });

//   wsClient.on("message", (data) => {
//     try {
//       const event = JSON.parse(data);
//       const handler = wsEventHandlers[event.type];
//       if (handler) {
//         handler(event);
//       } else {
//         ariEvents.emit(event.type, event);
//       }
//     } catch (error) {
//       console.error("WebSocket message processing error:", error);
//     }
//   });

//   wsClient.on("error", (error) => {
//     console.error("WebSocket error:", error);
//     isConnected = false;
//   });

//   wsClient.on("close", () => {
//     isConnected = false;
//     setTimeout(setupWebSocket, config.reconnectDelay);
//   });
// }

// // Main ARI connection function
// async function connect() {
//   try {
//     ariClient = await ari.connect(
//       config.ariUrl,
//       config.ariUsername,
//       config.ariPassword
//     );

//     isConnected = true;
//     reconnectAttempts = 0;

//     // Set up event handlers
//     ariClient.on("StasisStart", (event, channel) => {
//       ariEvents.emit("stasisStart", { event, channel });
//     });

//     ariClient.on("StasisEnd", (event, channel) => {
//       ariEvents.emit("stasisEnd", { event, channel });
//     });

//     await ariClient.start(config.appName);
//     setupWebSocket();

//     return true;
//   } catch (error) {
//     console.error("ARI Connection Error:", error);
//     handleConnectionError(error);
//     return false;
//   }
// }

// // Error handler with reconnection logic
// function handleConnectionError(error) {
//   isConnected = false;

//   if (reconnectAttempts < config.maxReconnectAttempts) {
//     reconnectAttempts++;
//     console.log(
//       `ARI reconnection attempt ${reconnectAttempts}/${config.maxReconnectAttempts}`
//     );
//     setTimeout(connect, config.reconnectDelay);
//   } else {
//     console.error("Max ARI reconnection attempts reached");
//     ariEvents.emit("maxReconnectAttemptsReached");
//   }
// }

// // PJSIP-specific functions
// async function reloadPJSIP() {
//   if (!isConnected || !ariClient) {
//     throw new Error("ARI not connected");
//   }

//   try {
//     await ariClient.asterisk.reloadModule({ moduleName: "res_pjsip.so" });
//     return true;
//   } catch (error) {
//     console.error("PJSIP reload failed:", error);
//     throw error;
//   }
// }

// async function getExtensionStatus(extension) {
//   if (!isConnected || !ariClient) {
//     throw new Error("ARI not connected");
//   }

//   try {
//     const endpoint = await ariClient.endpoints.get({
//       tech: "PJSIP",
//       resource: extension,
//     });

//     return {
//       extension,
//       state: endpoint.state,
//       connected: endpoint.connected,
//       channelCount: endpoint.channelIds.length,
//       timestamp: Date.now(),
//     };
//   } catch (error) {
//     console.error(`Extension status check failed for ${extension}:`, error);
//     throw error;
//   }
// }

// async function monitorExtension(extension) {
//   if (!isConnected || !ariClient) {
//     throw new Error("ARI not connected");
//   }

//   try {
//     await ariClient.endpoints.subscribe({
//       tech: "PJSIP",
//       resource: extension,
//       eventSource: "endpoint:status,device:state",
//     });
//     return true;
//   } catch (error) {
//     console.error(`Extension monitoring failed for ${extension}:`, error);
//     throw error;
//   }
// }

// async function unmonitorExtension(extension) {
//   if (!isConnected || !ariClient) {
//     throw new Error("ARI not connected");
//   }

//   try {
//     await ariClient.endpoints.unsubscribe({
//       tech: "PJSIP",
//       resource: extension,
//       eventSource: "endpoint:status,device:state",
//     });
//     return true;
//   } catch (error) {
//     console.error(`Extension unmonitoring failed for ${extension}:`, error);
//     throw error;
//   }
// }

// // Cleanup function
// async function disconnect() {
//   if (wsClient) {
//     wsClient.terminate();
//     wsClient = null;
//   }

//   if (ariClient) {
//     try {
//       await ariClient.close();
//       ariClient = null;
//       isConnected = false;
//       return true;
//     } catch (error) {
//       console.error("ARI disconnect error:", error);
//       throw error;
//     }
//   }
// }

// // Utility functions
// function getConnectionStatus() {
//   return {
//     connected: isConnected,
//     reconnectAttempts,
//     wsConnected: wsClient?.readyState === WebSocket.OPEN,
//   };
// }

// async function getSystemInfo() {
//   if (!isConnected || !ariClient) {
//     throw new Error("ARI not connected");
//   }

//   try {
//     const info = await ariClient.asterisk.getInfo();
//     return {
//       version: info.system.version,
//       entity_id: info.system.entity_id,
//       status: info.status,
//       timestamp: Date.now(),
//     };
//   } catch (error) {
//     console.error("System info fetch failed:", error);
//     throw error;
//   }
// }

// // Export the API
// export const AsteriskARI = {
//   connect,
//   disconnect,
//   reloadPJSIP,
//   getExtensionStatus,
//   monitorExtension,
//   unmonitorExtension,
//   getConnectionStatus,
//   getSystemInfo,
//   events: ariEvents,
// };

// // Auto-connect when imported
// connect().catch((error) => {
//   console.error("Initial ARI connection failed:", error);
// });
