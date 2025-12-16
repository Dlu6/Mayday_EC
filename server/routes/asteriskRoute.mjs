// // routes/asteriskRoute.mjs
// import express from "express";
// import {
//   addNetworkConfig,
//   deleteNetworkConfig,
//   readNetworkConfigs,
//   updateNetworkConfig,
// } from "../controllers/asteriskController.mjs";
// import { ariService } from "../services/ariService.js";

// const router = express.Router();

// /**
//  * @swagger
//  * components:
//  *   schemas:
//  *     NetworkConfig:
//  *       type: object
//  *       properties:
//  *         type:
//  *           type: string
//  *           enum: [localnet, externip, stun, turn]
//  *         value:
//  *           type: string
//  *         username:
//  *           type: string
//  *         password:
//  *           type: string
//  *     AriStatus:
//  *       type: object
//  *       properties:
//  *         connected:
//  *           type: boolean
//  *         clientInitialized:
//  *           type: boolean
//  *         activeChannels:
//  *           type: number
//  *         reconnectAttempts:
//  *           type: number
//  */

// /**
//  * @swagger
//  * /api/users/asterisk/config-check:
//  *   get:
//  *     tags: [Asterisk]
//  *     summary: Check Asterisk configuration
//  *     responses:
//  *       200:
//  *         description: Configuration check results
//  */
// router.get("/config-check", async (req, res) => {
//   try {
//     const client = ariService.client;
//     if (!client) {
//       throw new Error("ARI client not connected");
//     }

//     // Check Asterisk status
//     const asteriskInfo = await client.asterisk.getInfo();

//     // Get all applications
//     const applications = await client.applications.list();

//     // Get all endpoints
//     const endpoints = await client.endpoints.list();

//     // Get bridge information
//     const bridges = await client.bridges.list();

//     const config = {
//       asterisk: {
//         version: asteriskInfo.system.version,
//         entity_id: asteriskInfo.system.entity_id,
//       },
//       applications: applications.map((app) => ({
//         name: app.name,
//         channelIds: app.channel_ids,
//       })),
//       endpoints: endpoints.map((endpoint) => ({
//         technology: endpoint.technology,
//         resource: endpoint.resource,
//         state: endpoint.state,
//       })),
//       bridges: bridges.length,
//       ariConnected: true,
//       stasisEnabled: applications.some((app) => app.name === "mayday"),
//     };

//     res.json({
//       success: true,
//       config,
//     });
//   } catch (error) {
//     console.error("Configuration check error:", error);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//       details: error.details || "No additional details",
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/users/asterisk/status:
//  *   get:
//  *     tags: [Asterisk]
//  *     summary: Get Asterisk ARI connection status
//  *     description: Returns the current status of the ARI connection including active channels
//  *     responses:
//  *       200:
//  *         description: ARI connection status retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                 status:
//  *                   $ref: '#/components/schemas/AriStatus'
//  *       500:
//  *         description: Server error
//  */
// router.get("/status", async (req, res) => {
//   try {
//     const status = {
//       connected: ariService.connected,
//       clientInitialized: !!ariService.client,
//       reconnectAttempts: ariService.reconnectAttempts,
//     };

//     if (ariService.client) {
//       try {
//         const channels = await ariService.client.channels.list();
//         status.activeChannels = channels.length;
//       } catch (error) {
//         console.error("Error getting channel list:", error);
//         status.activeChannels = -1;
//       }
//     }

//     res.json({
//       success: true,
//       status,
//     });
//   } catch (error) {
//     console.error("Error getting ARI status:", error);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/users/asterisk/diagnostics:
//  *   get:
//  *     tags: [Asterisk]
//  *     summary: Get detailed ARI diagnostics
//  *     responses:
//  *       200:
//  *         description: Diagnostic information
//  */
// router.get("/diagnostics", async (req, res) => {
//   try {
//     const diagnostics = {
//       connection: {
//         connected: ariService.connected,
//         clientInitialized: !!ariService.client,
//         wsUrl: process.env.ARI_WS_URL || "ws://localhost:8088/ari/events",
//         baseUrl: process.env.ARI_URL || "http://localhost:8088/ari",
//       },
//       stasis: {
//         application: "mayday",
//         registered: false,
//         endpoints: [],
//       },
//     };

//     if (ariService.client) {
//       try {
//         // Test basic ARI operations
//         const info = await ariService.client.asterisk.getInfo();
//         diagnostics.asterisk = {
//           version: info.system.version,
//           status: "running",
//         };
//       } catch (error) {
//         diagnostics.asterisk = {
//           error: error.message,
//           status: "error",
//         };
//       }

//       try {
//         // Check Stasis applications
//         const apps = await ariService.client.applications.list();
//         diagnostics.stasis.registered = apps.some(
//           (app) => app.name === "mayday"
//         );
//         diagnostics.stasis.applications = apps.map((app) => ({
//           name: app.name,
//           channelCount: app.channel_ids?.length || 0,
//         }));
//       } catch (error) {
//         diagnostics.stasis.error = error.message;
//       }

//       try {
//         // Check endpoints
//         const endpoints = await ariService.client.endpoints.list();
//         diagnostics.stasis.endpoints = endpoints.map((ep) => ({
//           tech: ep.technology,
//           resource: ep.resource,
//           state: ep.state,
//         }));
//       } catch (error) {
//         diagnostics.stasis.endpointError = error.message;
//       }
//     }

//     res.json({
//       success: true,
//       diagnostics,
//     });
//   } catch (error) {
//     console.error("Diagnostic error:", error);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/users/asterisk/test-stasis:
//  *   post:
//  *     tags: [Asterisk]
//  *     summary: Create a test Stasis channel
//  *     responses:
//  *       200:
//  *         description: Test channel created successfully
//  */
// router.post("/test-stasis", async (req, res) => {
//   try {
//     // Validate ARI connection
//     if (!ariService.client || !ariService.connected) {
//       throw new Error("ARI client not connected");
//     }

//     // Check Asterisk status
//     console.log("Checking ARI client status...");
//     const info = await ariService.client.asterisk.getInfo();
//     console.log("Asterisk Info:", {
//       version: info.system.version,
//       status: info.status.startup_time,
//     });

//     // Create test channel using originate
//     console.log("Creating test channel...");
//     const channel = await ariService.client.channels.originate({
//       endpoint: "Local/1000@default",
//       app: "mayday",
//       appArgs: "test",
//       callerId: "Test <1000>",
//       timeout: 30,
//       channelId: `test-${Date.now()}`, // Unique channel ID
//       variables: {
//         "CHANNEL(language)": "en",
//         "CHANNEL(accountcode)": "test",
//       },
//     });

//     console.log("Channel created successfully:", {
//       id: channel.id,
//       name: channel.name,
//       state: channel.state,
//     });

//     return res.json({
//       success: true,
//       channel: {
//         id: channel.id,
//         name: channel.name,
//         state: channel.state,
//         dialplan: {
//           context: channel.dialplan?.context,
//           exten: channel.dialplan?.exten,
//           priority: channel.dialplan?.priority,
//         },
//       },
//       info: {
//         asteriskVersion: info.system.version,
//         timestamp: new Date().toISOString(),
//       },
//     });
//   } catch (error) {
//     // Enhanced error handling
//     const errorDetails = {
//       message: error.message,
//       code: error.code,
//       type: error.name,
//       timestamp: new Date().toISOString(),
//     };

//     console.error("Test channel creation failed:", {
//       error: error.message,
//       details: errorDetails,
//       stack: error.stack,
//     });

//     return res.status(500).json({
//       success: false,
//       error: errorDetails,
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/users/asterisk/test-stasis/status:
//  *   get:
//  *     tags: [Asterisk]
//  *     summary: Get status of current Stasis channels
//  *     responses:
//  *       200:
//  *         description: Current channels status
//  */
// router.get("/test-stasis/status", async (req, res) => {
//   try {
//     if (!ariService.client) {
//       throw new Error("ARI client not connected");
//     }

//     const [channels, apps, endpoints] = await Promise.all([
//       ariService.client.channels.list(),
//       ariService.client.applications.list(),
//       ariService.client.endpoints.list(),
//     ]);

//     res.json({
//       success: true,
//       status: {
//         activeChannels: channels.length,
//         channels: channels.map((channel) => ({
//           id: channel.id,
//           name: channel.name,
//           state: channel.state,
//           dialplan: channel.dialplan,
//         })),
//         applications: apps.map((app) => ({
//           name: app.name,
//           channelCount: app.channel_ids?.length || 0,
//         })),
//         endpoints: endpoints.map((endpoint) => ({
//           technology: endpoint.technology,
//           resource: endpoint.resource,
//           state: endpoint.state,
//         })),
//       },
//     });
//   } catch (error) {
//     console.error("Error getting stasis status:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         message: error.message,
//         timestamp: new Date().toISOString(),
//       },
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/users/asterisk/test-stasis/hangup/{channelId}:
//  *   delete:
//  *     tags: [Asterisk]
//  *     summary: Hangup a specific channel
//  *     parameters:
//  *       - in: path
//  *         name: channelId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: ID of the channel to hangup
//  *     responses:
//  *       200:
//  *         description: Channel hung up successfully
//  */
// router.delete("/test-stasis/hangup/:channelId", async (req, res) => {
//   try {
//     if (!ariService.client) {
//       throw new Error("ARI client not connected");
//     }

//     const { channelId } = req.params;
//     await ariService.client.channels.hangup({
//       channelId: channelId,
//     });

//     res.json({
//       success: true,
//       message: `Channel ${channelId} hung up successfully`,
//     });
//   } catch (error) {
//     console.error("Error hanging up channel:", error);
//     res.status(500).json({
//       success: false,
//       error: {
//         message: error.message,
//         timestamp: new Date().toISOString(),
//       },
//     });
//   }
// });

// /**
//  * @swagger
//  * /api/users/asterisk/add-externip:
//  *   post:
//  *     tags: [Network Configuration]
//  *     summary: Add external IP configuration
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/NetworkConfig'
//  *     responses:
//  *       200:
//  *         description: Network configuration added successfully
//  *       500:
//  *         description: Server error
//  */
// router.post("/add-externip", addNetworkConfig);

// /**
//  * @swagger
//  * /api/users/asterisk/get-externip:
//  *   get:
//  *     tags: [Network Configuration]
//  *     summary: Get all network configurations
//  *     responses:
//  *       200:
//  *         description: List of network configurations
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/NetworkConfig'
//  */
// router.get("/get-externip", readNetworkConfigs);

// /**
//  * @swagger
//  * /api/users/asterisk/update-externip:
//  *   put:
//  *     tags: [Network Configuration]
//  *     summary: Update network configuration
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/NetworkConfig'
//  *     responses:
//  *       200:
//  *         description: Network configuration updated successfully
//  *       500:
//  *         description: Server error
//  */
// router.put("/update-externip", updateNetworkConfig);

// /**
//  * @swagger
//  * /api/users/asterisk/delete-externip/{id}:
//  *   delete:
//  *     tags: [Network Configuration]
//  *     summary: Delete network configuration
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: Network configuration ID
//  *     responses:
//  *       200:
//  *         description: Network configuration deleted successfully
//  *       500:
//  *         description: Server error
//  */
// router.delete("/delete-externip/:id", deleteNetworkConfig);

// export default router;
