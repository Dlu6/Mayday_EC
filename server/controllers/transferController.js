// controllers/transferController.js
import CDR from "../models/cdr.js";
import { Op } from "../config/sequelize.js";
import { callMonitoringService } from "../services/callMonitoringService.js";
import amiService from "../services/amiService.js";
import logger from "../utils/logger.js";
import UserModel from "../models/UsersModel.js";
import VoiceExtension from "../models/voiceExtensionModel.js";
import { managedTransfer as enhancedManagedTransfer } from "./enhancedTransferController.js";

/**
 * Get transfer statistics for the current day
 */
export const getTransferStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's transfers from CDR
    const transfers = await CDR.findAll({
      where: {
        start: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
        // Look for transfer-related dispositions or userfield
        [Op.or]: [
          { disposition: "TRANSFER" },
          { disposition: "FORWARD" },
          { disposition: "REDIRECT" },
          { userfield: { [Op.like]: "%transfer%" } },
          { userfield: { [Op.like]: "%forward%" } },
        ],
      },
      attributes: [
        "id",
        "start",
        "answer",
        "end",
        "duration",
        "billsec",
        "disposition",
        "src",
        "dst",
        "dcontext",
        "uniqueid",
        "userfield",
      ],
      order: [["start", "DESC"]],
    });

    // Calculate statistics
    const stats = {
      total: transfers.length,
      successful: transfers.filter((t) => t.disposition === "ANSWERED").length,
      failed: transfers.filter((t) => t.disposition === "NO ANSWER").length,
      averageDuration: 0,
      bySource: {},
      byDestination: {},
    };

    if (transfers.length > 0) {
      const totalDuration = transfers.reduce(
        (sum, t) => sum + (t.billsec || 0),
        0
      );
      stats.averageDuration = Math.round(totalDuration / transfers.length);

      // Group by source and destination
      transfers.forEach((transfer) => {
        const src = transfer.src;
        const dst = transfer.dst;

        if (!stats.bySource[src]) stats.bySource[src] = 0;
        if (!stats.byDestination[dst]) stats.byDestination[dst] = 0;

        stats.bySource[src]++;
        stats.byDestination[dst]++;
      });
    }

    res.json({
      success: true,
      data: {
        stats,
        transfers: transfers.map((t) => ({
          id: t.id,
          start: t.start,
          duration: t.duration,
          billsec: t.billsec,
          disposition: t.disposition,
          src: t.src,
          dst: t.dst,
          uniqueid: t.uniqueid,
          userfield: t.userfield,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting transfer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transfer statistics",
      error: error.message,
    });
  }
};

/**
 * Get transfer history for a specific date range
 */
export const getTransferHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    let whereClause = {};

    if (startDate && endDate) {
      whereClause.start = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate),
      };
    }

    // Look for transfer-related calls
    whereClause[Op.or] = [
      { disposition: "TRANSFER" },
      { disposition: "FORWARD" },
      { disposition: "REDIRECT" },
      { userfield: { [Op.like]: "%transfer%" } },
      { userfield: { [Op.like]: "%forward%" } },
    ];

    const transfers = await CDR.findAll({
      where: whereClause,
      attributes: [
        "id",
        "start",
        "answer",
        "end",
        "duration",
        "billsec",
        "disposition",
        "src",
        "dst",
        "dcontext",
        "uniqueid",
        "userfield",
        "clid",
        "channel",
        "dstchannel",
      ],
      order: [["start", "DESC"]],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: transfers.map((t) => ({
        id: t.id,
        start: t.start,
        answer: t.answer,
        end: t.end,
        duration: t.duration,
        billsec: t.billsec,
        disposition: t.disposition,
        src: t.src,
        dst: t.dst,
        uniqueid: t.uniqueid,
        userfield: t.userfield,
        clid: t.clid,
        channel: t.channel,
        dstchannel: t.dstchannel,
      })),
    });
  } catch (error) {
    console.error("Error getting transfer history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transfer history",
      error: error.message,
    });
  }
};

/**
 * Get transfer analytics for a specific agent
 */
export const getAgentTransferAnalytics = async (req, res) => {
  try {
    const { extension, startDate, endDate } = req.params;

    let whereClause = {
      [Op.or]: [{ src: extension }, { dst: extension }],
    };

    if (startDate && endDate) {
      whereClause.start = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate),
      };
    }

    // Look for transfer-related calls
    whereClause[Op.or] = [
      ...whereClause[Op.or],
      { disposition: "TRANSFER" },
      { disposition: "FORWARD" },
      { disposition: "REDIRECT" },
      { userfield: { [Op.like]: "%transfer%" } },
      { userfield: { [Op.like]: "%forward%" } },
    ];

    const transfers = await CDR.findAll({
      where: whereClause,
      attributes: [
        "id",
        "start",
        "duration",
        "billsec",
        "disposition",
        "src",
        "dst",
        "userfield",
      ],
      order: [["start", "DESC"]],
    });

    // Calculate analytics
    const analytics = {
      totalTransfers: transfers.length,
      transfersOut: transfers.filter((t) => t.src === extension).length,
      transfersIn: transfers.filter((t) => t.dst === extension).length,
      successfulTransfers: transfers.filter((t) => t.disposition === "ANSWERED")
        .length,
      failedTransfers: transfers.filter((t) => t.disposition === "NO ANSWER")
        .length,
      averageTransferDuration: 0,
      mostFrequentTargets: {},
      mostFrequentSources: {},
    };

    if (transfers.length > 0) {
      const totalDuration = transfers.reduce(
        (sum, t) => sum + (t.billsec || 0),
        0
      );
      analytics.averageTransferDuration = Math.round(
        totalDuration / transfers.length
      );

      // Calculate most frequent targets and sources
      transfers.forEach((transfer) => {
        if (transfer.src === extension) {
          const target = transfer.dst;
          if (!analytics.mostFrequentTargets[target])
            analytics.mostFrequentTargets[target] = 0;
          analytics.mostFrequentTargets[target]++;
        }

        if (transfer.dst === extension) {
          const source = transfer.src;
          if (!analytics.mostFrequentSources[source])
            analytics.mostFrequentSources[source] = 0;
          analytics.mostFrequentSources[source]++;
        }
      });
    }

    res.json({
      success: true,
      data: {
        analytics,
        transfers: transfers.map((t) => ({
          id: t.id,
          start: t.start,
          duration: t.duration,
          billsec: t.billsec,
          disposition: t.disposition,
          src: t.src,
          dst: t.dst,
          userfield: t.userfield,
          direction: t.src === extension ? "outbound" : "inbound",
        })),
      },
    });
  } catch (error) {
    console.error("Error getting agent transfer analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get agent transfer analytics",
      error: error.message,
    });
  }
};

/**
 * Get real-time transfer status
 */
export const getTransferStatus = async (req, res) => {
  try {
    const activeCalls = callMonitoringService.getActiveCalls();
    const activeAgents = await callMonitoringService.getActiveAgents();

    // Find calls that might be in transfer state
    const transferCalls = activeCalls.filter(
      (call) =>
        call.status === "transferring" ||
        call.userfield?.includes("transfer") ||
        call.dcontext === "transfer"
    );

    res.json({
      success: true,
      data: {
        activeTransfers: transferCalls.length,
        transferCalls: transferCalls.map((call) => ({
          uniqueid: call.uniqueid,
          src: call.src,
          dst: call.dst,
          status: call.status,
          startTime: call.startTime,
          duration: call.duration,
        })),
        availableAgents: activeAgents.filter(
          (agent) =>
            agent.status === "Available" || agent.status === "Registered"
        ).length,
        totalAgents: activeAgents.length,
      },
    });
  } catch (error) {
    console.error("Error getting transfer status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transfer status",
      error: error.message,
    });
  }
};

/**
 * Execute AMI-based call transfer
 */
export const executeTransfer = async (req, res) => {
  try {
    const {
      extension, // The extension making the transfer
      targetExtension, // The extension to transfer to
      transferType = "blind", // blind or attended
      callId, // Optional: specific call ID to transfer
    } = req.body;

    if (!extension || !targetExtension) {
      return res.status(400).json({
        success: false,
        message: "Extension and target extension are required",
      });
    }

    // Optional: dialplan capability check (Dial options must include t/T)
    let dialplanAllowsTransfer = false;
    try {
      const anyDial = await VoiceExtension.findOne({
        where: {
          app: "Dial",
        },
      });
      if (anyDial && typeof anyDial.appdata === "string") {
        dialplanAllowsTransfer = /[,)]t|[,)]T/.test(anyDial.appdata);
      }
    } catch (e) {
      // Non-fatal; proceed without blocking
      logger.logDebug("Dialplan check failed", e?.message || e);
    }

    // Get the channel for the extension
    logger.logTransferAttempt(extension, targetExtension, transferType);
    const channelInfo = await amiService.getChannelForExtension(extension);

    logger.logDebug(
      `Channel info received for extension ${extension}`,
      channelInfo
    );

    if (!channelInfo) {
      logger.logError(`No channel info returned for extension ${extension}`);
      return res.status(404).json({
        success: false,
        message: `No active call found for extension ${extension}`,
      });
    }

    logger.logTransfer(
      `Executing ${transferType} transfer from ${extension} to ${targetExtension}`,
      channelInfo
    );

    // For attended transfers, delegate to enhanced managed controller
    if (transferType === "attended") {
      // Reuse enhanced managed flow which handles consultation + bridging
      const managedReq = {
        ...req,
        body: {
          originalChannel: channelInfo.channel,
          targetExtension,
          context: "from-internal",
        },
      };
      return enhancedManagedTransfer(managedReq, res);
    }

    // Blind transfer via AMI Redirect for deterministic behavior
    const result = await amiService.executeAMIAction({
      Action: "Redirect",
      Channel: channelInfo.channel,
      Context: "from-internal",
      Exten: targetExtension,
      Priority: 1,
    });

    // Log the transfer result
    logger.logTransferResult(
      true,
      extension,
      targetExtension,
      transferType,
      result
    );

    // Log the transfer in CDR notes
    if (result && (result.success || result.Response === "Success")) {
      // Update CDR with transfer information
      const uniqueId = channelInfo.uniqueId || callId;
      if (uniqueId) {
        await CDR.update(
          {
            userfield: `Transfer to ${targetExtension} (${transferType})`,
            disposition: "TRANSFER",
          },
          {
            where: { uniqueid: uniqueId },
          }
        ).catch((err) => logger.logError("Failed to update CDR", err));
      }
    }

    res.json({
      success: true,
      data: {
        response: result,
        channel: channelInfo.channel,
        extension,
        targetExtension,
        transferType,
        dialplanAllowsTransfer,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError("Error executing transfer", error);
    res.status(500).json({
      success: false,
      message: "Failed to execute transfer",
      error: error.message,
    });
  }
};

/**
 * Get available agents for transfer
 */
export const getAvailableAgentsForTransfer = async (req, res) => {
  try {
    const { currentExtension } = req.query;

    // Use the new AMI service that gets real-time data from ps_contacts table
    const allExtensionStatuses = await amiService.getAllExtensionStatuses();

    // Get all users with extensions from database
    const users = await UserModel.findAll({
      where: {
        extension: {
          [Op.not]: null,
        },
      },
    });

    // Filter and map available agents
    const availableAgents = users
      .filter((user) => {
        // Exclude current extension
        if (user.extension === currentExtension) return false;

        // Get AMI status for this extension - handle both array and object formats
        let amiStatus = null;
        if (Array.isArray(allExtensionStatuses)) {
          amiStatus = allExtensionStatuses.find(
            (agent) => agent.extension === user.extension
          );
        } else if (
          allExtensionStatuses &&
          typeof allExtensionStatuses === "object"
        ) {
          amiStatus = allExtensionStatuses[user.extension];
        }

        if (!amiStatus) return false;

        // Only show agents that are registered and available
        return (
          amiStatus.isRegistered &&
          (amiStatus.status === "Available" ||
            amiStatus.status === "Registered")
        );
      })
      .map((user) => {
        // Get AMI status for this extension - handle both array and object formats
        let amiStatus = null;
        if (Array.isArray(allExtensionStatuses)) {
          amiStatus = allExtensionStatuses.find(
            (agent) => agent.extension === user.extension
          );
        } else if (
          allExtensionStatuses &&
          typeof allExtensionStatuses === "object"
        ) {
          amiStatus = allExtensionStatuses[user.extension];
        }

        return {
          extension: user.extension,
          name:
            user.displayName ||
            user.fullName ||
            user.name ||
            user.username ||
            `Agent ${user.extension}`,
          status: amiStatus.status,
          activeCallCount: 0, // Will be calculated separately if needed
          lastSeen: amiStatus.lastSeen,
          contactUri: amiStatus.contactUri,
          // Add debugging info
          amiStatus: amiStatus.rawStatus,
          expirationTime: amiStatus.expirationTime,
        };
      });

    res.json({
      success: true,
      data: availableAgents,
      timestamp: new Date().toISOString(),
      source: "ps_contacts_table_via_ami",
    });
  } catch (error) {
    console.error("Error getting available agents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get available agents",
      error: error.message,
    });
  }
};

// Debug endpoint to check active channels
export const debugActiveChannels = async (req, res) => {
  try {
    console.log("Debug: Checking active channels...");

    // Get active channels from AMI
    const response = await amiService.executeAMIAction({
      Action: "CoreShowChannels",
    });

    console.log("Debug: CoreShowChannels response:", response);

    res.json({
      success: true,
      message: "Check server console for channel details",
      response: response,
    });
  } catch (error) {
    console.error("Debug: Error checking channels:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check channels",
      error: error.message,
    });
  }
};
