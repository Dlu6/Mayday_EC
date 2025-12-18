import sequelize, { Op } from "../config/sequelize.js";
import CDR from "../models/cdr.js";

// Define CDR model if not already imported

/**
 * Get call history records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCallHistory = async (req, res) => {
  try {
    const { extension, limit, debug } = req.query;
    console.log("Extension being used for query:", extension);

    // Build query conditions
    const whereConditions = {
      [Op.or]: [
        { src: extension },
        { dst: extension },
        { channel: { [Op.like]: `PJSIP/${extension}-%` } }, // Match calls where the extension is in the channel
      ],
    };

    // Get call records
    const callRecords = await CDR.findAll({
      where: whereConditions,
      limit: parseInt(limit) || 50,
      order: [["start", "DESC"]], // Newest first
    });

    // If debug mode, return raw CDR data to help diagnose issues
    if (debug === 'true') {
      const rawRecords = callRecords.map(record => ({
        id: record.id,
        clid: record.clid,
        src: record.src,
        dst: record.dst,
        dcontext: record.dcontext,
        channel: record.channel,
        dstchannel: record.dstchannel,
        lastapp: record.lastapp,
        lastdata: record.lastdata,
        disposition: record.disposition,
        billsec: record.billsec,
        userfield: record.userfield,
        start: record.start,
      }));
      
      return res.status(200).json({
        success: true,
        debug: true,
        message: "Raw CDR data for debugging",
        data: { records: rawRecords },
      });
    }

    // Format the records for the client
    const formattedRecords = callRecords.map((record) =>
      formatCdrRecord(record, extension)
    );

    res.status(200).json({
      success: true,
      data: {
        total: callRecords.length,
        records: formattedRecords,
      },
    });
  } catch (error) {
    console.error("Error fetching call history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call history",
      error: error.message,
    });
  }
};

/**
 * Format a CDR record for client consumption
 * @param {Object} record - CDR record from database
 * @param {String} extension - User extension for determining call direction
 * @returns {Object} Formatted call record
 */
export const formatCdrRecord = (record, extension) => {
  // Calculate duration in minutes:seconds format
  let durationFormatted = null;
  if (record.billsec > 0) {
    const minutes = Math.floor(record.billsec / 60);
    const seconds = record.billsec % 60;
    durationFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // Extract extension from channel if needed
  const channelExtension =
    record.channel && record.channel.startsWith("PJSIP/")
      ? record.channel.split("-")[0].replace("PJSIP/", "")
      : null;

  // Extract phone number from clid field (format: "Name" <number> or just <number> or number)
  const extractPhoneFromClid = (clid) => {
    if (!clid) return null;
    // Try to extract number from <number> format
    const angleMatch = clid.match(/<([^>]+)>/);
    if (angleMatch) return angleMatch[1];
    // Try to extract number after quotes (e.g., "Name" 1234567)
    const afterQuotesMatch = clid.match(/"[^"]*"\s*(\S+)/);
    if (afterQuotesMatch) return afterQuotesMatch[1];
    // If no special format, return the clid itself if it looks like a number
    const cleanClid = clid.replace(/["\s]/g, '');
    if (/^\+?[\d-]+$/.test(cleanClid)) return cleanClid;
    return null;
  };

  // Determine call type
  // Priority 1: Use the type field from database if available (set by callMonitoringService)
  // Priority 2: Fallback to channel-based detection
  let type = record.type; // Use database value if present
  
  if (!type) {
    // Fallback: determine from channel and context
    const srcMatchesExtension = record.src === extension;
    const dstMatchesExtension = record.dst === extension;
    const channelMatchesExtension = record.channel && record.channel.startsWith(`PJSIP/${extension}-`);
    
    // Determine if outbound:
    // - Channel starts with PJSIP/{extension} (agent's channel initiated the call), OR
    // - src matches extension AND dst doesn't (agent called someone else)
    const isOutbound = channelMatchesExtension || (srcMatchesExtension && !dstMatchesExtension);
    type = isOutbound ? "outbound" : "inbound";
  }

  let status = "completed";
  if (record.disposition === "NO ANSWER") {
    status = "missed";
  } else if (record.disposition === "FAILED" || record.disposition === "BUSY") {
    status = "failed";
  } else if (record.disposition === "NORMAL" && record.billsec === 0) {
    // NORMAL disposition but zero billsec likely means a failed or missed call
    status = "missed";
  }

  // Get phone number based on call direction
  // For inbound: we want the caller's number (from clid or src)
  // For outbound: we want the destination number (dst)
  let phoneNumber;
  
  if (type === "outbound") {
    phoneNumber = record.dst;
  } else {
    // For inbound calls, the caller's number could be in multiple places:
    // 1. userfield - we store ConnectedLineNum here for inbound calls to extensions
    // 2. clid - standard caller ID field
    // 3. src - source field (but might contain DID for extension CDRs)
    
    // First check userfield which may have ConnectedLineNum (the actual external caller)
    if (record.userfield && record.userfield.length >= 7 && /^\d+$/.test(record.userfield)) {
      phoneNumber = record.userfield;
    } else {
      const callerFromClid = extractPhoneFromClid(record.clid);
      phoneNumber = callerFromClid || record.src;
    }
  }
  
  // Helper function to check if a value is a placeholder pattern
  const isPlaceholderValue = (value) => {
    if (!value || value === 's' || value === '') return true;
    // Match Asterisk dialplan patterns like _X., _X!, _., _XXXX, etc.
    if (/^_[X.!Z\[\]0-9-]+\.?$/.test(value)) return true;
    // Also match if it's just underscores, X's, dots, or exclamation marks
    if (/^[_X.!]+$/.test(value)) return true;
    return false;
  };
  
  // Check if phoneNumber is a placeholder pattern
  let isPlaceholder = isPlaceholderValue(phoneNumber);
  
  if (isPlaceholder) {
    // For inbound calls, try multiple sources to find the caller's number
    if (type !== "outbound") {
      // Try clid first
      if (record.clid) {
        const clidNumber = extractPhoneFromClid(record.clid);
        if (clidNumber && !isPlaceholderValue(clidNumber)) {
          phoneNumber = clidNumber;
          isPlaceholder = false;
        }
      }
      
      // Try channel field - for inbound, channel might be like PJSIP/trunk-0x... or contain caller info
      if (isPlaceholder && record.channel) {
        // Extract caller number from channel patterns like PJSIP/256700123456-xxx
        const channelCallerMatch = record.channel.match(/PJSIP\/(\d{9,})-/);
        if (channelCallerMatch && !isPlaceholderValue(channelCallerMatch[1])) {
          phoneNumber = channelCallerMatch[1];
          isPlaceholder = false;
        }
      }
      
      // Try src if it looks like a real phone number (not a short extension or DID)
      if (isPlaceholder && record.src && record.src.length >= 9 && /^\+?\d+$/.test(record.src)) {
        phoneNumber = record.src;
        isPlaceholder = false;
      }
    }
    
    // For outbound calls with placeholder dst, try multiple sources
    if (type === "outbound") {
      // Try dstchannel first - extract number from channel like PJSIP/256700123456-00000001 or SIP/trunk/256700123456
      if (record.dstchannel) {
        // Try various patterns: PJSIP/number, SIP/trunk/number, or just extract any 7+ digit sequence
        const dstMatch = record.dstchannel.match(/(?:PJSIP|SIP)\/(?:[^\/]+\/)?(\d{7,})/) ||
                         record.dstchannel.match(/\/(\d{7,})/);
        if (dstMatch && !isPlaceholderValue(dstMatch[1])) {
          phoneNumber = dstMatch[1];
          isPlaceholder = false;
        }
      }
      
      // Try lastdata which often contains the dialed number in various formats
      if (isPlaceholder && record.lastdata) {
        // lastdata might be like "PJSIP/256700123456", "SIP/trunk/256700123456", "Dial(PJSIP/number)", or just the number
        const lastDataMatch = record.lastdata.match(/(?:PJSIP|SIP)\/(?:[^\/]+\/)?(\d{7,})/) || 
                              record.lastdata.match(/\/(\d{7,})/) ||
                              record.lastdata.match(/(\d{7,})/);
        if (lastDataMatch && !isPlaceholderValue(lastDataMatch[1])) {
          phoneNumber = lastDataMatch[1];
          isPlaceholder = false;
        }
      }
      
      // Try clid for outbound calls too - sometimes the dialed number is stored there
      if (isPlaceholder && record.clid) {
        const clidNumber = extractPhoneFromClid(record.clid);
        if (clidNumber && !isPlaceholderValue(clidNumber) && clidNumber.length >= 7) {
          phoneNumber = clidNumber;
          isPlaceholder = false;
        }
      }
    }
    
    // Try extracting from channel field as last resort for both inbound and outbound
    if (isPlaceholder && record.channel) {
      const channelMatch = record.channel.match(/(?:PJSIP|SIP)\/(\d{7,})/);
      if (channelMatch && !isPlaceholderValue(channelMatch[1])) {
        phoneNumber = channelMatch[1];
        isPlaceholder = false;
      }
    }
    
    // Final fallback: check userfield which sometimes contains call metadata
    if (isPlaceholder && record.userfield) {
      const userfieldMatch = record.userfield.match(/(\d{7,})/);
      if (userfieldMatch && !isPlaceholderValue(userfieldMatch[1])) {
        phoneNumber = userfieldMatch[1];
        isPlaceholder = false;
      }
    }
  }

  return {
    id: record.id || record.uniqueid,
    phoneNumber: phoneNumber || 'Unknown',
    name: null, // We don't have name information in CDR
    type,
    status,
    duration: durationFormatted,
    timestamp: record.start || record.calldate || new Date(),
    billsec: record.billsec, // Include billsec for frontend display logic
  };
};

/**
 * Get recent call history for a specific extension
 * @param {String} extension - User extension
 * @param {Number} limit - Maximum number of records to return
 * @returns {Array} Array of formatted call records
 */
export const getRecentCallHistory = async (extension, limit = 10) => {
  try {
    const whereConditions = {
      [Op.or]: [{ src: extension }, { dst: extension }],
    };

    const callRecords = await CDR.findAll({
      where: whereConditions,
      limit: parseInt(limit),
      order: [["start", "DESC"]],
    });

    return callRecords.map((record) => formatCdrRecord(record, extension));
  } catch (error) {
    console.error("Error fetching recent call history:", error);
    return [];
  }
};

// New endpoint to get call counts by extension
export const getCallCountsByExtension = async (req, res) => {
  // console.log(
  //   "Hit the getCallCountsByExtension controller 🐝🐝🐝🐝🐝🐝🐝",
  //   req.query
  // );
  try {
    const { extension, startDate, endDate } = req.query;

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension parameter is required",
      });
    }

    // Build query conditions
    const whereConditions = {
      [Op.or]: [
        { src: extension },
        { dst: extension },
        { channel: { [Op.like]: `PJSIP/${extension}-%` } },
      ],
    };

    // Add date range if provided
    if (startDate || endDate) {
      whereConditions.start = {};

      if (startDate) {
        // Parse the date and set to midnight
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        whereConditions.start[Op.gte] = startDateTime;
      }

      if (endDate) {
        // Parse the date and set to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereConditions.start[Op.lte] = endDateTime;
      }
    } else {
      // If no date range provided, default to today (from midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      whereConditions.start = {
        [Op.gte]: today,
      };

      // console.log(
      //   "Using default date range (today from midnight):",
      //   today.toISOString()
      // );
    }

    // Log the final query conditions for debugging
    // console.log(
    //   "Query conditions for call counts:",
    //   JSON.stringify(whereConditions, null, 2)
    // );

    // Get total calls (count unique call IDs to avoid duplicates from multiple CDR legs)
    const totalCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: whereConditions,
    });

    // Get answered calls using disposition (consistent with global stats)
    // Answered: disposition is not "NO ANSWER"
    const answeredCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        ...whereConditions,
        disposition: { [Op.ne]: "NO ANSWER" },
      },
    });

    // Get missed calls using disposition (consistent with global stats)
    // Missed: disposition is "NO ANSWER"
    const missedCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        ...whereConditions,
        disposition: "NO ANSWER",
      },
    });

    // Get outbound calls
    const outboundCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        ...whereConditions,
        src: extension,
      },
    });

    // Get inbound calls
    const inboundCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        ...whereConditions,
        [Op.not]: { src: extension },
      },
    });

    // Calculate average call duration for answered calls
    const callDurationResult = await CDR.findOne({
      attributes: [
        [sequelize.fn("AVG", sequelize.col("billsec")), "avgDuration"],
      ],
      where: {
        ...whereConditions,
        billsec: { [Op.gt]: 0 },
      },
      raw: true,
    });

    const avgCallDuration = callDurationResult?.avgDuration
      ? Math.round(callDurationResult.avgDuration)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        extension,
        totalCalls,
        answeredCalls,
        missedCalls,
        outboundCalls,
        inboundCalls,
        avgCallDuration,
      },
    });
  } catch (error) {
    console.error("Error fetching call counts by extension:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call counts",
      error: error.message,
    });
  }
};

export default {
  getCallHistory,
  getRecentCallHistory,
  formatCdrRecord,
  getCallCountsByExtension,
};
