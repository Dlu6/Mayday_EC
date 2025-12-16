import sequelize, { Op } from "../config/sequelize.js";
import CDR from "../models/cdr.js";
import { callMonitoringService } from "../services/callMonitoringService.js";

/**
 * Get current call statistics for admin dashboard
 */
export const getCallStats = async (req, res) => {
  try {
    // Get active calls from monitoring service
    const activeCalls = callMonitoringService.getActiveCalls();

    // Count calls in different states
    const waitingCalls = activeCalls.filter(
      (call) => call.status === "waiting" || call.status === "queued"
    ).length;
    const talkingCalls = activeCalls.filter(
      (call) => call.status === "answered" || call.status === "in-progress"
    ).length;

    // Get today's call counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Count only trunk channels (from-voip-provider) to avoid counting extension rings as separate calls
    // Answered calls: trunk channels with NORMAL disposition (call was answered by an agent)
    const answeredCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: { [Op.ne]: "NO ANSWER" },
        start: { [Op.gte]: todayStart },
      },
    });

    // Abandoned/missed calls: trunk channels with NO ANSWER disposition
    // Note: billsec might be > 0 if the queue "answered" the call before routing to agents
    const abandonedCalls = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: "NO ANSWER",
        start: { [Op.gte]: todayStart },
      },
    });

    // Total offered calls: count only trunk channels (inbound calls from provider)
    const totalOffered = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        start: { [Op.gte]: todayStart },
      },
    });

    // Calculate average hold time (answer delay). Keep as-is but ensure answered only
    const holdTimeResult = await CDR.findAll({
      attributes: [
        [
          sequelize.fn(
            "AVG",
            sequelize.fn(
              "TIMESTAMPDIFF",
              sequelize.literal("SECOND"),
              sequelize.col("start"),
              sequelize.col("answer")
            )
          ),
          "avgHoldTime",
        ],
      ],
      where: {
        start: { [Op.gte]: todayStart },
        answer: { [Op.ne]: null },
        billsec: { [Op.gt]: 0 },
      },
      raw: true,
    });

    const avgHoldTime = holdTimeResult[0]?.avgHoldTime || 0;

    // Get previous hour stats for trend calculation
    const previousHourStart = new Date();
    previousHourStart.setHours(previousHourStart.getHours() - 1);

    const previousHourStats = await getPreviousHourStats(
      previousHourStart,
      todayStart
    );

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const stats = {
      waiting: waitingCalls,
      talking: talkingCalls,
      answered: answeredCalls,
      abandoned: abandonedCalls,
      totalOffered: totalOffered,
      avgHoldTime: avgHoldTime,
      trends: {
        waiting: calculateTrend(waitingCalls, previousHourStats.waiting),
        talking: calculateTrend(talkingCalls, previousHourStats.talking),
        answered: calculateTrend(answeredCalls, previousHourStats.answered),
        abandoned: calculateTrend(abandonedCalls, previousHourStats.abandoned),
        totalOffered: calculateTrend(
          totalOffered,
          previousHourStats.totalOffered
        ),
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting call stats:", error);
    res.status(500).json({ error: "Failed to fetch call statistics" });
  }
};

/**
 * Get queue activity metrics
 */
export const getQueueActivity = async (req, res) => {
  try {
    // Get queue stats from monitoring service
    const queueStats = callMonitoringService.getQueueStats();

    // Calculate overall service level across all queues
    let totalAnswered = 0;
    let totalCalls = 0;
    let totalWaitTime = 0;
    let totalAbandoned = 0;

    queueStats.forEach((queue) => {
      totalAnswered += queue.answered || 0;
      totalCalls += queue.calls || 0;
      totalWaitTime += queue.totalWaitTime || 0;
      totalAbandoned += queue.abandoned || 0;
    });

    const serviceLevel =
      totalCalls > 0 ? Math.round((totalAnswered / totalCalls) * 100) : 0;

    const avgWaitTime =
      totalAnswered > 0 ? Math.round(totalWaitTime / totalAnswered) : 0;

    // Calculate abandon rate with safety check
    let abandonRate = 0;
    if (totalCalls > 0) {
      // Ensure abandoned calls don't exceed total calls
      const validAbandoned = Math.min(totalAbandoned, totalCalls);
      abandonRate = Math.round((validAbandoned / totalCalls) * 100);
    }

    // Also get today's CDR-based stats as a fallback/validation
    // Count only trunk channels (from-voip-provider) to avoid counting extension rings
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [answeredCount, abandonedCount, totalCount] = await Promise.all([
      CDR.count({
        col: "uniqueid",
        distinct: true,
        where: {
          dcontext: "from-voip-provider",
          disposition: { [Op.ne]: "NO ANSWER" },
          start: { [Op.gte]: todayStart },
        },
      }),
      CDR.count({
        col: "uniqueid",
        distinct: true,
        where: {
          dcontext: "from-voip-provider",
          disposition: "NO ANSWER",
          start: { [Op.gte]: todayStart },
        },
      }),
      CDR.count({
        col: "uniqueid",
        distinct: true,
        where: {
          dcontext: "from-voip-provider",
          start: { [Op.gte]: todayStart },
        },
      }),
    ]);

    // Use CDR-based abandon rate if queue stats seem incorrect
    if (abandonRate > 100 || totalCalls === 0) {
      abandonRate =
        totalCount > 0 ? Math.round((abandonedCount / totalCount) * 100) : 0;
    }

    res.json({
      serviceLevel,
      waitTime: avgWaitTime,
      abandonRate,
      queues: queueStats,
    });
  } catch (error) {
    console.error("Error getting queue activity:", error);
    res.status(500).json({ error: "Failed to fetch queue activity" });
  }
};

/**
 * Get historical call data for trends
 */
export const getHistoricalStats = async (req, res) => {
  try {
    const { timeframe = "hour" } = req.query;
    let startTime;
    const now = new Date();

    // Determine time range based on requested timeframe
    switch (timeframe) {
      case "hour":
        startTime = new Date(now);
        startTime.setHours(now.getHours() - 1);
        break;
      case "day":
        startTime = new Date(now);
        startTime.setDate(now.getDate() - 1);
        break;
      case "week":
        startTime = new Date(now);
        startTime.setDate(now.getDate() - 7);
        break;
      default:
        startTime = new Date(now);
        startTime.setHours(now.getHours() - 1);
    }

    // Get historical data - count only trunk channels (from-voip-provider)
    const historicalData = await CDR.findAll({
      attributes: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("start"),
            "%Y-%m-%d %H:00:00"
          ),
          "hour",
        ],
        [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("uniqueid"))), "total"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal("CASE WHEN disposition != 'NO ANSWER' THEN 1 ELSE 0 END")
          ),
          "answered",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "CASE WHEN disposition = 'NO ANSWER' THEN 1 ELSE 0 END"
            )
          ),
          "abandoned",
        ],
      ],
      where: {
        dcontext: "from-voip-provider",
        start: { [Op.between]: [startTime, now] },
      },
      group: [
        sequelize.fn(
          "DATE_FORMAT",
          sequelize.col("start"),
          "%Y-%m-%d %H:00:00"
        ),
      ],
      order: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("start"),
            "%Y-%m-%d %H:00:00"
          ),
          "ASC",
        ],
      ],
      raw: true,
    });

    res.json(historicalData);
  } catch (error) {
    console.error("Error getting historical stats:", error);
    res.status(500).json({ error: "Failed to fetch historical statistics" });
  }
};

/**
 * Helper function to get previous hour stats for trend calculation
 */
async function getPreviousHourStats(previousHourStart, todayStart) {
  try {
    // Get active calls count from previous hour
    // This is an approximation since we don't store historical active call counts
    const previousWaiting = 0;
    const previousTalking = 0;

    // Get answered calls from previous hour (trunk channels only)
    const previousAnswered = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: { [Op.ne]: "NO ANSWER" },
        start: { [Op.between]: [previousHourStart, todayStart] },
      },
    });

    // Get abandoned calls from previous hour (trunk channels only)
    const previousAbandoned = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: "NO ANSWER",
        start: { [Op.between]: [previousHourStart, todayStart] },
      },
    });

    // Get total offered from previous hour (trunk channels only)
    const previousTotalOffered = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        start: { [Op.between]: [previousHourStart, todayStart] },
      },
    });

    return {
      waiting: previousWaiting,
      talking: previousTalking,
      answered: previousAnswered,
      abandoned: previousAbandoned,
      totalOffered: previousTotalOffered,
    };
  } catch (error) {
    console.error("Error getting previous hour stats:", error);
    return {
      waiting: 0,
      talking: 0,
      answered: 0,
      abandoned: 0,
      totalOffered: 0,
    };
  }
}

export default {
  getCallStats,
  getQueueActivity,
  getHistoricalStats,
};
