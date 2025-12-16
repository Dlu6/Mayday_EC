import amiService from "../services/amiService.js";
// import { callMonitoringService } from "../services/callMonitoringService.js";
import logger from "../utils/logger.js";
import CDR from "../models/cdr.js";

/**
 * Enhanced Transfer Controller for Mayday CRM
 * Implements comprehensive call transfer functionality using AMI
 *
 * Status: ✅ Complete and Deployed
 * Features: Blind Transfer, Managed Transfer, Queue Transfer
 * Last Updated: January 2025
 *
 * Note: callMonitoringService import commented out for compatibility
 */

// State management for transfers
const transferState = {
  activeTransfers: new Map(),
  transferQueue: [],
  maxConcurrentTransfers: 10,
};

/**
 * Execute blind transfer (immediate transfer without consultation)
 */
export const blindTransfer = async (req, res) => {
  try {
    let {
      channel,
      targetExtension,
      context = "from-internal",
      extension,
    } = req.body;

    if (!channel || !targetExtension) {
      // Allow passing extension instead of channel; resolve active channel
      if (extension && !channel) {
        const ch = await amiService.getChannelForExtension(extension);
        if (ch && ch.channel) {
          channel = ch.channel;
        }
      }

      if (!channel || !targetExtension) {
        return res.status(400).json({
          success: false,
          message: "Channel (or extension) and targetExtension are required",
        });
      }
    }

    logger.info(`Executing blind transfer: ${channel} -> ${targetExtension}`);

    // Validate channel exists and is active
    const channelInfo = await validateChannel(channel);
    if (!channelInfo.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid channel: ${channelInfo.reason}`,
      });
    }

    // Execute transfer using AMI
    const transferAction = {
      Action: "Redirect",
      Channel: channel,
      Context: context,
      Exten: targetExtension,
      Priority: 1,
    };

    const result = await amiService.executeAMIAction(transferAction);

    if (result.Response === "Success") {
      // Track transfer
      trackTransfer(channel, {
        type: "blind",
        target: targetExtension,
        timestamp: new Date(),
        status: "completed",
        amiResponse: result,
      });

      // Update CDR
      await updateCDRForTransfer(
        channelInfo.uniqueId,
        targetExtension,
        "blind"
      );

      logger.info(
        `Blind transfer successful: ${channel} -> ${targetExtension}`
      );

      res.json({
        success: true,
        data: {
          transferType: "blind",
          channel,
          targetExtension,
          context,
          timestamp: new Date().toISOString(),
          amiResponse: result,
        },
      });
    } else {
      throw new Error(
        `AMI transfer failed: ${result.Message || "Unknown error"}`
      );
    }
  } catch (error) {
    logger.logError("Blind transfer error", error);
    res.status(500).json({
      success: false,
      message: "Failed to execute blind transfer",
      error: error.message,
    });
  }
};

/**
 * Execute managed transfer (transfer with consultation)
 */
export const managedTransfer = async (req, res) => {
  try {
    let {
      originalChannel,
      targetExtension,
      context = "from-internal",
      consultationTimeout = 30000,
      extension,
    } = req.body;

    if (!originalChannel || !targetExtension) {
      // Allow passing extension instead of channel; resolve active channel
      if (extension && !originalChannel) {
        const ch = await amiService.getChannelForExtension(extension);
        if (ch && ch.channel) {
          originalChannel = ch.channel;
        }
      }

      if (!originalChannel || !targetExtension) {
        return res.status(400).json({
          success: false,
          message:
            "originalChannel (or extension) and targetExtension are required",
        });
      }
    }

    logger.info(
      `Executing managed transfer: ${originalChannel} -> ${targetExtension}`
    );

    // Validate original channel
    const channelInfo = await validateChannel(originalChannel);
    if (!channelInfo.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid channel: ${channelInfo.reason}`,
      });
    }

    // Check if we can handle more transfers
    if (
      transferState.activeTransfers.size >= transferState.maxConcurrentTransfers
    ) {
      return res.status(429).json({
        success: false,
        message: "Maximum concurrent transfers reached",
      });
    }

    // Create consultation call with proper variable handling
    const consultationAction = {
      Action: "Originate",
      Channel: `SIP/${targetExtension}`,
      Context: context,
      Exten: "s",
      Priority: 1,
      Callerid: `Transfer <${channelInfo.extension || "Unknown"}>`,
      Variable: [
        "TRANSFER_TYPE=consultation",
        `ORIGINAL_CHANNEL=${originalChannel}`,
        `TRANSFER_ID=${Date.now()}`,
      ].join(","),
    };

    const consultationResult = await amiService.executeAMIAction(
      consultationAction
    );

    if (consultationResult.Response === "Success") {
      const transferId = consultationResult.Uniqueid || Date.now().toString();

      // Track the transfer
      trackTransfer(originalChannel, {
        type: "managed",
        target: targetExtension,
        consultationId: transferId,
        timestamp: new Date(),
        status: "consultation",
        originalChannel,
        context,
      });

      // Set up consultation monitoring
      monitorConsultation(originalChannel, transferId, consultationTimeout);

      logger.info(
        `Managed transfer consultation initiated: ${originalChannel} -> ${targetExtension}`
      );

      res.json({
        success: true,
        data: {
          transferType: "managed",
          transferId,
          originalChannel,
          targetExtension,
          context,
          status: "consultation",
          timestamp: new Date().toISOString(),
          consultationResult,
        },
      });
    } else {
      throw new Error(
        `Consultation call failed: ${
          consultationResult.Message || "Unknown error"
        }`
      );
    }
  } catch (error) {
    logger.logError("Managed transfer error", error);
    res.status(500).json({
      success: false,
      message: "Failed to execute managed transfer",
      error: error.message,
    });
  }
};

/**
 * Complete managed transfer by bridging calls
 */
export const completeManagedTransfer = async (req, res) => {
  try {
    const { transferId, action } = req.body;

    if (!transferId || !action) {
      return res.status(400).json({
        success: false,
        message: "transferId and action are required",
      });
    }

    const transfer = findTransferById(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    if (action === "complete") {
      // Bridge the calls
      const bridgeResult = await bridgeCalls(
        transfer.originalChannel,
        transfer.consultationId
      );

      if (bridgeResult.success) {
        transfer.status = "completed";
        transfer.completedAt = new Date();

        // Update CDR
        await updateCDRForTransfer(
          transfer.originalChannel,
          transfer.target,
          "managed"
        );

        logger.info(`Managed transfer completed: ${transferId}`);

        res.json({
          success: true,
          data: {
            transferId,
            status: "completed",
            bridgeResult,
          },
        });
      } else {
        throw new Error(`Bridge failed: ${bridgeResult.error}`);
      }
    } else if (action === "cancel") {
      // Cancel the transfer
      await cancelTransferById(transferId);

      res.json({
        success: true,
        data: {
          transferId,
          status: "cancelled",
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid action. Use 'complete' or 'cancel'",
      });
    }
  } catch (error) {
    logger.logError("Complete managed transfer error", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete managed transfer",
      error: error.message,
    });
  }
};

/**
 * Transfer call to a specific queue
 */
export const transferToQueue = async (req, res) => {
  try {
    const { channel, queueName, context = "from-queue" } = req.body;

    if (!channel || !queueName) {
      return res.status(400).json({
        success: false,
        message: "Channel and queueName are required",
      });
    }

    logger.info(`Transferring to queue: ${channel} -> ${queueName}`);

    // Validate channel
    const channelInfo = await validateChannel(channel);
    if (!channelInfo.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid channel: ${channelInfo.reason}`,
      });
    }

    // Execute queue transfer
    const transferAction = {
      Action: "Redirect",
      Channel: channel,
      Context: context,
      Exten: queueName,
      Priority: 1,
    };

    const result = await amiService.executeAMIAction(transferAction);

    if (result.Response === "Success") {
      // Track transfer
      trackTransfer(channel, {
        type: "queue",
        target: queueName,
        timestamp: new Date(),
        status: "completed",
        amiResponse: result,
      });

      // Update CDR
      await updateCDRForTransfer(channelInfo.uniqueId, queueName, "queue");

      logger.info(`Queue transfer successful: ${channel} -> ${queueName}`);

      res.json({
        success: true,
        data: {
          transferType: "queue",
          channel,
          queueName,
          context,
          timestamp: new Date().toISOString(),
          amiResponse: result,
        },
      });
    } else {
      throw new Error(
        `Queue transfer failed: ${result.Message || "Unknown error"}`
      );
    }
  } catch (error) {
    logger.logError("Queue transfer error", error);
    res.status(500).json({
      success: false,
      message: "Failed to transfer to queue",
      error: error.message,
    });
  }
};

/**
 * Get transfer status and history
 */
export const getTransferStatus = async (req, res) => {
  try {
    const { channel, transferId } = req.query;

    if (channel) {
      const transfer = transferState.activeTransfers.get(channel);
      if (transfer) {
        return res.json({
          success: true,
          data: transfer,
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "No active transfer found for channel",
        });
      }
    }

    if (transferId) {
      const transfer = findTransferById(transferId);
      if (transfer) {
        return res.json({
          success: true,
          data: transfer,
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Transfer not found",
        });
      }
    }

    // Return all active transfers
    const activeTransfers = Array.from(transferState.activeTransfers.values());
    res.json({
      success: true,
      data: {
        activeTransfers,
        totalActive: activeTransfers.length,
        maxConcurrent: transferState.maxConcurrentTransfers,
      },
    });
  } catch (error) {
    logger.logError("Get transfer status error", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transfer status",
      error: error.message,
    });
  }
};

/**
 * Cancel an active transfer
 */
export const cancelTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;

    const cancelled = await cancelTransferById(transferId);

    if (cancelled) {
      res.json({
        success: true,
        message: "Transfer cancelled successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }
  } catch (error) {
    logger.logError("Cancel transfer error", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel transfer",
      error: error.message,
    });
  }
};

// Helper functions

/**
 * Validate if a channel exists and is active
 */
const validateChannel = async (channel) => {
  try {
    const response = await amiService.executeAMIAction({
      Action: "GetVar",
      Channel: channel,
      Variable: "CHANNEL",
    });

    if (response.Response === "Success") {
      // Get additional channel info
      const channelInfo = await amiService.executeAMIAction({
        Action: "CoreShowChannels",
      });

      // Parse channel info to find our specific channel
      const channelData = parseChannelInfo(channelInfo, channel);

      return {
        valid: true,
        uniqueId: channelData?.Uniqueid,
        extension: channelData?.CallerIDNum,
        state: channelData?.ChannelState,
      };
    } else {
      return {
        valid: false,
        reason: "Channel not found or inactive",
      };
    }
  } catch (error) {
    logger.logError("Channel validation error", error);
    return {
      valid: false,
      reason: error.message,
    };
  }
};

/**
 * Track transfer in memory
 */
const trackTransfer = (channel, transferData) => {
  transferState.activeTransfers.set(channel, {
    id: Date.now().toString(),
    ...transferData,
  });
};

/**
 * Find transfer by ID
 */
const findTransferById = (transferId) => {
  for (const [channel, transfer] of transferState.activeTransfers) {
    if (transfer.id === transferId || transfer.consultationId === transferId) {
      return transfer;
    }
  }
  return null;
};

/**
 * Bridge two channels for managed transfer
 */
const bridgeCalls = async (channel1, channel2) => {
  try {
    const bridgeAction = {
      Action: "Bridge",
      Channel1: channel1,
      Channel2: channel2,
    };

    const result = await amiService.executeAMIAction(bridgeAction);

    return {
      success: result.Response === "Success",
      amiResponse: result,
    };
  } catch (error) {
    logger.logError("Bridge calls error", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Cancel a transfer by ID
 */
const cancelTransferById = async (transferId) => {
  const transfer = findTransferById(transferId);
  if (!transfer) {
    return false;
  }

  try {
    // If it's a managed transfer with consultation, hang up consultation
    if (transfer.type === "managed" && transfer.consultationId) {
      await amiService.executeAMIAction({
        Action: "Hangup",
        Channel: transfer.consultationId,
      });
    }

    // Remove from tracking
    transferState.activeTransfers.delete(
      transfer.originalChannel || transfer.channel
    );

    logger.info(`Transfer cancelled: ${transferId}`);
    return true;
  } catch (error) {
    logger.logError("Cancel transfer error", error);
    return false;
  }
};

/**
 * Monitor consultation call for managed transfer
 */
const monitorConsultation = (originalChannel, consultationId, timeout) => {
  setTimeout(async () => {
    const transfer = transferState.activeTransfers.get(originalChannel);
    if (transfer && transfer.status === "consultation") {
      logger.warn(`Consultation timeout for transfer: ${consultationId}`);
      transfer.status = "timeout";

      // Auto-cancel timed out consultation
      await cancelTransferById(consultationId);
    }
  }, timeout);
};

/**
 * Parse channel information from CoreShowChannels response
 */
const parseChannelInfo = (response, targetChannel) => {
  if (response.Response === "Success" && response.Events) {
    for (const event of response.Events) {
      if (
        event.Event === "CoreShowChannel" &&
        event.Channel === targetChannel
      ) {
        return event;
      }
    }
  }
  return null;
};

/**
 * Update CDR for transfer
 */
const updateCDRForTransfer = async (uniqueId, target, transferType) => {
  if (!uniqueId) return;

  try {
    await CDR.update(
      {
        userfield: `Transfer to ${target} (${transferType})`,
        disposition: "TRANSFER",
        lastapp: `Transfer-${transferType}`,
        lastdata: target,
      },
      {
        where: { uniqueid: uniqueId },
      }
    );
  } catch (error) {
    logger.logError("Failed to update CDR for transfer", error);
  }
};

export default {
  blindTransfer,
  managedTransfer,
  completeManagedTransfer,
  transferToQueue,
  getTransferStatus,
  cancelTransfer,
};
