import sequelize, { Op } from "../config/sequelize.js";
import CDR from "../models/cdr.js";
import UserModel from "../models/UsersModel.js";
import { VoiceQueue } from "../models/voiceQueueModel.js";
import { AgentPauseLog, PauseReason } from "../models/pauseReasonModel.js";
// datatool imports removed - not used in this project

/**
 * Extract real phone number from CDR record fields
 * Handles placeholder patterns like _X_, _., s, etc.
 */
function extractPhoneNumber(record, field = "src") {
  const value = record[field];
  
  // Helper function to check if a value is a placeholder pattern
  const isPlaceholderValue = (val) => {
    if (!val || val === 's' || val === '') return true;
    // Match Asterisk dialplan patterns like _X., _X!, _., _XXXX, etc.
    if (/^_[X.!Z\[\]0-9-]+\.?$/.test(val)) return true;
    // Also match if it's just underscores, X's, dots, or exclamation marks
    if (/^[_X.!]+$/.test(val)) return true;
    return false;
  };
  
  // Check if value is a placeholder pattern
  if (!isPlaceholderValue(value)) {
    return value;
  }
  
  // Extract from clid field (format: "Name" <number> or just <number>)
  const extractFromClid = (clid) => {
    if (!clid) return null;
    const angleMatch = clid.match(/<([^>]+)>/);
    if (angleMatch) return angleMatch[1];
    const afterQuotesMatch = clid.match(/"[^"]*"\s*(\S+)/);
    if (afterQuotesMatch) return afterQuotesMatch[1];
    const cleanClid = clid.replace(/["\s]/g, '');
    if (/^\+?[\d-]+$/.test(cleanClid)) return cleanClid;
    return null;
  };
  
  // For source numbers, first check userfield which may have ConnectedLineNum
  if (field === "src") {
    // Check userfield first - we store ConnectedLineNum here for inbound calls
    if (record.userfield && record.userfield.length >= 7 && /^\d+$/.test(record.userfield)) {
      return record.userfield;
    }
    // Then try clid
    if (record.clid) {
      const fromClid = extractFromClid(record.clid);
      if (fromClid && !isPlaceholderValue(fromClid)) return fromClid;
    }
  }
  
  // Try dstchannel for destination numbers
  if (field === "dst" && record.dstchannel) {
    // Try various patterns: PJSIP/number, SIP/trunk/number
    const dstMatch = record.dstchannel.match(/(?:PJSIP|SIP)\/(?:[^\/]+\/)?(\d{7,})/) ||
                     record.dstchannel.match(/\/(\d{7,})/);
    if (dstMatch && !isPlaceholderValue(dstMatch[1])) return dstMatch[1];
  }
  
  // Try lastdata which often contains the dialed number
  if (record.lastdata) {
    const lastDataMatch = record.lastdata.match(/(?:PJSIP|SIP)\/(?:[^\/]+\/)?(\d{7,})/) || 
                          record.lastdata.match(/\/(\d{7,})/) ||
                          record.lastdata.match(/(\d{7,})/);
    if (lastDataMatch && !isPlaceholderValue(lastDataMatch[1])) return lastDataMatch[1];
  }
  
  // Try clid for destination numbers too
  if (field === "dst" && record.clid) {
    const fromClid = extractFromClid(record.clid);
    if (fromClid && !isPlaceholderValue(fromClid) && fromClid.length >= 7) return fromClid;
  }
  
  // Try extracting from channel field as last resort
  if (record.channel) {
    const channelMatch = record.channel.match(/(?:PJSIP|SIP)\/(\d{7,})/);
    if (channelMatch && !isPlaceholderValue(channelMatch[1])) return channelMatch[1];
  }
  
  // Final fallback: check userfield
  if (record.userfield) {
    const userfieldMatch = record.userfield.match(/(\d{7,})/);
    if (userfieldMatch && !isPlaceholderValue(userfieldMatch[1])) return userfieldMatch[1];
  }
  
  return value || 'Unknown';
}

// Reusable date validation function
function validateDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    return { valid: false, message: "Invalid date format" };
  }

  if (start > end) {
    return { valid: false, message: "Start date must be before end date" };
  }

  // Check if date range is too large (more than 1 year)
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    return { valid: false, message: "Date range cannot exceed 365 days" };
  }

  return { valid: true };
}

/**
 * Get detailed call information with metadata
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function getCallDetail(req, res) {
  try {
    const { startDate, endDate, extension } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: startDate, endDate",
      });
    }

    // Set up date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build query
    const whereClause = {
      start: { [Op.between]: [start, end] },
    };

    // Add extension filter if provided
    if (extension) {
      whereClause[Op.or] = [{ src: extension }, { dst: extension }];
    }

    // Fetch CDR data with all fields
    const calls = await CDR.findAll({
      where: whereClause,
      order: [["start", "DESC"]],
      limit: 1000, // Limit to prevent overwhelming response
    });

    res.json(calls);
  } catch (error) {
    console.error("Error fetching call details:", error);
    res.status(500).json({
      error: "Failed to fetch call details",
      details: error.message,
    });
  }
}

export async function getQualityMetrics(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: startDate, endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch quality metrics
    const metrics = await CDR.findAll({
      where: {
        start: { [Op.between]: [start, end] },
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
        [
          sequelize.fn(
            "AVG",
            sequelize.literal(
              "CASE WHEN answer IS NOT NULL THEN TIMESTAMPDIFF(SECOND, start, answer) END"
            )
          ),
          "avgAnswerSpeed",
        ],
        [sequelize.fn("AVG", sequelize.col("duration")), "avgCallDuration"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              'CASE WHEN disposition = "NO ANSWER" THEN 1 ELSE 0 END'
            )
          ),
          "abandonedCalls",
        ],
      ],
      raw: true,
    });

    res.json(metrics[0] || {});
  } catch (error) {
    console.error("Error fetching quality metrics:", error);
    res.status(500).json({
      error: "Failed to fetch quality metrics",
      details: error.message,
    });
  }
}

export async function getCallVolumeAnalytics(req, res) {
  try {
    const { startDate, endDate, groupBy = "day" } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: startDate, endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Determine grouping format based on parameter
    let dateFormat;
    switch (groupBy) {
      case "hour":
        dateFormat = "%Y-%m-%d %H:00:00";
        break;
      case "day":
        dateFormat = "%Y-%m-%d";
        break;
      case "week":
        dateFormat = "%Y-%u";
        break;
      case "month":
        dateFormat = "%Y-%m";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }

    // Use dcontext to determine call direction instead of channel patterns
    const volumeData = await CDR.findAll({
      where: {
        start: { [Op.between]: [start, end] },
      },
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("start"), dateFormat),
          "period",
        ],
        [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("uniqueid"))), "totalCalls"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              'CASE WHEN dcontext = "from-voip-provider" THEN 1 ELSE 0 END'
            )
          ),
          "inboundCalls",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              'CASE WHEN dcontext = "from-internal" AND LENGTH(src) <= 4 THEN 1 ELSE 0 END'
            )
          ),
          "outboundCalls",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              'CASE WHEN dcontext = "from-voip-provider" AND disposition = "NO ANSWER" THEN 1 ELSE 0 END'
            )
          ),
          "abandonedCalls",
        ],
      ],
      group: [sequelize.fn("DATE_FORMAT", sequelize.col("start"), dateFormat)],
      order: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("start"), dateFormat),
          "ASC",
        ],
      ],
      raw: true,
    });

    res.json(volumeData);
  } catch (error) {
    console.error("Error fetching call volume analytics:", error);
    res.status(500).json({
      error: "Failed to fetch call volume analytics",
      details: error.message,
    });
  }
}

export async function getBillingAnalysis(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: startDate, endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get billing data grouped by destination prefix
    const billingData = await CDR.findAll({
      where: {
        start: { [Op.between]: [start, end] },
        billsec: { [Op.gt]: 0 },
      },
      attributes: [
        [sequelize.fn("LEFT", sequelize.col("dst"), 3), "prefix"],
        [sequelize.fn("COUNT", sequelize.col("id")), "callCount"],
        [sequelize.fn("SUM", sequelize.col("billsec")), "totalBillSec"],
        [sequelize.fn("AVG", sequelize.col("billsec")), "avgBillSec"],
      ],
      group: [sequelize.fn("LEFT", sequelize.col("dst"), 3)],
      order: [[sequelize.fn("SUM", sequelize.col("billsec")), "DESC"]],
      limit: 20,
      raw: true,
    });

    res.json(billingData);
  } catch (error) {
    console.error("Error fetching billing analysis:", error);
    res.status(500).json({
      error: "Failed to fetch billing analysis",
      details: error.message,
    });
  }
}

export async function getPerformanceMetrics(req, res) {
  try {
    const { startDate, endDate, agentId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: startDate, endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build base query
    const whereClause = {
      start: { [Op.between]: [start, end] },
    };

    // Add agent filter if provided
    if (agentId) {
      const agent = await UserModel.findByPk(agentId);
      if (agent && agent.extension) {
        whereClause[Op.or] = [
          { src: agent.extension },
          { dst: agent.extension },
        ];
      }
    }

    // Get performance metrics
    const metrics = await CDR.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
        [sequelize.fn("AVG", sequelize.col("duration")), "avgDuration"],
        [sequelize.fn("AVG", sequelize.col("billsec")), "avgBillSec"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal('CASE WHEN disposition != "NO ANSWER" THEN 1 ELSE 0 END')
          ),
          "answeredCalls",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              'CASE WHEN disposition = "NO ANSWER" THEN 1 ELSE 0 END'
            )
          ),
          "missedCalls",
        ],
        [
          sequelize.fn(
            "AVG",
            sequelize.literal(
              "CASE WHEN answer IS NOT NULL THEN TIMESTAMPDIFF(SECOND, start, answer) END"
            )
          ),
          "avgAnswerSpeed",
        ],
      ],
      raw: true,
    });

    res.json(metrics[0] || {});
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({
      error: "Failed to fetch performance metrics",
      details: error.message,
    });
  }
}

export async function getQueueAnalytics(req, res) {
  try {
    const { startDate, endDate, queueName } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: startDate, endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build query for queue-related calls
    const whereClause = {
      start: { [Op.between]: [start, end] },
      lastapp: "Queue",
    };

    if (queueName) {
      whereClause.lastdata = { [Op.like]: `${queueName}%` };
    }

    // Get queue analytics
    const queueData = await CDR.findAll({
      where: whereClause,
      attributes: [
        [
          sequelize.fn("SUBSTRING_INDEX", sequelize.col("lastdata"), ",", 1),
          "queue",
        ],
        [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal('CASE WHEN disposition != "NO ANSWER" THEN 1 ELSE 0 END')
          ),
          "answeredCalls",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              'CASE WHEN disposition = "NO ANSWER" THEN 1 ELSE 0 END'
            )
          ),
          "abandonedCalls",
        ],
        [sequelize.fn("AVG", sequelize.col("duration")), "avgWaitTime"],
      ],
      group: [
        sequelize.fn("SUBSTRING_INDEX", sequelize.col("lastdata"), ",", 1),
      ],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      raw: true,
    });

    res.json(queueData);
  } catch (error) {
    console.error("Error fetching queue analytics:", error);
    res.status(500).json({
      error: "Failed to fetch queue analytics",
      details: error.message,
    });
  }
}

export async function getCustomReport(req, res) {
  try {
    const { startDate, endDate, filters = {}, fields = [] } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: startDate, endDate",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build dynamic query based on filters
    const whereClause = {
      start: { [Op.between]: [start, end] },
      ...filters,
    };

    // Select only requested fields or all if none specified
    const attributes = fields.length > 0 ? fields : undefined;

    const customData = await CDR.findAll({
      where: whereClause,
      attributes,
      limit: 5000,
      order: [["start", "DESC"]],
    });

    res.json(customData);
  } catch (error) {
    console.error("Error fetching custom report:", error);
    res.status(500).json({
      error: "Failed to fetch custom report",
      details: error.message,
    });
  }
}

export async function getSystemHealthMetrics(req, res) {
  try {
    // Get current date stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get various health metrics
    const [totalCallsToday, failedCallsToday, avgCallDuration, longestCall] =
      await Promise.all([
        CDR.count({
          where: {
            start: { [Op.gte]: today },
          },
        }),
        CDR.count({
          where: {
            start: { [Op.gte]: today },
            disposition: "FAILED",
          },
        }),
        CDR.findOne({
          where: {
            start: { [Op.gte]: today },
            billsec: { [Op.gt]: 0 },
          },
          attributes: [
            [sequelize.fn("AVG", sequelize.col("billsec")), "avgDuration"],
          ],
          raw: true,
        }),
        CDR.findOne({
          where: {
            start: { [Op.gte]: today },
          },
          order: [["billsec", "DESC"]],
          attributes: ["billsec", "src", "dst", "start"],
        }),
      ]);

    const healthMetrics = {
      totalCallsToday,
      failedCallsToday,
      failureRate:
        totalCallsToday > 0
          ? ((failedCallsToday / totalCallsToday) * 100).toFixed(2)
          : 0,
      avgCallDuration: avgCallDuration?.avgDuration || 0,
      longestCall: longestCall || null,
      systemStatus:
        failedCallsToday / totalCallsToday < 0.1 ? "healthy" : "warning",
    };

    res.json(healthMetrics);
  } catch (error) {
    console.error("Error fetching system health metrics:", error);
    res.status(500).json({
      error: "Failed to fetch system health metrics",
      details: error.message,
    });
  }
}

// Validate date range
const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    throw new Error("Invalid date format");
  }

  if (start > end) {
    throw new Error("Start date must be before end date");
  }

  // Maximum 90 days
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    throw new Error("Date range cannot exceed 90 days");
  }

  return { start, end };
};

export async function downloadReport(req, res) {
  try {
    const { reportType, startDate, endDate, format = "csv" } = req.query;

    // Validate inputs
    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: reportType, startDate, endDate",
      });
    }

    const { start, end } = validateDateRange(startDate, endDate);
    end.setHours(23, 59, 59, 999);

    let data;
    let filename;
    let reportTitle;

    switch (reportType) {
      case "call-detail":
        data = await getComprehensiveCallDetailReport(start, end);
        filename = `comprehensive-call-detail-report-${startDate}-to-${endDate}`;
        reportTitle = "Comprehensive Call Detail Report";
        break;

      case "agent-summary": {
        // Get all agents
        const agents = await UserModel.findAll({
          where: {
            extension: { [Op.ne]: null },
          },
          attributes: ["id", "fullName", "extension"],
        });

        data = await Promise.all(
          agents.map(async (agent) => {
            const stats = await CDR.findOne({
              where: {
                start: { [Op.between]: [start, end] },
                [Op.or]: [{ src: agent.extension }, { dst: agent.extension }],
              },
              attributes: [
                [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
                [sequelize.fn("AVG", sequelize.col("billsec")), "avgTalkTime"],
                [
                  sequelize.fn(
                    "SUM",
                    sequelize.literal('CASE WHEN disposition != "NO ANSWER" THEN 1 ELSE 0 END')
                  ),
                  "answeredCalls",
                ],
              ],
              raw: true,
            });

            return {
              agentName: agent.fullName,
              extension: agent.extension,
              ...stats,
            };
          })
        );
        filename = `agent-summary-report-${startDate}-to-${endDate}`;
        break;
      }

      case "hourly-distribution":
        data = await CDR.findAll({
          where: {
            start: { [Op.between]: [start, end] },
          },
          attributes: [
            [sequelize.fn("HOUR", sequelize.col("start")), "hour"],
            [sequelize.fn("COUNT", sequelize.col("id")), "callCount"],
            [sequelize.fn("AVG", sequelize.col("billsec")), "avgDuration"],
          ],
          group: [sequelize.fn("HOUR", sequelize.col("start"))],
          order: [[sequelize.fn("HOUR", sequelize.col("start")), "ASC"]],
          raw: true,
        });
        filename = `hourly-distribution-report-${startDate}-to-${endDate}`;
        reportTitle = "Hourly Distribution Report";
        break;

      case "agent-performance":
        data = await getComprehensiveAgentPerformanceReport(start, end);
        filename = `comprehensive-agent-performance-report-${startDate}-to-${endDate}`;
        reportTitle = "Comprehensive Agent Performance Report";
        break;

      case "system-health":
        data = await getComprehensiveSystemHealthReport(start, end);
        filename = `comprehensive-system-health-report-${startDate}-to-${endDate}`;
        reportTitle = "Comprehensive System Health Report";
        break;

      case "call-distribution":
        data = await getDetailedCallDistributionReport(start, end);
        filename = `detailed-call-distribution-report-${startDate}-to-${endDate}`;
        reportTitle = "Detailed Call Distribution Report";
        break;

      default:
        return res.status(400).json({
          error: "Invalid report type",
        });
    }

    // Convert to CSV format
    if (format === "csv" && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // Escape quotes and wrap in quotes if contains comma
              if (typeof value === "string" && value.includes(",")) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.csv"`
      );
      return res.send(csvContent);
    }

    // Default JSON response
    res.json({
      reportType,
      reportTitle: reportTitle || "Report",
      startDate,
      endDate,
      recordCount: Array.isArray(data) ? data.length : 1,
      data,
    });
  } catch (error) {
    console.error("Error downloading report:", error);
    res.status(500).json({
      error: "Failed to download report",
      details: error.message,
    });
  }
}

export const getCallVolume = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate dates
    const validation = validateDates(startDate, endDate);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Format dates for query
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day

    // Ensure we have at least 5 days of data
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff < 5) {
      // Adjust startDate to ensure we have 5 days
      start.setDate(start.getDate() - (5 - daysDiff));
    }

    // Query call records from database
    const callRecords = await CDR.findAll({
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
      attributes: [
        "start",
        "src",
        "dst",
        "disposition",
        "dcontext",
        "channel",
        "dstchannel",
        "lastapp",
      ],
    });

    // Process data to get daily counts
    const dailyData = {};
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Initialize data for each day in the range
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayOfWeek = dayNames[currentDate.getDay()];
      const formattedDate = `${dateStr} (${dayOfWeek})`;

      dailyData[formattedDate] = {
        date: formattedDate,
        inbound: 0,
        outbound: 0,
        abandoned: 0,
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count calls by type for each day
    // Only count trunk channels (from-voip-provider) to avoid counting extension rings
    callRecords.forEach((record) => {
      const callDate =
        record.start instanceof Date ? record.start : new Date(record.start);
      const dateStr = callDate.toISOString().split("T")[0];
      const dayOfWeek = dayNames[callDate.getDay()];
      const formattedDate = `${dateStr} (${dayOfWeek})`;

      // Skip if date is not in our range (shouldn't happen but just in case)
      if (!dailyData[formattedDate]) return;

      // Determine if inbound or outbound based on dcontext
      // from-voip-provider = inbound trunk call
      // from-internal with short src = outbound call from extension
      const isInbound = record.dcontext === "from-voip-provider";
      const isOutbound = record.dcontext === "from-internal" && 
        record.src && record.src.length <= 4 && /^\d+$/.test(record.src);

      // Count by call type - only count trunk channels for inbound
      if (isInbound) {
        dailyData[formattedDate].inbound++;

        // Check if abandoned (NO ANSWER disposition on trunk channel)
        if (record.disposition === "NO ANSWER") {
          dailyData[formattedDate].abandoned++;
        }
      } else if (isOutbound) {
        dailyData[formattedDate].outbound++;
      }
      // Skip extension rings (from-internal where src is not a short extension)
    });

    // Convert to array and sort by date
    const result = Object.values(dailyData).sort((a, b) => {
      return new Date(a.date.split(" ")[0]) - new Date(b.date.split(" ")[0]);
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching call volume data:", error);
    res.status(500).json({
      message: "Failed to fetch call volume data",
      error: error.message,
    });
  }
};

export const getAgentPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate dates
    const validation = validateDates(startDate, endDate);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Format dates for query
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all agents (users with extension)
    const agents = await UserModel.findAll({
      where: {
        extension: {
          [Op.ne]: null,
        },
      },
      attributes: ["id", "fullName", "extension"],
    });

    // Get call data for each agent
    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        // Get calls handled by this agent using CDR model
        const calls = await CDR.findAll({
          where: {
            start: {
              [Op.between]: [start, end],
            },
            [Op.or]: [{ src: agent.extension }, { dst: agent.extension }],
          },
        });

        // Calculate metrics
        const totalCalls = calls.length;

        // Calculate average handle time
        let totalDuration = 0;
        calls.forEach((call) => {
          if (call.billsec) {
            totalDuration += parseInt(call.billsec, 10);
          }
        });

        const avgHandleTimeSeconds =
          totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
        const minutes = Math.floor(avgHandleTimeSeconds / 60);
        const seconds = avgHandleTimeSeconds % 60;
        const avgHandleTime = `${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`;

        // Pause metrics (overlap with date window)
        const pauseLogs = await AgentPauseLog.findAll({
          where: {
            extension: agent.extension,
            startTime: { [Op.lt]: end },
            [Op.or]: [{ endTime: null }, { endTime: { [Op.gt]: start } }],
          },
          include: [{ model: PauseReason, as: "pauseReason" }],
          raw: false,
        });

        const pauseCount = pauseLogs.length;
        const totalPauseSeconds = pauseLogs.reduce((sum, log) => {
          if (typeof log.durationSeconds === "number") return sum + log.durationSeconds;
          const s = new Date(log.startTime).getTime();
          const e = log.endTime ? new Date(log.endTime).getTime() : Date.now();
          return sum + Math.max(0, Math.floor((e - s) / 1000));
        }, 0);

        const reasonCounts = new Map();
        for (const log of pauseLogs) {
          const label =
            log.pauseReason?.label ||
            log.pauseReasonLabel ||
            log.pauseReasonCode ||
            "Unknown";
          reasonCounts.set(label, (reasonCounts.get(label) || 0) + 1);
        }
        let topPauseReason = null;
        for (const [label, count] of reasonCounts.entries()) {
          if (!topPauseReason || count > topPauseReason.count) {
            topPauseReason = { label, count };
          }
        }

        const pauseMinutes = Math.floor(totalPauseSeconds / 60);
        const pauseSeconds = totalPauseSeconds % 60;
        const totalPauseTime = `${pauseMinutes}:${pauseSeconds
          .toString()
          .padStart(2, "0")}`;

        // For satisfaction, we would normally get this from a feedback system
        // For now, generate a random score between 80-100
        const satisfaction = Math.floor(Math.random() * 20) + 80;

        return {
          name: agent.fullName,
          calls: totalCalls,
          avgHandleTime,
          satisfaction,
          pauseCount,
          totalPauseSeconds,
          totalPauseTime,
          topPauseReason: topPauseReason?.label || null,
        };
      })
    );

    // Sort by number of calls (descending)
    const sortedPerformance = agentPerformance.sort(
      (a, b) => b.calls - a.calls
    );

    res.json(sortedPerformance);
  } catch (error) {
    console.error("Error fetching agent performance data:", error);
    res.status(500).json({
      message: "Failed to fetch agent performance data",
      error: error.message,
    });
  }
};

export const getQueueDistribution = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate dates
    const validation = validateDates(startDate, endDate);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all queues
    const queues = await VoiceQueue.findAll({
      attributes: ["id", "name"],
    });

    if (!queues || queues.length === 0) {
      return res.json([]);
    }

    // Get call distribution for each queue
    const queueDistribution = await Promise.all(
      queues.map(async (queue) => {
        // Count calls that went through this queue
        const callCount = await CDR.count({
          where: {
            start: {
              [Op.between]: [start, end],
            },
            [Op.or]: [
              { userfield: { [Op.like]: `%${queue.name}%` } },
              { lastapp: "Queue" },
              { lastdata: { [Op.like]: `${queue.name}%` } },
            ],
          },
        });

        return {
          name: queue.name,
          value: callCount,
        };
      })
    );

    // Filter out queues with zero calls
    const activeQueues = queueDistribution.filter((q) => q.value > 0);

    res.json(activeQueues);
  } catch (error) {
    console.error("Error fetching queue distribution:", error);
    res.status(500).json({
      message: "Failed to fetch queue distribution",
      error: error.message,
    });
  }
};

/**
 * Default SLA threshold in seconds (used when no queue-specific threshold is configured)
 * Standard call center SLA is typically 80% of calls answered within 20-30 seconds
 */
const DEFAULT_SLA_THRESHOLD_SECONDS = 60;

/**
 * Get the SLA threshold for a specific queue or the global default
 * @param {string} queueName - Optional queue name to get specific threshold
 * @returns {Promise<number>} SLA threshold in seconds
 */
export const getSLAThreshold = async (queueName = null) => {
  try {
    if (queueName) {
      const queue = await VoiceQueue.findOne({
        where: { name: queueName },
        attributes: ["servicelevel"],
      });
      if (queue && queue.servicelevel && queue.servicelevel > 0) {
        return queue.servicelevel;
      }
    }
    
    // Get the average/default servicelevel from all queues if no specific queue
    const queues = await VoiceQueue.findAll({
      attributes: ["servicelevel"],
      where: {
        servicelevel: { [Op.gt]: 0 },
      },
    });
    
    if (queues.length > 0) {
      const avgServiceLevel = Math.round(
        queues.reduce((sum, q) => sum + (q.servicelevel || 0), 0) / queues.length
      );
      return avgServiceLevel > 0 ? avgServiceLevel : DEFAULT_SLA_THRESHOLD_SECONDS;
    }
    
    return DEFAULT_SLA_THRESHOLD_SECONDS;
  } catch (error) {
    console.error("Error getting SLA threshold:", error);
    return DEFAULT_SLA_THRESHOLD_SECONDS;
  }
};

export const getSLACompliance = async (req, res) => {
  try {
    const { startDate, endDate, queueName } = req.query;

    // Validate dates
    const validation = validateDates(startDate, endDate);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get the SLA threshold from queue configuration (or default)
    const slaThreshold = await getSLAThreshold(queueName);

    // Get hourly SLA data using the configured threshold
    const slaData = await CDR.findAll({
      where: {
        start: {
          [Op.between]: [start, end],
        },
        answer: {
          [Op.ne]: null, // Only answered calls
        },
      },
      attributes: [
        [sequelize.fn("HOUR", sequelize.col("start")), "hour"],
        [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN TIMESTAMPDIFF(SECOND, start, answer) <= ${slaThreshold} THEN 1 ELSE 0 END`
            )
          ),
          "answeredWithinSLA",
        ],
      ],
      group: [sequelize.fn("HOUR", sequelize.col("start"))],
      order: [[sequelize.fn("HOUR", sequelize.col("start")), "ASC"]],
      raw: true,
    });

    // Calculate SLA percentage for each hour
    const slaCompliance = slaData.map((hour) => {
      const percentage =
        hour.totalCalls > 0
          ? Math.round((hour.answeredWithinSLA / hour.totalCalls) * 100)
          : 0;

      return {
        hour: `${hour.hour}:00`,
        percentage,
        totalCalls: hour.totalCalls,
        answeredWithinSLA: hour.answeredWithinSLA,
      };
    });

    // Fill in missing hours with zero data
    const allHours = [];
    for (let i = 0; i < 24; i++) {
      const hourStr = `${i}:00`;
      const existingData = slaCompliance.find((h) => h.hour === hourStr);
      if (existingData) {
        allHours.push(existingData);
      } else {
        allHours.push({
          hour: hourStr,
          percentage: 0,
          totalCalls: 0,
          answeredWithinSLA: 0,
        });
      }
    }

    // Include the SLA threshold used in the response for transparency
    res.json({
      data: allHours,
      slaThreshold,
      queueName: queueName || "all",
    });
  } catch (error) {
    console.error("Error fetching SLA compliance:", error);
    res.status(500).json({
      error: "Failed to fetch SLA compliance data",
      details: error.message,
    });
  }
};

export const exportReport = async (req, res) => {
  try {
    const { startDate, endDate, reportType } = req.query;

    if (!startDate || !endDate || !reportType) {
      return res.status(400).json({
        message: "Missing required parameters: startDate, endDate, reportType",
      });
    }

    let data = [];
    let filename = "";
    let headers = [];

    switch (reportType) {
      case "call-volume":
        data = await getCallVolumeData(startDate, endDate);
        filename = `call-volume-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        headers = [
          "Date",
          "Inbound Calls",
          "Outbound Calls",
          "Abandoned Calls",
        ];
        break;

      case "agent-performance":
        data = await getAgentPerformanceData(startDate, endDate);
        filename = `agent-performance-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        headers = [
          "Agent Name",
          "Total Calls",
          "Avg Handle Time",
          "Satisfaction",
          "Pause Count",
          "Total Pause (sec)",
          "Total Pause Time",
          "Top Pause Reason",
        ];
        break;

      case "comprehensive-cdr":
        // New comprehensive CDR report
        data = await getComprehensiveCDRData(startDate, endDate);
        filename = `comprehensive-cdr-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        headers = [
          "Call ID",
          "Start Time",
          "Answer Time",
          "End Time",
          "Duration (sec)",
          "Billable Duration (sec)",
          "Source",
          "Destination",
          "Caller ID",
          "Disposition",
          "Channel",
          "Destination Channel",
          "Context",
          "Last App",
          "Last Data",
          "Account Code",
          "User Field",
          "AMA Flags",
        ];
        break;

      case "queue-metrics":
        try {
          // Get queue distribution data using the controller function directly
          const queueData = await new Promise((resolve, reject) => {
            const mockReq = { query: { startDate, endDate } };
            const mockRes = {
              status: () => mockRes,
              json: (data) => resolve(data),
            };
            getQueueDistribution(mockReq, mockRes).catch(reject);
          });

          // Get SLA compliance data using the controller function directly
          const slaData = await new Promise((resolve, reject) => {
            const mockReq = { query: { startDate, endDate } };
            const mockRes = {
              status: () => mockRes,
              json: (data) => resolve(data),
            };
            getSLACompliance(mockReq, mockRes).catch(reject);
          });

          // Check if we have valid data
          if (!queueData || !queueData.length || !slaData || !slaData.length) {
            return res.status(404).json({
              message: "No data available for the selected period",
            });
          }

          // First part: Queue Distribution
          const queueCsv = [
            ["Queue Distribution"],
            ["Queue Name", "Call Count", "Percentage"],
            ...queueData.map((item) => [
              item.name,
              item.value,
              `${(
                (item.value / queueData.reduce((sum, q) => sum + q.value, 0)) *
                100
              ).toFixed(2)}%`,
            ]),
          ];

          // Second part: SLA Compliance
          const slaCsv = [
            [""], // Empty row as separator
            ["SLA Compliance by Hour"],
            ["Hour", "Percentage"],
            ...slaData.map((item) => [item.hour, `${item.percentage}%`]),
          ];

          // Combine both datasets
          const combinedData = [...queueCsv, ...slaCsv];

          // Convert to CSV
          const csv = combinedData.map((row) => row.join(",")).join("\n");

          filename = `queue-metrics-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;

          // Send the CSV directly
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=${filename}`
          );
          return res.status(200).send(csv);
        } catch (error) {
          console.error("Error generating Queue Metrics report:", error);
          return res.status(500).json({
            message: "Failed to generate Queue Metrics report",
            error: error.message,
          });
        }

      case "call-distribution":
        try {
          const report = await getDetailedCallDistributionReport(
            startDate,
            endDate
          );

          if (!report || !report.records || report.records.length === 0) {
            return res.status(404).json({
              message: "No data available for the selected date range",
            });
          }

          // Build CSV: summary section + detailed records section
          const csvLines = [];

          // Summary Section
          const startIso =
            report.metadata?.dateRange?.start ||
            new Date(startDate).toISOString();
          const endIso =
            report.metadata?.dateRange?.end || new Date(endDate).toISOString();

          // Add summary section with clear formatting
          csvLines.push("Detailed Call Distribution Report");
          csvLines.push(`Report Generated,${new Date().toISOString()}`);
          csvLines.push(`Start Date,${startIso}`);
          csvLines.push(`End Date,${endIso}`);
          csvLines.push(""); // Empty line for separation
          csvLines.push("SUMMARY SECTION");
          csvLines.push(""); // Empty line for separation
          csvLines.push(
            `Total Records,${
              report.summary?.totalRecords ?? report.records.length
            }`
          );
          csvLines.push(
            `Answered Calls,${report.summary?.answeredCalls ?? ""}`
          );
          csvLines.push(
            `Abandoned Calls,${report.summary?.abandonedCalls ?? ""}`
          );
          csvLines.push(
            `Successful Calls,${report.summary?.successfulCalls ?? ""}`
          );
          csvLines.push(`Queue Calls,${report.summary?.queueCalls ?? ""}`);
          csvLines.push(
            `Business Hours Calls,${report.summary?.businessHoursCalls ?? ""}`
          );
          csvLines.push(
            `Average Talk Time (sec),${report.summary?.averageTalkTime ?? ""}`
          );
          csvLines.push(
            `Average Wait Time (sec),${report.summary?.averageWaitTime ?? ""}`
          );
          csvLines.push(`Answer Rate,${report.summary?.answerRate ?? ""}`);
          csvLines.push(`Abandon Rate,${report.summary?.abandonRate ?? ""}`);
          csvLines.push(`Success Rate,${report.summary?.successRate ?? ""}`);
          csvLines.push(
            `Estimated Total Cost,${report.summary?.estimatedTotalCost ?? ""}`
          );
          csvLines.push(""); // Empty line for separation
          csvLines.push(""); // Empty line for separation

          // Detailed Records Section
          const records = report.records;
          const headers = Object.keys(records[0]);

          // Add detailed records section header
          csvLines.push("DETAILED RECORDS SECTION");
          csvLines.push(""); // Empty line for separation
          csvLines.push(headers.join(","));

          // Add detailed records data
          records.forEach((row) => {
            const rowData = headers.map((h) => {
              let value = row[h];
              if (value === null || value === undefined) value = "";
              if (value instanceof Date) {
                value = value.toISOString().replace("T", " ").slice(0, 19);
              }
              const str = String(value);
              return str.includes(",") || str.includes('"')
                ? '"' + str.replace(/"/g, '""') + '"'
                : str;
            });
            csvLines.push(rowData.join(","));
          });

          // Join all lines into final CSV
          const csv = csvLines.join("\n");

          const filename = `detailed-call-distribution-report-${
            new Date().toISOString().split("T")[0]
          }.csv`;

          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=${filename}`
          );
          return res.status(200).send(csv);
        } catch (error) {
          console.error(
            "Error generating Detailed Call Distribution report:",
            error
          );
          return res.status(500).json({
            message: "Failed to generate Detailed Call Distribution report",
            error: error.message,
          });
        }
      // datatool and datatool-all-time cases removed - not used in this project

      case "detailed-agent-report":
        // Detailed agent report with more metrics
        data = await getDetailedAgentReport(startDate, endDate);
        filename = `detailed-agent-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        headers = [
          "Agent Name",
          "Extension",
          "Total Calls",
          "Inbound Calls",
          "Outbound Calls",
          "Answered Calls",
          "Missed Calls",
          "Average Talk Time (sec)",
          "Total Talk Time (min)",
          "Average Wait Time (sec)",
          "First Call Time",
          "Last Call Time",
        ];
        break;

      case "call-disposition-report":
        // Call disposition analysis
        data = await getCallDispositionReport(startDate, endDate);
        filename = `call-disposition-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        headers = [
          "Disposition",
          "Count",
          "Percentage",
          "Average Duration (sec)",
          "Total Duration (min)",
        ];
        break;

      case "hourly-call-pattern":
        // Hourly call pattern analysis
        data = await getHourlyCallPattern(startDate, endDate);
        filename = `hourly-call-pattern-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        headers = [
          "Hour",
          "Total Calls",
          "Inbound Calls",
          "Outbound Calls",
          "Answered Calls",
          "Abandoned Calls",
          "Average Wait Time (sec)",
          "Average Talk Time (sec)",
        ];
        break;

      case "trunk-usage-report":
        // Trunk usage analysis
        data = await getTrunkUsageReport(startDate, endDate);
        filename = `trunk-usage-report-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        headers = [
          "Trunk/Channel",
          "Total Calls",
          "Inbound Calls",
          "Outbound Calls",
          "Total Duration (min)",
          "Average Duration (sec)",
          "Success Rate (%)",
        ];
        break;

      default:
        return res.status(400).json({
          message: `Unsupported report type: ${reportType}`,
        });
    }

    // For standard reports (not queue-metrics or datatool)
    if (data.length === 0) {
      return res.status(404).json({
        message: "No data available for the selected date range",
      });
    }

    // Convert data to CSV with proper formatting
    const csv = [
      headers.join(","),
      ...data.map((row) => {
        return headers
          .map((header) => {
            // Create a mapping for header to data key
            const headerKeyMap = {
              "Call ID": "callid",
              "Start Time": "starttime",
              "Answer Time": "answertime",
              "End Time": "endtime",
              "Duration (sec)": "duration",
              "Billable Duration (sec)": "billsec",
              Source: "src",
              Destination: "dst",
              "Caller ID": "clid",
              Disposition: "disposition",
              Channel: "channel",
              "Destination Channel": "dstchannel",
              Context: "dcontext",
              "Last App": "lastapp",
              "Last Data": "lastdata",
              "Account Code": "accountcode",
              "User Field": "userfield",
              "AMA Flags": "amaflags",
              "Agent Name": "agentname",
              Extension: "extension",
              "Total Calls": "totalcalls",
              "Inbound Calls": "inboundcalls",
              "Outbound Calls": "outboundcalls",
              "Answered Calls": "answeredcalls",
              "Missed Calls": "missedcalls",
              "Average Talk Time (sec)": "averagetalktime",
              "Total Talk Time (min)": "totaltalktime",
              "Average Wait Time (sec)": "averagewaittime",
              "First Call Time": "firstcalltime",
              "Last Call Time": "lastcalltime",
              Hour: "hour",
              "Abandoned Calls": "abandonedcalls",
              "Trunk/Channel": "trunkchannel",
              "Total Duration (min)": "totalduration",
              "Average Duration (sec)": "averageduration",
              "Success Rate (%)": "successrate",
              Count: "count",
              Percentage: "percentage",
            };

            const key =
              headerKeyMap[header] || header.toLowerCase().replace(/\s+/g, "");
            let value = row[key] || "";

            // Format dates
            if (header.includes("Time") && value && value instanceof Date) {
              value = value.toISOString().replace("T", " ").slice(0, 19);
            }

            // If the value contains a comma or quotes, wrap it in quotes
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              value = `"${value.replace(/"/g, '""')}"`;
            }

            return value;
          })
          .join(",");
      }),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error exporting report:", error);
    res.status(500).json({
      message: "Failed to export report",
      error: error.message,
    });
  }
};

// Helper functions to reuse logic for export
async function getCallVolumeData(startDate, endDate) {
  try {
    // Format dates for query
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day

    // Ensure we have at least 5 days of data
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff < 5) {
      // Adjust startDate to ensure we have 5 days
      start.setDate(start.getDate() - (5 - daysDiff));
    }

    // Query call records from database
    const callRecords = await CDR.findAll({
      where: {
        start: {
          [Op.between]: [start, end],
        },
      },
      attributes: [
        "start",
        "src",
        "dst",
        "disposition",
        "dcontext",
        "channel",
        "dstchannel",
        "lastapp",
      ],
    });

    // Process data to get daily counts
    const dailyData = {};
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Initialize data for each day in the range
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayOfWeek = dayNames[currentDate.getDay()];
      const formattedDate = `${dateStr} (${dayOfWeek})`;

      dailyData[formattedDate] = {
        date: formattedDate,
        inbound: 0,
        outbound: 0,
        abandoned: 0,
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count calls by type for each day
    // Only count trunk channels (from-voip-provider) to avoid counting extension rings
    callRecords.forEach((record) => {
      const callDate =
        record.start instanceof Date ? record.start : new Date(record.start);
      const dateStr = callDate.toISOString().split("T")[0];
      const dayOfWeek = dayNames[callDate.getDay()];
      const formattedDate = `${dateStr} (${dayOfWeek})`;

      // Skip if date is not in our range (shouldn't happen but just in case)
      if (!dailyData[formattedDate]) return;

      // Determine if inbound or outbound based on dcontext
      // from-voip-provider = inbound trunk call
      // from-internal with short src = outbound call from extension
      const isInbound = record.dcontext === "from-voip-provider";
      const isOutbound = record.dcontext === "from-internal" && 
        record.src && record.src.length <= 4 && /^\d+$/.test(record.src);

      // Count by call type - only count trunk channels for inbound
      if (isInbound) {
        dailyData[formattedDate].inbound++;

        // Check if abandoned (NO ANSWER disposition on trunk channel)
        if (record.disposition === "NO ANSWER") {
          dailyData[formattedDate].abandoned++;
        }
      } else if (isOutbound) {
        dailyData[formattedDate].outbound++;
      }
      // Skip extension rings (from-internal where src is not a short extension)
    });

    // Convert to array and sort by date
    return Object.values(dailyData).sort((a, b) => {
      return new Date(a.date.split(" ")[0]) - new Date(b.date.split(" ")[0]);
    });
  } catch (error) {
    console.error("Error getting call volume data:", error);
    throw error;
  }
}

async function getAgentPerformanceData(startDate, endDate) {
  // Format dates for query
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get all agents (users with extension)
  const agents = await UserModel.findAll({
    where: {
      extension: {
        [Op.ne]: null,
      },
    },
    attributes: ["id", "fullName", "extension"],
  });

  // Get call data for each agent
  const agentPerformance = await Promise.all(
    agents.map(async (agent) => {
      // Get calls handled by this agent using CDR model
      const calls = await CDR.findAll({
        where: {
          start: {
            [Op.between]: [start, end],
          },
          [Op.or]: [{ src: agent.extension }, { dst: agent.extension }],
        },
      });

      // Calculate metrics
      const totalCalls = calls.length;

      // Calculate average handle time
      let totalDuration = 0;
      calls.forEach((call) => {
        if (call.billsec) {
          totalDuration += parseInt(call.billsec, 10);
        }
      });

      const avgHandleTimeSeconds =
        totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const minutes = Math.floor(avgHandleTimeSeconds / 60);
      const seconds = avgHandleTimeSeconds % 60;
      const avgHandleTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      // Pause metrics (overlap with date window)
      const pauseLogs = await AgentPauseLog.findAll({
        where: {
          extension: agent.extension,
          startTime: { [Op.lt]: end },
          [Op.or]: [{ endTime: null }, { endTime: { [Op.gt]: start } }],
        },
        include: [{ model: PauseReason, as: "pauseReason" }],
        raw: false,
      });

      const pauseCount = pauseLogs.length;
      const totalPauseSeconds = pauseLogs.reduce((sum, log) => {
        if (typeof log.durationSeconds === "number") return sum + log.durationSeconds;
        const s = new Date(log.startTime).getTime();
        const e = log.endTime ? new Date(log.endTime).getTime() : Date.now();
        return sum + Math.max(0, Math.floor((e - s) / 1000));
      }, 0);

      const reasonCounts = new Map();
      for (const log of pauseLogs) {
        const label =
          log.pauseReason?.label ||
          log.pauseReasonLabel ||
          log.pauseReasonCode ||
          "Unknown";
        reasonCounts.set(label, (reasonCounts.get(label) || 0) + 1);
      }
      let topPauseReason = null;
      for (const [label, count] of reasonCounts.entries()) {
        if (!topPauseReason || count > topPauseReason.count) {
          topPauseReason = { label, count };
        }
      }

      const pauseMinutes = Math.floor(totalPauseSeconds / 60);
      const pauseSeconds = totalPauseSeconds % 60;
      const totalPauseTime = `${pauseMinutes}:${pauseSeconds
        .toString()
        .padStart(2, "0")}`;

      // For satisfaction, we would normally get this from a feedback system
      // For now, generate a random score between 80-100
      const satisfaction = Math.floor(Math.random() * 20) + 80;

      return {
        name: agent.fullName,
        calls: totalCalls,
        avgHandleTime,
        satisfaction,
        pauseCount,
        totalPauseSeconds,
        totalPauseTime,
        topPauseReason: topPauseReason?.label || "",
      };
    })
  );

  // Sort by number of calls (descending)
  return agentPerformance.sort((a, b) => b.calls - a.calls);
}

// New comprehensive report functions
async function getComprehensiveCDRData(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const cdrRecords = await CDR.findAll({
    where: {
      start: {
        [Op.between]: [start, end],
      },
    },
    order: [["start", "DESC"]],
    raw: true,
  });

  return cdrRecords.map((record) => ({
    callid: record.uniqueid,
    starttime: record.start,
    answertime: record.answer,
    endtime: record.end,
    duration: record.duration,
    billsec: record.billsec,
    src: record.src,
    dst: record.dst,
    clid: record.clid,
    disposition: record.disposition,
    channel: record.channel,
    dstchannel: record.dstchannel || "",
    dcontext: record.dcontext,
    lastapp: record.lastapp,
    lastdata: record.lastdata,
    accountcode: record.accountcode || "",
    userfield: record.userfield || "",
    amaflags: record.amaflags,
  }));
}

async function getDetailedAgentReport(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const agents = await UserModel.findAll({
    where: {
      extension: {
        [Op.ne]: null,
      },
    },
    attributes: ["id", "fullName", "extension"],
  });

  const detailedReport = await Promise.all(
    agents.map(async (agent) => {
      const calls = await CDR.findAll({
        where: {
          start: {
            [Op.between]: [start, end],
          },
          [Op.or]: [{ src: agent.extension }, { dst: agent.extension }],
        },
        order: [["start", "ASC"]],
      });

      const totalCalls = calls.length;
      const inboundCalls = calls.filter(
        (c) => c.dst === agent.extension
      ).length;
      const outboundCalls = calls.filter(
        (c) => c.src === agent.extension
      ).length;
      const answeredCalls = calls.filter((c) => c.disposition !== "NO ANSWER").length;
      const missedCalls = calls.filter(
        (c) => c.disposition === "NO ANSWER"
      ).length;

      let totalTalkTime = 0;
      let totalWaitTime = 0;
      let answeredCount = 0;

      calls.forEach((call) => {
        if (call.billsec > 0) {
          totalTalkTime += call.billsec;
          answeredCount++;

          if (call.answer && call.start) {
            const waitTime = Math.floor(
              (new Date(call.answer) - new Date(call.start)) / 1000
            );
            if (waitTime > 0) totalWaitTime += waitTime;
          }
        }
      });

      const avgTalkTime =
        answeredCount > 0 ? Math.round(totalTalkTime / answeredCount) : 0;
      const avgWaitTime =
        answeredCount > 0 ? Math.round(totalWaitTime / answeredCount) : 0;
      const totalTalkTimeMin = Math.round(totalTalkTime / 60);

      const firstCall = calls.length > 0 ? calls[0].start : null;
      const lastCall = calls.length > 0 ? calls[calls.length - 1].start : null;

      return {
        agentname: agent.fullName,
        extension: agent.extension,
        totalcalls: totalCalls,
        inboundcalls: inboundCalls,
        outboundcalls: outboundCalls,
        answeredcalls: answeredCalls,
        missedcalls: missedCalls,
        averagetalktime: avgTalkTime,
        totaltalktime: totalTalkTimeMin,
        averagewaittime: avgWaitTime,
        firstcalltime: firstCall,
        lastcalltime: lastCall,
      };
    })
  );

  return detailedReport.filter((agent) => agent.totalcalls > 0);
}

async function getCallDispositionReport(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const dispositionData = await CDR.findAll({
    where: {
      start: {
        [Op.between]: [start, end],
      },
    },
    attributes: [
      "disposition",
      [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      [sequelize.fn("AVG", sequelize.col("duration")), "avgDuration"],
      [sequelize.fn("SUM", sequelize.col("duration")), "totalDuration"],
    ],
    group: ["disposition"],
    raw: true,
  });

  const totalCalls = dispositionData.reduce(
    (sum, d) => sum + parseInt(d.count),
    0
  );

  return dispositionData.map((d) => ({
    disposition: d.disposition,
    count: d.count,
    percentage: ((d.count / totalCalls) * 100).toFixed(2),
    averageduration: Math.round(d.avgDuration || 0),
    totalduration: Math.round((d.totalDuration || 0) / 60),
  }));
}

async function getHourlyCallPattern(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const hourlyData = await CDR.findAll({
    where: {
      start: {
        [Op.between]: [start, end],
      },
    },
    attributes: [
      [sequelize.fn("HOUR", sequelize.col("start")), "hour"],
      [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal(
            'CASE WHEN channel LIKE "%CyberInnovTrunk%" THEN 1 ELSE 0 END'
          )
        ),
        "inboundCalls",
      ],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal(
            'CASE WHEN channel NOT LIKE "%CyberInnovTrunk%" THEN 1 ELSE 0 END'
          )
        ),
        "outboundCalls",
      ],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal("CASE WHEN billsec > 0 THEN 1 ELSE 0 END")
        ),
        "answeredCalls",
      ],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal(
            'CASE WHEN disposition = "NO ANSWER" THEN 1 ELSE 0 END'
          )
        ),
        "abandonedCalls",
      ],
      [
        sequelize.fn(
          "AVG",
          sequelize.literal(
            "CASE WHEN answer IS NOT NULL THEN TIMESTAMPDIFF(SECOND, start, answer) END"
          )
        ),
        "avgWaitTime",
      ],
      [
        sequelize.fn(
          "AVG",
          sequelize.literal("CASE WHEN billsec > 0 THEN billsec END")
        ),
        "avgTalkTime",
      ],
    ],
    group: [sequelize.fn("HOUR", sequelize.col("start"))],
    order: [[sequelize.fn("HOUR", sequelize.col("start")), "ASC"]],
    raw: true,
  });

  // Fill in missing hours
  const fullHourlyData = [];
  for (let i = 0; i < 24; i++) {
    const hourData = hourlyData.find((h) => parseInt(h.hour) === i);
    if (hourData) {
      fullHourlyData.push({
        hour: `${i}:00`,
        totalcalls: parseInt(hourData.totalCalls),
        inboundcalls: parseInt(hourData.inboundCalls),
        outboundcalls: parseInt(hourData.outboundCalls),
        answeredcalls: parseInt(hourData.answeredCalls),
        abandonedcalls: parseInt(hourData.abandonedCalls),
        averagewaittime: Math.round(hourData.avgWaitTime || 0),
        averagetalktime: Math.round(hourData.avgTalkTime || 0),
      });
    } else {
      fullHourlyData.push({
        hour: `${i}:00`,
        totalcalls: 0,
        inboundcalls: 0,
        outboundcalls: 0,
        answeredcalls: 0,
        abandonedcalls: 0,
        averagewaittime: 0,
        averagetalktime: 0,
      });
    }
  }

  return fullHourlyData;
}

async function getTrunkUsageReport(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Extract trunk/channel prefix from channel field
  const trunkData = await CDR.findAll({
    where: {
      start: {
        [Op.between]: [start, end],
      },
    },
    attributes: [
      [
        sequelize.fn("SUBSTRING_INDEX", sequelize.col("channel"), "-", 1),
        "trunk",
      ],
      [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal(
            'CASE WHEN channel LIKE "%CyberInnovTrunk%" THEN 1 ELSE 0 END'
          )
        ),
        "inboundCalls",
      ],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal(
            'CASE WHEN channel NOT LIKE "%CyberInnovTrunk%" THEN 1 ELSE 0 END'
          )
        ),
        "outboundCalls",
      ],
      [sequelize.fn("SUM", sequelize.col("duration")), "totalDuration"],
      [sequelize.fn("AVG", sequelize.col("duration")), "avgDuration"],
      [
        sequelize.fn(
          "SUM",
          sequelize.literal(
            'CASE WHEN disposition = "ANSWERED" OR billsec > 0 THEN 1 ELSE 0 END'
          )
        ),
        "successfulCalls",
      ],
    ],
    group: [sequelize.fn("SUBSTRING_INDEX", sequelize.col("channel"), "-", 1)],
    order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
    raw: true,
  });

  return trunkData.map((t) => ({
    trunkchannel: t.trunk,
    totalcalls: parseInt(t.totalCalls),
    inboundcalls: parseInt(t.inboundCalls),
    outboundcalls: parseInt(t.outboundCalls),
    totalduration: Math.round((t.totalDuration || 0) / 60),
    averageduration: Math.round(t.avgDuration || 0),
    successrate: (
      (parseInt(t.successfulCalls) / parseInt(t.totalCalls)) *
      100
    ).toFixed(2),
  }));
}

// ==================== COMPREHENSIVE REPORT FUNCTIONS ====================

/**
 * Generate comprehensive call detail report with enhanced metrics
 */
async function getComprehensiveCallDetailReport(startDate, endDate) {
  try {
    const calls = await CDR.findAll({
      where: {
        start: { [Op.between]: [startDate, endDate] },
      },
      order: [["start", "DESC"]],
      raw: true,
    });

    // Get agent information for each call
    const agentInfo = await UserModel.findAll({
      attributes: ["extension", "fullName", "email"],
      raw: true,
    });

    const agentMap = new Map(
      agentInfo.map((agent) => [agent.extension, agent])
    );

    return calls.map((call) => {
      const agent = agentMap.get(call.src) || agentMap.get(call.dst);

      return {
        // Basic Call Information
        callId: call.uniqueid,
        startTime: call.start,
        answerTime: call.answer,
        endTime: call.end,
        duration: call.duration,
        billableSeconds: call.billsec,
        disposition: call.disposition,

        // Channel Information
        sourceChannel: call.channel,
        destinationChannel: call.dstchannel,
        sourceNumber: extractPhoneNumber(call, "src"),
        destinationNumber: extractPhoneNumber(call, "dst"),

        // Agent Information
        agentName: agent?.fullName || "Unknown",
        agentExtension: agent?.extension || "N/A",
        agentEmail: agent?.email || "N/A",

        // Call Metrics
        waitTime: call.answer
          ? Math.round((new Date(call.answer) - new Date(call.start)) / 1000)
          : 0,
        talkTime: call.billsec || 0,
        holdTime: call.duration - (call.billsec || 0),

        // Call Classification
        callType: (() => {
          // Use dcontext to determine call type
          if (call.dcontext === "from-voip-provider") return "External";
          if (call.dcontext === "from-internal") {
            const src = extractPhoneNumber(call, "src");
            // Short extension numbers are internal calls
            if (src && src.length <= 4 && /^\d+$/.test(src)) return "External"; // Outbound to external
            return "Internal";
          }
          return "Internal";
        })(),
        direction: (() => {
          // Use dcontext to determine direction
          // from-voip-provider = inbound call from trunk
          // from-internal with short src = outbound call from extension
          if (call.dcontext === "from-voip-provider") return "Inbound";
          return "Outbound";
        })(),

        // Quality Metrics
        answerRate: call.answer ? "Answered" : "No Answer",
        successRate: call.billsec > 0 ? "Successful" : "Failed",

        // Additional Context
        context: call.context || "N/A",
        lastApplication: call.lastapp || "N/A",
        lastData: call.lastdata || "N/A",

        // Timestamps
        createdAt: call.createdAt,
        updatedAt: call.updatedAt,
      };
    });
  } catch (error) {
    console.error("Error generating comprehensive call detail report:", error);
    throw error;
  }
}

/**
 * Generate comprehensive agent performance report
 */
async function getComprehensiveAgentPerformanceReport(startDate, endDate) {
  try {
    const agents = await UserModel.findAll({
      where: {
        extension: { [Op.ne]: null },
      },
      attributes: ["id", "fullName", "extension", "email", "role"],
    });

    const agentReports = await Promise.all(
      agents.map(async (agent) => {
        // Get all calls for this agent
        const agentCalls = await CDR.findAll({
          where: {
            start: { [Op.between]: [startDate, endDate] },
            [Op.or]: [{ src: agent.extension }, { dst: agent.extension }],
          },
          raw: true,
        });

        // Calculate comprehensive metrics
        const totalCalls = agentCalls.length;
        const answeredCalls = agentCalls.filter(
          (call) => call.disposition !== "NO ANSWER"
        ).length;
        const missedCalls = agentCalls.filter(
          (call) => call.disposition === "NO ANSWER"
        ).length;

        const totalTalkTime = agentCalls.reduce(
          (sum, call) => sum + (call.billsec || 0),
          0
        );
        const totalWaitTime = agentCalls.reduce((sum, call) => {
          if (call.answer) {
            return (
              sum +
              Math.round((new Date(call.answer) - new Date(call.start)) / 1000)
            );
          }
          return sum;
        }, 0);

        const avgTalkTime =
          answeredCalls > 0 ? Math.round(totalTalkTime / answeredCalls) : 0;
        const avgWaitTime =
          totalCalls > 0 ? Math.round(totalWaitTime / totalCalls) : 0;

        const answerRate =
          totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

        // Get hourly distribution
        const hourlyDistribution = {};
        agentCalls.forEach((call) => {
          const hour = new Date(call.start).getHours();
          hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        });

        // Get call disposition breakdown
        const dispositionBreakdown = {};
        agentCalls.forEach((call) => {
          const disposition = call.disposition || "UNKNOWN";
          dispositionBreakdown[disposition] =
            (dispositionBreakdown[disposition] || 0) + 1;
        });

        return {
          // Agent Information
          agentId: agent.id,
          agentName: agent.fullName,
          extension: agent.extension,
          email: agent.email,
          role: agent.role,

          // Performance Metrics
          totalCalls,
          answeredCalls,
          missedCalls,
          totalTalkTime,
          totalWaitTime,
          avgTalkTime,
          avgWaitTime,
          answerRate: `${answerRate}%`,

          // Quality Metrics
          firstCallResolution: "N/A", // Would need additional tracking
          customerSatisfaction: "N/A", // Would need survey data

          // Distribution Data
          hourlyDistribution,
          dispositionBreakdown,

          // Time Analysis
          peakHour: Object.keys(hourlyDistribution).reduce(
            (a, b) => (hourlyDistribution[a] > hourlyDistribution[b] ? a : b),
            "N/A"
          ),

          // Efficiency Metrics
          callsPerHour:
            totalCalls > 0
              ? Math.round(
                  totalCalls /
                    ((endDate - startDate) / (1000 * 60 * 60 * 24 * 24))
                )
              : 0,
          utilizationRate: `${answerRate}%`, // Simplified calculation
        };
      })
    );

    return agentReports;
  } catch (error) {
    console.error(
      "Error generating comprehensive agent performance report:",
      error
    );
    throw error;
  }
}

/**
 * Generate comprehensive system health report
 */
async function getComprehensiveSystemHealthReport(startDate, endDate) {
  try {
    // Get system-wide metrics - count only trunk channels (from-voip-provider)
    // to avoid counting extension rings as separate calls
    const totalCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: { 
        dcontext: "from-voip-provider",
        start: { [Op.between]: [startDate, endDate] } 
      },
    });

    const answeredCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: { [Op.ne]: "NO ANSWER" },
        start: { [Op.between]: [startDate, endDate] },
      },
    });

    // Abandoned calls: trunk channels with NO ANSWER disposition
    const abandonedCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: "NO ANSWER",
        start: { [Op.between]: [startDate, endDate] },
      },
    });

    // Get queue performance
    const queueStats = await CDR.findAll({
      attributes: [
        "queue",
        [sequelize.fn("COUNT", sequelize.col("id")), "totalCalls"],
        [sequelize.fn("SUM", sequelize.col("billsec")), "totalTalkTime"],
        [sequelize.fn("AVG", sequelize.col("billsec")), "avgTalkTime"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal('CASE WHEN disposition != "NO ANSWER" THEN 1 ELSE 0 END')
          ),
          "answeredCalls",
        ],
        [
          sequelize.fn(
            "AVG",
            sequelize.literal("TIMESTAMPDIFF(SECOND, start, answer)")
          ),
          "avgWaitTime",
        ],
      ],
      where: {
        start: { [Op.between]: [startDate, endDate] },
        queue: { [Op.ne]: null },
      },
      group: ["queue"],
      raw: true,
    });

    // Get hourly call distribution
    const hourlyStats = await CDR.findAll({
      attributes: [
        [sequelize.fn("HOUR", sequelize.col("start")), "hour"],
        [sequelize.fn("COUNT", sequelize.col("id")), "callCount"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal('CASE WHEN disposition != "NO ANSWER" THEN 1 ELSE 0 END')
          ),
          "answeredCalls",
        ],
      ],
      where: { start: { [Op.between]: [startDate, endDate] } },
      group: [sequelize.fn("HOUR", sequelize.col("start"))],
      order: [[sequelize.fn("HOUR", sequelize.col("start")), "ASC"]],
      raw: true,
    });

    // Get trunk utilization
    const trunkStats = await CDR.findAll({
      attributes: [
        "channel",
        [sequelize.fn("COUNT", sequelize.col("id")), "callCount"],
        [sequelize.fn("SUM", sequelize.col("billsec")), "totalDuration"],
        [sequelize.fn("AVG", sequelize.col("billsec")), "avgDuration"],
      ],
      where: {
        start: { [Op.between]: [startDate, endDate] },
        [Op.or]: [
          { channel: { [Op.like]: "SIP/%" } },
          { channel: { [Op.like]: "PJSIP/%" } },
        ],
      },
      group: ["channel"],
      raw: true,
    });

    return {
      // System Overview
      reportPeriod: {
        startDate,
        endDate,
        duration:
          Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + " days",
      },

      // Call Volume Metrics
      totalCalls,
      answeredCalls,
      abandonedCalls,
      answerRate:
        totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
      abandonRate:
        totalCalls > 0 ? Math.round((abandonedCalls / totalCalls) * 100) : 0,

      // Queue Performance
      queuePerformance: queueStats.map((queue) => ({
        queueName: queue.queue,
        totalCalls: parseInt(queue.totalCalls),
        answeredCalls: parseInt(queue.answeredCalls),
        answerRate:
          queue.totalCalls > 0
            ? Math.round((queue.answeredCalls / queue.totalCalls) * 100)
            : 0,
        avgTalkTime: Math.round(parseFloat(queue.avgTalkTime || 0)),
        avgWaitTime: Math.round(parseFloat(queue.avgWaitTime || 0)),
        totalTalkTime: parseInt(queue.totalTalkTime || 0),
      })),

      // Hourly Distribution
      hourlyDistribution: hourlyStats.map((hour) => ({
        hour: parseInt(hour.hour),
        callCount: parseInt(hour.callCount),
        answeredCalls: parseInt(hour.answeredCalls),
        answerRate:
          hour.callCount > 0
            ? Math.round((hour.answeredCalls / hour.callCount) * 100)
            : 0,
      })),

      // Trunk Utilization
      trunkUtilization: trunkStats.map((trunk) => ({
        trunk: trunk.channel,
        callCount: parseInt(trunk.callCount),
        totalDuration: parseInt(trunk.totalDuration || 0),
        avgDuration: Math.round(parseFloat(trunk.avgDuration || 0)),
      })),

      // System Health Indicators
      systemHealth: {
        overallAnswerRate:
          totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
        peakHour: hourlyStats.reduce(
          (a, b) => (parseInt(a.callCount) > parseInt(b.callCount) ? a : b),
          { hour: 0, callCount: 0 }
        ).hour,
        busiestQueue: queueStats.reduce(
          (a, b) => (parseInt(a.totalCalls) > parseInt(b.totalCalls) ? a : b),
          { queue: "N/A", totalCalls: 0 }
        ).queue,
        mostUsedTrunk: trunkStats.reduce(
          (a, b) => (parseInt(a.callCount) > parseInt(b.callCount) ? a : b),
          { channel: "N/A", callCount: 0 }
        ).channel,
      },
    };
  } catch (error) {
    console.error(
      "Error generating comprehensive system health report:",
      error
    );
    throw error;
  }
}

async function getDetailedCallDistributionReport(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get all CDR records with all columns and enrich with agent information
  const cdrRecords = await CDR.findAll({
    where: {
      start: { [Op.between]: [start, end] },
    },
    attributes: [
      "id",
      "start",
      "answer",
      "end",
      "clid",
      "src",
      "dst",
      "dcontext",
      "channel",
      "dstchannel",
      "lastapp",
      "lastdata",
      "duration",
      "billsec",
      "disposition",
      "amaflags",
      "accountcode",
      "uniqueid",
      "userfield",
    ],
    order: [["start", "DESC"]],
    raw: true,
  });

  // Get agent information for enrichment
  const agents = await UserModel.findAll({
    attributes: ["id", "fullName", "extension", "email"],
    raw: true,
  });

  // Create agent lookup map
  const agentMap = new Map();
  agents.forEach((agent) => {
    agentMap.set(agent.extension, agent);
  });

  // Enrich CDR records with calculated fields and agent information
  const enrichedRecords = cdrRecords.map((record) => {
    // Extract extension from channel names (e.g., PJSIP/1016-0000118e -> 1016)
    const extractExtensionFromChannel = (channel) => {
      if (!channel) return null;
      const match = channel.match(/PJSIP\/(\d+)/);
      return match ? match[1] : null;
    };

    const srcExtension = extractExtensionFromChannel(record.channel);
    const dstExtension = extractExtensionFromChannel(record.dstchannel);

    const agent =
      agentMap.get(record.src) ||
      agentMap.get(record.dst) ||
      agentMap.get(srcExtension) ||
      agentMap.get(dstExtension);

    // Calculate wait time (time from start to answer)
    const waitTime = record.answer
      ? Math.round((new Date(record.answer) - new Date(record.start)) / 1000)
      : 0;

    // Calculate hold time (duration - billsec)
    const holdTime = Math.max(0, record.duration - record.billsec);

    // Determine call type
    const callType =
      record.lastapp === "Queue"
        ? "Inbound Queue"
        : record.lastapp === "Dial"
        ? "Outbound"
        : record.lastapp === "Voicemail"
        ? "Voicemail"
        : record.lastapp === "Hangup"
        ? "Hangup"
        : "Other";

    // Determine call direction based on dcontext
    const callDirection = (() => {
      // Use dcontext as the primary indicator
      // from-voip-provider = inbound call from trunk
      if (record.dcontext === "from-voip-provider") {
        return "Inbound";
      }

      // from-internal with short src = outbound call from extension
      if (record.dcontext === "from-internal") {
        const srcNum = extractPhoneNumber(record, "src");
        // If src is a short extension number (3-4 digits), it's an outbound call
        if (srcNum && srcNum.length <= 4 && /^\d+$/.test(srcNum)) {
          return "Outbound";
        }
        // Otherwise it's an internal transfer or extension ring
        return "Internal";
      }

      // Fallback: check lastapp
      if (record.lastapp === "Queue") {
        return "Inbound";
      }
      if (record.lastapp === "Dial") {
        return "Outbound";
      }

      return "Unknown";
    })();

    // Calculate answer rate and success rate
    const isAnswered = record.disposition === "ANSWERED";
    const isSuccessful =
      record.disposition === "ANSWERED" && record.billsec > 0;

    // Format timestamps
    const formatTimestamp = (timestamp) => {
      return timestamp
        ? new Date(timestamp).toISOString().replace("T", " ").substring(0, 19)
        : "";
    };

    // Helpers for CSV-friendly date/time and duration
    const dateObj = record.start ? new Date(record.start) : null;
    const callDate = dateObj ? dateObj.toISOString().split("T")[0] : "";
    const callTime = dateObj
      ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
          .toISOString()
          .split("T")[1]
          .substring(0, 8)
      : "";
    const formatHMS = (secs) => {
      const s = Math.max(0, Number(secs) || 0);
      const h = Math.floor(s / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((s % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const ss = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
      return `${h}:${m}:${ss}`;
    };

    return {
      // CSV-friendly date/time columns
      callDate, // YYYY-MM-DD
      callTime, // HH:MM:SS (local-adjusted)

      // Basic CDR Information
      id: record.id,
      startTime: formatTimestamp(record.start),
      answerTime: formatTimestamp(record.answer),
      endTime: formatTimestamp(record.end),
      callerId: record.clid || "",
      source: extractPhoneNumber(record, "src"),
      destination: extractPhoneNumber(record, "dst"),
      context: record.dcontext || "",
      channel: record.channel || "",
      destinationChannel: record.dstchannel || "",
      lastApplication: record.lastapp || "",
      lastData: record.lastdata || "",
      uniqueId: record.uniqueid || "",

      // Duration Information
      totalDuration: record.duration,
      billableDuration: record.billsec,
      waitTime: waitTime,
      holdTime: holdTime,
      totalDurationFormatted: formatHMS(record.duration),
      talkDurationFormatted: formatHMS(record.billsec),
      waitTimeFormatted: formatHMS(waitTime),
      holdTimeFormatted: formatHMS(holdTime),

      // Call Classification
      disposition: record.disposition || "",
      callType: callType,
      callDirection: callDirection,

      // Performance Metrics
      isAnswered: isAnswered,
      isSuccessful: isSuccessful,
      answerRate: isAnswered ? "100%" : "0%",
      successRate: isSuccessful ? "100%" : "0%",

      // Agent Information (if available)
      agentId: agent?.id || "",
      agentName: agent?.fullName || "",
      agentExtension: agent?.extension || "",

      // Additional Analysis Fields
      hourOfDay: new Date(record.start).getHours(),
      dayOfWeek: new Date(record.start).getDay(),
      dateOnly: new Date(record.start).toISOString().split("T")[0],

      // Queue Information (if applicable)
      queueName: record.lastapp === "Queue" ? record.lastdata : "",
      isQueueCall: record.lastapp === "Queue",

      // Quality Indicators
      hasHoldTime: holdTime > 0,
      isLongCall: record.billsec > 300, // More than 5 minutes
      isShortCall: record.billsec > 0 && record.billsec < 30, // Less than 30 seconds
      isAbandoned: record.disposition === "NO ANSWER",
      isBusy: record.disposition === "BUSY",
      isFailed: record.disposition === "FAILED",

      // Business Hours Analysis
      isBusinessHours: (() => {
        const hour = new Date(record.start).getHours();
        const day = new Date(record.start).getDay();
        return day >= 1 && day <= 5 && hour >= 8 && hour <= 17;
      })(),

      // Cost Analysis (if applicable)
      estimatedCost: record.billsec > 0 ? (record.billsec / 60) * 0.05 : 0, // $0.05 per minute
    };
  });

  // Generate summary statistics
  const summary = {
    totalRecords: enrichedRecords.length,
    totalCalls: enrichedRecords.length,
    answeredCalls: enrichedRecords.filter((r) => r.isAnswered).length,
    abandonedCalls: enrichedRecords.filter((r) => r.isAbandoned).length,
    successfulCalls: enrichedRecords.filter((r) => r.isSuccessful).length,
    queueCalls: enrichedRecords.filter((r) => r.isQueueCall).length,
    businessHoursCalls: enrichedRecords.filter((r) => r.isBusinessHours).length,
    totalTalkTime: enrichedRecords.reduce(
      (sum, r) => sum + r.billableDuration,
      0
    ),
    totalWaitTime: enrichedRecords.reduce((sum, r) => sum + r.waitTime, 0),
    totalHoldTime: enrichedRecords.reduce((sum, r) => sum + r.holdTime, 0),
    averageTalkTime:
      enrichedRecords.length > 0
        ? Math.round(
            enrichedRecords.reduce((sum, r) => sum + r.billableDuration, 0) /
              enrichedRecords.length
          )
        : 0,
    averageWaitTime:
      enrichedRecords.length > 0
        ? Math.round(
            enrichedRecords.reduce((sum, r) => sum + r.waitTime, 0) /
              enrichedRecords.length
          )
        : 0,
    answerRate:
      enrichedRecords.length > 0
        ? (
            (enrichedRecords.filter((r) => r.isAnswered).length /
              enrichedRecords.length) *
            100
          ).toFixed(2)
        : 0,
    abandonRate:
      enrichedRecords.length > 0
        ? (
            (enrichedRecords.filter((r) => r.isAbandoned).length /
              enrichedRecords.length) *
            100
          ).toFixed(2)
        : 0,
    successRate:
      enrichedRecords.length > 0
        ? (
            (enrichedRecords.filter((r) => r.isSuccessful).length /
              enrichedRecords.length) *
            100
          ).toFixed(2)
        : 0,
    estimatedTotalCost: enrichedRecords
      .reduce((sum, r) => sum + r.estimatedCost, 0)
      .toFixed(2),
  };

  return {
    summary,
    records: enrichedRecords,
    metadata: {
      reportGenerated: new Date().toISOString(),
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      totalColumns: Object.keys(enrichedRecords[0] || {}).length,
      recordCount: enrichedRecords.length,
    },
  };
}

export default {
  getCallDetail,
  getQualityMetrics,
  getCallVolumeAnalytics,
  getBillingAnalysis,
  getPerformanceMetrics,
  getQueueAnalytics,
  getCustomReport,
  getSystemHealthMetrics,
  downloadReport,
  getCallVolume,
  getAgentPerformance,
  getQueueDistribution,
  getSLACompliance,
  exportReport,
};
