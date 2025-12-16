import amiService from "../services/amiService.js";
import logger from "../utils/logger.js";

// Originate a call from an agent extension to a destination (extension/number)
export const originateCall = async (req, res) => {
  try {
    const {
      fromExtension,
      to,
      context = "from-internal",
      priority = 1,
      callerId,
    } = req.body || {};

    if (!fromExtension || !to) {
      return res.status(400).json({
        success: false,
        message: "fromExtension and to are required",
      });
    }

    // Build AMI Originate action: call out from agent's device into dialplan target
    const action = {
      Action: "Originate",
      Channel: `PJSIP/${fromExtension}`,
      Context: context,
      Exten: String(to),
      Priority: Number(priority) || 1,
      CallerID: callerId || `${fromExtension}`,
      Async: true,
    };

    logger.info(
      `Originating call via AMI from ${fromExtension} to ${to} in ${context}`
    );

    const result = await amiService.executeAMIAction(action);

    if (result?.Response !== "Success") {
      return res.status(502).json({
        success: false,
        message: result?.Message || "AMI originate failed",
        data: result,
      });
    }

    return res.json({
      success: true,
      message: "Call originate initiated",
      data: result,
    });
  } catch (error) {
    logger.logError("AMI originate error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to originate call",
      error: error.message,
    });
  }
};

// Hangup current active channel for an agent (by extension) or by explicit channel name
export const hangupCall = async (req, res) => {
  try {
    const { extension, channel } = req.body || {};

    let targetChannel = channel;
    if (!targetChannel) {
      if (!extension) {
        return res.status(400).json({
          success: false,
          message: "extension or channel is required",
        });
      }

      const chInfo = await amiService.getChannelForExtension(extension);
      targetChannel = chInfo?.channel;
    }

    if (!targetChannel) {
      return res.status(404).json({
        success: false,
        message: "Active channel not found for hangup",
      });
    }

    const action = {
      Action: "Hangup",
      Channel: targetChannel,
    };

    logger.info(`Hanging up channel via AMI: ${targetChannel}`);
    const result = await amiService.executeAMIAction(action);

    if (result?.Response !== "Success") {
      return res.status(502).json({
        success: false,
        message: result?.Message || "AMI hangup failed",
        data: result,
      });
    }

    return res.json({
      success: true,
      message: "Hangup initiated",
      data: result,
    });
  } catch (error) {
    logger.logError("AMI hangup error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to hangup call",
      error: error.message,
    });
  }
};

export default {
  originateCall,
  hangupCall,
};
