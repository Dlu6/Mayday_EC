import express from "express";
import amiService from "../services/amiService.js";

const router = express.Router();

// 🔐 Middleware to check if AMI is connected
const requireAMI = (req, res, next) => {
  const state = amiService.getState();
  if (!state.connected) {
    return res.status(503).json({
      success: false,
      error: "AMI service not connected",
      message: "Please ensure AMI connection is established",
    });
  }
  next();
};

// 📊 GET /api/ami/status - Get AMI connection status
router.get("/status", (req, res) => {
  try {
    const state = amiService.getState();
    res.json({
      success: true,
      data: {
        connected: state.connected,
        cacheSize: state.cacheSize,
        lastCacheUpdate: state.lastCacheUpdate,
        timestamp: new Date().toISOString(),
      },
      message: "AMI status retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get AMI status",
    });
  }
});

// 🔌 POST /api/ami/connect - Connect to AMI
router.post("/connect", async (req, res) => {
  try {
    const result = await amiService.connect();
    res.json({
      success: true,
      data: result,
      message: "AMI connected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to connect to AMI",
    });
  }
});

// 🔌 POST /api/ami/disconnect - Disconnect from AMI
router.post("/disconnect", async (req, res) => {
  try {
    await amiService.disconnect();
    res.json({
      success: true,
      message: "AMI disconnected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to disconnect from AMI",
    });
  }
});

// 📞 POST /api/ami/originate - Originate a call
router.post("/originate", requireAMI, async (req, res) => {
  try {
    const { fromExtension, toNumber, callerId, options } = req.body;

    if (!fromExtension || !toNumber) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "fromExtension and toNumber are required",
      });
    }

    const result = await amiService.originateCall(
      fromExtension,
      toNumber,
      callerId,
      options
    );

    res.json({
      success: true,
      data: result,
      message: "Call originated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to originate call",
    });
  }
});

// 🔀 POST /api/ami/transfer - Transfer a call
router.post("/transfer", requireAMI, async (req, res) => {
  try {
    const {
      channel,
      targetExtension,
      transferType = "blind",
      options,
    } = req.body;

    if (!channel || !targetExtension) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "channel and targetExtension are required",
      });
    }

    let result;
    if (transferType === "blind") {
      result = await amiService.blindTransfer(
        channel,
        targetExtension,
        options
      );
    } else if (transferType === "attended") {
      result = await amiService.attendedTransfer(
        channel,
        targetExtension,
        options
      );
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid transfer type",
        message: "transferType must be 'blind' or 'attended'",
      });
    }

    res.json({
      success: true,
      data: result,
      message: `${transferType} transfer initiated successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to transfer call",
    });
  }
});

// 🔀 POST /api/ami/transfer/by-extension - Resolve channel from extension then transfer
router.post("/transfer/by-extension", requireAMI, async (req, res) => {
  try {
    const {
      fromExtension,
      targetExtension,
      transferType = "blind",
      options,
    } = req.body;

    if (!fromExtension || !targetExtension) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "fromExtension and targetExtension are required",
      });
    }

    // Resolve the live channel for the origin extension
    const chInfo = await amiService.getChannelForExtension(fromExtension);
    const channel = chInfo?.channel;

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: "Channel not found",
        message: `No active channel found for extension ${fromExtension}`,
      });
    }

    let result;
    if (transferType === "blind") {
      result = await amiService.blindTransfer(
        channel,
        targetExtension,
        options
      );
    } else if (transferType === "attended") {
      result = await amiService.attendedTransfer(
        channel,
        targetExtension,
        options
      );
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid transfer type",
        message: "transferType must be 'blind' or 'attended'",
      });
    }

    res.json({
      success: true,
      data: result,
      message: `${transferType} transfer initiated successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to transfer call by extension",
    });
  }
});

// 📞 POST /api/ami/hangup - Hangup a call
router.post("/hangup", requireAMI, async (req, res) => {
  try {
    const { channel, cause = 16 } = req.body;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "channel is required",
      });
    }

    const result = await amiService.hangupCall(channel, cause);

    res.json({
      success: true,
      data: result,
      message: "Call hung up successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to hangup call",
    });
  }
});

// 🔀 POST /api/ami/redirect - Redirect a call
router.post("/redirect", requireAMI, async (req, res) => {
  try {
    const { channel, targetExtension, options } = req.body;

    if (!channel || !targetExtension) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "channel and targetExtension are required",
      });
    }

    const result = await amiService.redirectCall(
      channel,
      targetExtension,
      options
    );

    res.json({
      success: true,
      data: result,
      message: "Call redirected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to redirect call",
    });
  }
});

// 📊 GET /api/ami/channels - Get active channels
router.get("/channels", requireAMI, async (req, res) => {
  try {
    const result = await amiService.getActiveChannels();

    res.json({
      success: true,
      data: result,
      message: "Active channels retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get active channels",
    });
  }
});

// 📊 GET /api/ami/channel/:channel/status - Get specific channel status
router.get("/channel/:channel/status", requireAMI, async (req, res) => {
  try {
    const { channel } = req.params;
    const result = await amiService.getChannelStatus(channel);

    res.json({
      success: true,
      data: result,
      message: "Channel status retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get channel status",
    });
  }
});

// 📱 GET /api/ami/endpoints - Get PJSIP endpoints
router.get("/endpoints", requireAMI, async (req, res) => {
  try {
    const result = await amiService.executeAction({
      Action: "PJSIPShowEndpoints",
    });

    res.json({
      success: true,
      data: result,
      message: "PJSIP endpoints retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get PJSIP endpoints",
    });
  }
});

// 📱 GET /api/ami/contacts - Get PJSIP contacts
router.get("/contacts", requireAMI, async (req, res) => {
  try {
    const result = await amiService.executeAction({
      Action: "PJSIPShowContacts",
    });

    res.json({
      success: true,
      data: result,
      message: "PJSIP contacts retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get PJSIP contacts",
    });
  }
});

// 📱 GET /api/ami/registrations - Get PJSIP registrations
router.get("/registrations", requireAMI, async (req, res) => {
  try {
    const result = await amiService.executeAction({
      Action: "PJSIPShowRegistrations",
    });

    res.json({
      success: true,
      data: result,
      message: "PJSIP registrations retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get PJSIP registrations",
    });
  }
});

// 🔀 GET /api/ami/queues - Get queue status
router.get("/queues", requireAMI, async (req, res) => {
  try {
    const { queueName } = req.query;
    const result = await amiService.getQueueStatus(queueName);

    res.json({
      success: true,
      data: result,
      message: "Queue status retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get queue status",
    });
  }
});

// 🔀 GET /api/ami/queues/summary - Get queue summary
router.get("/queues/summary", requireAMI, async (req, res) => {
  try {
    const { queueName } = req.query;
    const result = await amiService.getQueueSummary(queueName);

    res.json({
      success: true,
      data: result,
      message: "Queue summary retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get queue summary",
    });
  }
});

// 👥 POST /api/ami/queues/agent - Add agent to queue
router.post("/queues/agent", requireAMI, async (req, res) => {
  try {
    const { queueName, agentInterface, options } = req.body;

    if (!queueName || !agentInterface) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "queueName and agentInterface are required",
      });
    }

    const result = await amiService.addAgentToQueue(
      queueName,
      agentInterface,
      options
    );

    res.json({
      success: true,
      data: result,
      message: "Agent added to queue successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to add agent to queue",
    });
  }
});

// 👥 DELETE /api/ami/queues/agent - Remove agent from queue
router.delete("/queues/agent", requireAMI, async (req, res) => {
  try {
    const { queueName, agentInterface } = req.body;

    if (!queueName || !agentInterface) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "queueName and agentInterface are required",
      });
    }

    const result = await amiService.removeAgentFromQueue(
      queueName,
      agentInterface
    );

    res.json({
      success: true,
      data: result,
      message: "Agent removed from queue successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to remove agent from queue",
    });
  }
});

// 📹 POST /api/ami/recording/start - Start call recording
router.post("/recording/start", requireAMI, async (req, res) => {
  try {
    const { channel, options } = req.body;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "channel is required",
      });
    }

    const result = await amiService.startCallRecording(channel, options);

    res.json({
      success: true,
      data: result,
      message: "Call recording started successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to start call recording",
    });
  }
});

// 📹 POST /api/ami/recording/stop - Stop call recording
router.post("/recording/stop", requireAMI, async (req, res) => {
  try {
    const { channel } = req.body;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "channel is required",
      });
    }

    const result = await amiService.stopCallRecording(channel);

    res.json({
      success: true,
      data: result,
      message: "Call recording stopped successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to stop call recording",
    });
  }
});

// 🔧 POST /api/ami/execute - Execute custom AMI action
router.post("/execute", requireAMI, async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || !action.Action) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "action object with Action property is required",
      });
    }

    const result = await amiService.executeAction(action);

    res.json({
      success: true,
      data: result,
      message: "AMI action executed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to execute AMI action",
    });
  }
});

// 📊 GET /api/ami/extensions - Get extension statuses
router.get("/extensions", async (req, res) => {
  try {
    const result = await amiService.getAllExtensionStatuses();

    res.json({
      success: true,
      data: result,
      message: "Extension statuses retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get extension statuses",
    });
  }
});

// 📊 GET /api/ami/extensions/:extension - Get specific extension status
router.get("/extensions/:extension", async (req, res) => {
  try {
    const { extension } = req.params;
    const result = await amiService.getExtensionStatus(extension);

    res.json({
      success: true,
      data: result,
      message: "Extension status retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get extension status",
    });
  }
});

// 🔍 GET /api/ami/call-info/:channel - Get detailed call information
router.get("/call-info/:channel", requireAMI, async (req, res) => {
  try {
    const { channel } = req.params;

    // Get channel status
    const statusResult = await amiService.executeAction({
      Action: "Status",
      Channel: channel,
    });

    // Get channel variables
    const variablesResult = await amiService.executeAction({
      Action: "GetVar",
      Channel: channel,
      Variable: "CALLERID",
    });

    res.json({
      success: true,
      data: {
        channel: channel,
        status: statusResult,
        variables: variablesResult,
        message: "Call information retrieved successfully",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get call information",
    });
  }
});

// 🔄 POST /api/ami/call-events - Subscribe to call events for a specific channel
router.post("/call-events", requireAMI, async (req, res) => {
  try {
    const { channel, events } = req.body;

    // This would set up event monitoring for specific channels
    // In practice, you'd use WebSocket or Server-Sent Events

    res.json({
      success: true,
      message: "Call event monitoring configured",
      note: "Use WebSocket connection for real-time events",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to configure call event monitoring",
    });
  }
});

// ========================================
// 🔊 CHANSPY ROUTES - Call Monitoring/Supervision
// ========================================

/**
 * @swagger
 * /api/ami/chanspy/start:
 *   post:
 *     summary: Start ChanSpy session on a specific channel
 *     tags: [ChanSpy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spyerExtension
 *               - targetChannel
 *             properties:
 *               spyerExtension:
 *                 type: string
 *                 description: Extension of the supervisor
 *               targetChannel:
 *                 type: string
 *                 description: Channel to spy on
 *               mode:
 *                 type: string
 *                 enum: [listen, whisper, barge]
 *                 default: listen
 *               quiet:
 *                 type: boolean
 *                 default: true
 *               volume:
 *                 type: integer
 *                 minimum: -4
 *                 maximum: 4
 */
router.post("/chanspy/start", requireAMI, async (req, res) => {
  try {
    const { spyerExtension, targetChannel, mode, quiet, volume, group } = req.body;

    if (!spyerExtension || !targetChannel) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "spyerExtension and targetChannel are required",
      });
    }

    const result = await amiService.startChanSpy(spyerExtension, targetChannel, {
      mode: mode || "listen",
      quiet: quiet !== false,
      volume,
      group,
    });

    res.json({
      success: true,
      data: result,
      message: `ChanSpy started successfully in ${mode || "listen"} mode`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to start ChanSpy",
    });
  }
});

/**
 * @swagger
 * /api/ami/chanspy/start-by-extension:
 *   post:
 *     summary: Start ChanSpy session on a specific extension (auto-finds active channel)
 *     tags: [ChanSpy]
 */
router.post("/chanspy/start-by-extension", requireAMI, async (req, res) => {
  try {
    const { spyerExtension, targetExtension, mode, quiet, volume, group } = req.body;

    if (!spyerExtension || !targetExtension) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "spyerExtension and targetExtension are required",
      });
    }

    const result = await amiService.startChanSpyByExtension(
      spyerExtension,
      targetExtension,
      {
        mode: mode || "listen",
        quiet: quiet !== false,
        volume,
        group,
      }
    );

    res.json({
      success: true,
      data: result,
      message: `ChanSpy started on extension ${targetExtension} in ${mode || "listen"} mode`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to start ChanSpy by extension",
    });
  }
});

/**
 * @swagger
 * /api/ami/chanspy/stop:
 *   post:
 *     summary: Stop an active ChanSpy session
 *     tags: [ChanSpy]
 */
router.post("/chanspy/stop", requireAMI, async (req, res) => {
  try {
    const { spyerExtension } = req.body;

    if (!spyerExtension) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "spyerExtension is required",
      });
    }

    const result = await amiService.stopChanSpy(spyerExtension);

    res.json({
      success: true,
      data: result,
      message: "ChanSpy stopped successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to stop ChanSpy",
    });
  }
});

/**
 * @swagger
 * /api/ami/chanspy/channels:
 *   get:
 *     summary: Get list of channels that can be spied on
 *     tags: [ChanSpy]
 */
router.get("/chanspy/channels", requireAMI, async (req, res) => {
  try {
    const result = await amiService.getSpyableChannels();

    res.json({
      success: true,
      data: result,
      count: result.length,
      message: "Spyable channels retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to get spyable channels",
    });
  }
});

/**
 * @swagger
 * /api/ami/chanspy/switch-mode:
 *   post:
 *     summary: Switch ChanSpy mode during an active session
 *     tags: [ChanSpy]
 */
router.post("/chanspy/switch-mode", requireAMI, async (req, res) => {
  try {
    const { spyerExtension, mode } = req.body;

    if (!spyerExtension || !mode) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        message: "spyerExtension and mode are required",
      });
    }

    if (!["listen", "whisper", "barge"].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: "Invalid mode",
        message: "mode must be 'listen', 'whisper', or 'barge'",
      });
    }

    const result = await amiService.switchChanSpyMode(spyerExtension, mode);

    res.json({
      success: true,
      data: result,
      message: result.success
        ? `Mode switched to ${mode}`
        : result.message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to switch ChanSpy mode",
    });
  }
});

export default router;
