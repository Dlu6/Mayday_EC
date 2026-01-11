// services/callMonitoringService.js
// import { EventBusService } from "./eventBus.js";
import amiService from "./amiService.js";
// import { ariService } from "./ariService.js";
import { Op } from "../config/sequelize.js";
import chalk from "chalk";
import { socketService } from "./socketService.js";
import CDR from "../models/cdr.js";
import UserModel from "../models/UsersModel.js";
import { formatCdrRecord } from "../controllers/cdrController.js";

const activeCallsMap = new Map();
const queueCallsMap = new Map(); // Track calls in queues to avoid duplicates
const queueStatsMap = new Map(); // Track queue statistics

// Function to get active calls - returns array of active call objects
const getActiveCalls = () => {
  return Array.from(activeCallsMap.values());
};

// Update a call's last activity timestamp to support stale cleanup
function touchActiveCall(uniqueid) {
  const call = activeCallsMap.get(uniqueid);
  if (call) {
    call.lastUpdate = Date.now();
    call.lastUpdate = Date.now();
    call.lastUpdate = Date.now();
    call.lastUpdate = Date.now();
    activeCallsMap.set(uniqueid, call);
  }
}

// Helper to determine if a given extension is currently on a call
// This scans the in-memory active calls for any channel or src/dst referencing the extension
function findActiveCallForExtension(extension) {
  const calls = Array.from(activeCallsMap.values());
  for (const call of calls) {
    const channel = call.channel || "";
    const src = call.src || call.callerId || call.clid || "";
    const dst = call.dst || call.extension || "";

    const channelMatches =
      channel.startsWith(`PJSIP/${extension}-`) ||
      channel.startsWith(`SIP/${extension}-`) ||
      channel.includes(`/${extension}-`);

    if (channelMatches || src === extension || dst === extension) {
      return call;
    }
  }
  return null;
}

// Log wrapper for consistent formatting
const log = {
  info: (msg, data) =>
    console.log(chalk.blue(`[Call Monitor] ${msg}`), data || ""),
  success: (msg, data) =>
    console.log(chalk.green(`[Call Monitor] ${msg}`), data || ""),
  warn: (msg, data) =>
    console.log(chalk.yellow(`[Call Monitor] ${msg}`), data || ""),
  error: (msg, data) =>
    console.error(chalk.red(`[Call Monitor] ${msg}`), data || ""),
};

// Get call volume data by hour for the last 6 hours
const getCallVolumeByHour = async () => {
  try {
    // Create a date object for 6 hours ago
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    // Get current hour
    const currentHour = new Date().getHours();

    // Create an array to hold hourly data
    const hourlyData = [];

    // For each of the last 6 hours
    for (let i = 5; i >= 0; i--) {
      const hour = (currentHour - i + 24) % 24; // Handle wrapping around midnight

      // Create start and end time for this hour
      const hourStart = new Date();
      hourStart.setHours(hour, 0, 0, 0);

      const hourEnd = new Date();
      hourEnd.setHours(hour, 59, 59, 999);

      // If this hour is in the future (e.g., it's 2am and we're calculating for 11pm yesterday)
      // then adjust the date to yesterday
      if (hourStart > new Date()) {
        hourStart.setDate(hourStart.getDate() - 1);
        hourEnd.setDate(hourEnd.getDate() - 1);
      }

      // Query for total calls in this hour
      const totalCalls = await CDR.count({
        where: {
          start: {
            [Op.between]: [hourStart, hourEnd],
          },
        },
      });

      // Query for handled calls in this hour
      const handledCalls = await CDR.count({
        where: {
          start: {
            [Op.between]: [hourStart, hourEnd],
          },
          disposition: {
            [Op.ne]: "NO ANSWER",
          },
        },
      });

      // Calculate abandoned calls
      const abandonedCalls = totalCalls - handledCalls;

      // Format hour as "HH:00"
      const hourFormatted = `${hour.toString().padStart(2, "0")}:00`;

      // Add to hourly data array
      hourlyData.push({
        hour: hourFormatted,
        calls: totalCalls,
        handled: handledCalls,
        abandoned: abandonedCalls,
      });
    }

    return hourlyData;
  } catch (error) {
    log.error("Error getting call volume by hour:", error);
    return [];
  }
};

// Get total calls (Inbound + Outbound) for today
// Count only originating channels to avoid counting extension rings as separate calls
const getTotalCallsCount = async () => {
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    // Inbound: count calls from voip provider (trunk channel)
    const inbound = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        start: { [Op.gte]: todayMidnight },
      },
    });

    // Outbound: count calls from internal context where src is a short extension
    // This excludes queue-generated extension rings
    const outbound = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-internal",
        src: { [Op.regexp]: "^[0-9]{3,4}$" },
        // Exclude calls where channel contains trunk (these are queue callbacks)
        channel: { [Op.notLike]: "%trunk%" },
        start: { [Op.gte]: todayMidnight },
      },
    });

    return inbound + outbound;
  } catch (error) {
    log.error("Error getting total calls count:", error);
    return 0;
  }
};

// New helpers: inbound/outbound for today
const getInboundCallsCount = async () => {
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    // Count calls from voip provider (trunk channel only)
    return await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        start: { [Op.gte]: todayMidnight },
      },
    });
  } catch (error) {
    log.error("Error getting inbound calls count:", error);
    return 0;
  }
};

const getOutboundCallsCount = async () => {
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    // Count calls from internal context where src is a short extension
    // This excludes queue-generated extension rings
    return await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-internal",
        src: { [Op.regexp]: "^[0-9]{3,4}$" },
        channel: { [Op.notLike]: "%trunk%" },
        start: { [Op.gte]: todayMidnight },
      },
    });
  } catch (error) {
    log.error("Error getting outbound calls count:", error);
    return 0;
  }
};

// Get weekly total calls count from CDR table
const getWeeklyTotalCallsCount = async () => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Count only trunk channels (from-voip-provider) to avoid counting extension rings
    const count = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: { [Op.ne]: "NO ANSWER" },
        start: { [Op.gte]: startOfWeek },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting weekly total calls count:", error);
    return 0;
  }
};

// Get monthly total calls count from CDR table
const getMonthlyTotalCallsCount = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Count only trunk channels (from-voip-provider) to avoid counting extension rings
    const count = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        dcontext: "from-voip-provider",
        disposition: { [Op.ne]: "NO ANSWER" },
        start: { [Op.gte]: startOfMonth },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting monthly total calls count:", error);
    return 0;
  }
};

// Get abandoned calls count from CDR table
// An abandoned call is one where the trunk channel has NO ANSWER disposition
// Note: billsec might be > 0 if the queue "answered" the call before routing to agents
const getAbandonedCallsCount = async () => {
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    return await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        disposition: "NO ANSWER",
        dcontext: "from-voip-provider",
        start: { [Op.gte]: todayMidnight },
      },
    });
  } catch (error) {
    log.error("Error getting abandoned calls count:", error);
    return 0;
  }
};

// Get weekly abandoned calls count from CDR table
const getWeeklyAbandonedCallsCount = async () => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const count = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        disposition: "NO ANSWER",
        dcontext: "from-voip-provider",
        start: { [Op.gte]: startOfWeek },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting weekly abandoned calls count:", error);
    return 0;
  }
};

// Get monthly abandoned calls count from CDR table
const getMonthlyAbandonedCallsCount = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await CDR.count({
      col: "uniqueid",
      distinct: true,
      where: {
        disposition: "NO ANSWER",
        dcontext: "from-voip-provider",
        start: { [Op.gte]: startOfMonth },
      },
    });
    return count;
  } catch (error) {
    log.error("Error getting monthly abandoned calls count:", error);
    return 0;
  }
};

// Emit stats update to all connected clients
const broadcastStats = async () => {
  try {
    // Log the current state of activeCallsMap
    // log.info(
    //   `Current active calls: ${activeCallsMap.size}`,
    //   Array.from(activeCallsMap.entries()).map(([id, call]) => ({
    //     id,
    //     src: call.src,
    //     dst: call.dst,
    //     status: call.status || "ringing",
    //     direction: call.direction,
    //   }))
    // );

    // Transform the activeCallsMap values to ensure they have all required fields for the frontend
    const activeCallsList = Array.from(activeCallsMap.values()).map((call) => ({
      ...call,
      callerId: call.src || call.clid || call.callerId,
      extension: call.dst || call.extension,
      status: call.status || "ringing",
      uniqueid: call.uniqueid,
      startTime: call.startTime || new Date().toISOString(),
    }));

    // Transform queueStatsMap to an array for the frontend
    const queueStatusList = Array.from(queueStatsMap.values()).map((queue) => ({
      name: queue.name,
      waiting: queue.waiting || 0,
      sla: queue.serviceLevelPercentage || 0,
      avgWaitTime: queue.avgWaitTime || "0:00",
      abandonRate: queue.abandonRate || 0,
      totalCalls: queue.totalCalls || 0,
      answeredCalls: queue.answeredCalls || 0,
      abandonedCalls: queue.abandonedCalls || 0,
    }));

    // Get active agents data
    const allAgentsList = await getActiveAgents();

    // Count only non-offline agents as active
    const activeAgentsCount = allAgentsList.filter(
      (agent) => agent.status !== "Offline"
    ).length;

    // Get call volume data by hour
    const callsPerHour = await getCallVolumeByHour();

    // Get weekly and monthly stats
    const weeklyTotalCalls = await getWeeklyTotalCallsCount();
    const weeklyAbandonedCalls = await getWeeklyAbandonedCallsCount();
    const monthlyTotalCalls = await getMonthlyTotalCallsCount();
    const monthlyAbandonedCalls = await getMonthlyAbandonedCallsCount();

    // Get date ranges for weekly and monthly views
    const now = new Date();

    // Weekly date range
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Monthly date range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const stats = {
      timestamp: now.toISOString(),
      todayDate: new Date().setHours(0, 0, 0, 0),
      weekStartDate: startOfWeek.getTime(),
      weekEndDate: endOfWeek.getTime(),
      monthStartDate: startOfMonth.getTime(),
      monthEndDate: endOfMonth.getTime(),
      activeCalls: activeCallsMap.size,
      activeCallsList: activeCallsList,
      totalCalls: await getTotalCallsCount(),
      inboundCalls: await getInboundCallsCount(),
      outboundCalls: await getOutboundCallsCount(),
      abandonedCalls: await getAbandonedCallsCount(),
      weeklyTotalCalls: weeklyTotalCalls,
      weeklyAbandonedCalls: weeklyAbandonedCalls,
      monthlyTotalCalls: monthlyTotalCalls,
      monthlyAbandonedCalls: monthlyAbandonedCalls,
      queueStatus: queueStatusList,
      activeAgents: activeAgentsCount,
      activeAgentsList: allAgentsList,
      callsPerHour: callsPerHour, // Add hourly call data
    };

    // log.info(
    //   `Broadcasting stats with ${stats.activeCalls} active calls and ${activeCallsList.length} calls in list`
    // );
    // log.info(`Queue stats: ${queueStatusList.length} queues`, queueStatusList);
    // log.info(
    //   `Active agents: ${stats.activeAgents} (Total agents: ${allAgentsList.length})`,
    //   allAgentsList.map((agent) => ({
    //     name: agent.name,
    //     extension: agent.extension,
    //     status: agent.status,
    //   }))
    // );
    socketService.broadcast("callStats", stats);
  } catch (error) {
    log.error("Error broadcasting stats:", error);
  }
};

// AMI Event Handlers
const handleNewCall = (event) => {
  const uniqueid = event.uniqueid;
  const isInbound = event.dcontext === "from-voip-provider"; // Adjust according to your context

  if (isInbound && !activeCallsMap.has(uniqueid)) {
    const callData = {
      uniqueid: uniqueid,
      src: event.src,
      dst: event.dst,
      startTime: new Date(),
      status: "ringing",
      direction: "inbound",
    };
    activeCallsMap.set(uniqueid, callData);
    broadcastStats(); // Update frontend with new call data
  }
};

// Handle QueueParams event
const handleQueueParams = async (event) => {
  const queueName = event.Queue || event.queue;
  if (!queueName) {
    log.error("Received QueueParams event without queue name:", event);
    return;
  }

  // log.info(`Queue params updated: ${queueName}`, {
  //   calls: event.Calls || event.calls,
  //   completed: event.Completed || event.completed,
  //   abandoned: event.Abandoned || event.abandoned,
  //   serviceLevel: event.ServiceLevel || event.servicelevel,
  //   serviceLevelPercentage:
  //     event.ServiceLevelPercentage || event.servicelevelperc,
  // });

  // Update queue stats
  const queueStats = queueStatsMap.get(queueName) || { name: queueName };
  queueStats.name = queueName;
  queueStats.calls = Number(event.Calls || event.calls) || 0;
  queueStats.completed = Number(event.Completed || event.completed) || 0;
  queueStats.abandoned = Number(event.Abandoned || event.abandoned) || 0;
  queueStats.serviceLevel =
    Number(event.ServiceLevel || event.servicelevel) || 0;
  queueStats.serviceLevelPercentage =
    Number(event.ServiceLevelPercentage || event.servicelevelperc) || 0;
  queueStats.totalCalls = queueStats.completed + queueStats.abandoned;
  queueStats.answeredCalls = queueStats.completed;
  queueStats.abandonedCalls = queueStats.abandoned;

  // Calculate abandon rate
  if (queueStats.totalCalls > 0) {
    queueStats.abandonRate =
      Math.round((queueStats.abandoned / queueStats.totalCalls) * 100 * 10) /
      10;
  } else {
    queueStats.abandonRate = 0;
  }

  // Update the queue stats map
  queueStatsMap.set(queueName, queueStats);

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle QueueSummary event
const handleQueueSummary = async (event) => {
  const queueName = event.Queue || event.queue;
  if (!queueName) {
    log.error("Received QueueSummary event without queue name:", event);
    return;
  }

  // log.info(`Queue summary updated: ${queueName}`, {
  //   loggedIn: event.LoggedIn || event.loggedin,
  //   available: event.Available || event.available,
  //   callers: event.Callers || event.callers,
  //   holdTime: event.HoldTime || event.holdtime,
  //   talkTime: event.TalkTime || event.talktime,
  // });

  // Update queue stats
  const queueStats = queueStatsMap.get(queueName) || { name: queueName };
  queueStats.loggedIn = Number(event.LoggedIn || event.loggedin) || 0;
  queueStats.available = Number(event.Available || event.available) || 0;
  queueStats.waiting = Number(event.Callers || event.callers) || 0;

  // Format hold time as mm:ss
  const holdTimeSeconds = Number(event.HoldTime || event.holdtime) || 0;
  const minutes = Math.floor(holdTimeSeconds / 60);
  const seconds = holdTimeSeconds % 60;
  queueStats.avgWaitTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Update the queue stats map
  queueStatsMap.set(queueName, queueStats);

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle QueueCallerJoin event
const handleQueueCallerJoin = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received QueueCallerJoin event without uniqueid:", event);
    return;
  }

  const queueName = event.Queue || event.queue;

  // Add to queue calls map to track this call in a queue
  queueCallsMap.set(uniqueid, {
    queue: queueName,
    position: event.Position || event.position,
    joinTime: new Date().toISOString(),
  });

  // log.info(`Call joined queue: ${uniqueid}`, {
  //   queue: queueName,
  //   position: event.Position || event.position,
  //   count: event.Count || event.count,
  // });

  // Update queue stats
  const queueStats = queueStatsMap.get(queueName) || { name: queueName };
  queueStats.waiting = (queueStats.waiting || 0) + 1;
  queueStatsMap.set(queueName, queueStats);

  // If the call is not already in the active calls map, add it
  if (!activeCallsMap.has(uniqueid)) {
    // Create call data for tracking in memory
    const callData = {
      uniqueid: uniqueid,
      start: new Date(),
      clid: event.CallerIDNum || event.calleridnum,
      src: event.CallerIDNum || event.calleridnum,
      dst: event.Exten || event.exten,
      dcontext: event.Context || event.context,
      channel: event.Channel || event.channel,
      disposition: "NO ANSWER", // Initial disposition
      status: "ringing", // Add status field
      direction: "inbound", // Queue calls are typically inbound
      startTime: new Date().toISOString(), // Add startTime in ISO format for frontend
      callerId: event.CallerIDNum || event.calleridnum, // Add callerId for frontend display
      extension: event.Exten || event.exten, // Add extension for frontend display
      queue: queueName, // Add queue information
      position: event.Position || event.position,
      lastUpdate: Date.now(),
    };

    // Add to active calls map using the uniqueid as the key
    activeCallsMap.set(uniqueid, callData);

    log.success(`Queue call added to active calls map: ${uniqueid}`, {
      mapSize: activeCallsMap.size,
      queue: queueName,
    });
  } else {
    // Update existing call with queue information
    const call = activeCallsMap.get(uniqueid);
    call.queue = queueName;
    call.position = event.Position || event.position;
    activeCallsMap.set(uniqueid, call);

    // log.info(`Updated existing call with queue info: ${uniqueid}`, {
    //   queue: queueName,
    //   position: event.Position || event.position,
    // });
  }

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle QueueCallerLeave event
const handleQueueCallerLeave = async (event) => {
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received QueueCallerLeave event without uniqueid:", event);
    return;
  }

  const queueName = event.Queue || event.queue;

  // Remove from queue calls map
  queueCallsMap.delete(uniqueid);

  // Update queue stats
  if (queueName) {
    const queueStats = queueStatsMap.get(queueName) || { name: queueName };
    queueStats.waiting = Math.max(0, (queueStats.waiting || 0) - 1);
    queueStatsMap.set(queueName, queueStats);
  }

  // Broadcast updated stats immediately
  broadcastStats();
};

const handleHangup = async (event) => {
  console.log("Received hangup event:", event);

  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received hangup event without uniqueid:", event);
    return;
  }

  // First, collect any data we need from the active call before removing it
  const callData = activeCallsMap.get(uniqueid) || {
    src: event.CallerIDNum || event.calleridnum || "unknown",
    dst: event.Exten || event.exten || "unknown",
    dcontext: event.Context || event.context || "from-voip-provider",
    channel: event.Channel || event.channel || "",
    queue: event.Queue || event.queue || "unknown",
    startTime: new Date(Date.now() - 5000), // Assume 5s ago if unknown
    direction: "inbound",
  };

  // Immediately remove from active calls map for UI consistency
  const wasActive = activeCallsMap.has(uniqueid);
  if (wasActive) {
    activeCallsMap.delete(uniqueid);
    queueCallsMap.delete(uniqueid);
  }

  try {
    // Check if the CDR record exists before updating
    const cdrRecord = await CDR.findOne({ where: { uniqueid: uniqueid } });

    // Determine if this is a normal hangup vs abandoned/missed call
    // Cause 16 = Normal Clearing (answered and hung up normally)
    // Cause 19 = User alerting, no answer (should be NO ANSWER, not NORMAL)
    // Cause 0 = Unknown (typically cancelled/abandoned)
    const cause = event.Cause || event.cause;
    const isNormalClearing = cause === "16";
    const disposition = isNormalClearing ? "NORMAL" : "NO ANSWER";

    // Debug: Log the disposition decision for trunk channels
    const dcontext = event.Context || event.context;
    if (dcontext === "from-voip-provider") {
      log.info(`Trunk hangup: uniqueid=${uniqueid}, cause=${cause}, disposition=${disposition}, billsec will be checked`);
    }

    if (cdrRecord) {
      // Calculate duration based on start time
      const startTime = new Date(cdrRecord.start);
      const endTime = new Date();
      const durationSeconds = Math.ceil((endTime - startTime) / 1000);

      // For inbound calls to extensions, fix the caller number
      // The CDR might have the DID as src, but ConnectedLineNum has the actual caller
      const connectedLineNum = event.ConnectedLineNum || event.connectedlinenum;
      const context = event.Context || event.context || cdrRecord.dcontext;

      // CRITICAL FIX: Preserve Asterisk's authoritative values
      // Only update disposition if not already set to ANSWERED
      // (Asterisk's Cdr event has the authoritative disposition)
      const finalDisposition = (cdrRecord.disposition === "ANSWERED")
        ? "ANSWERED"
        : disposition;

      // Only recalculate billsec if record doesn't already have a value
      // (Asterisk's Cdr event has the authoritative billsec)
      const finalBillsec = cdrRecord.billsec > 0
        ? cdrRecord.billsec
        : cdrRecord.answer
          ? Math.ceil((endTime - new Date(cdrRecord.answer)) / 1000)
          : 0;

      // Build update object with preserved values
      const updateData = {
        end: endTime,
        disposition: finalDisposition,
        duration: durationSeconds,
        billsec: finalBillsec,
      };

      // If this is an inbound call to an extension (from-internal context) and
      // ConnectedLineNum has a valid external number, update src and clid
      if (context === "from-internal" && connectedLineNum && connectedLineNum.length >= 7 && /^\d+$/.test(connectedLineNum)) {
        updateData.src = connectedLineNum;
        updateData.clid = `"${connectedLineNum}" <${connectedLineNum}>`;
        updateData.userfield = connectedLineNum;
        log.info(`Fixing caller number for inbound call: ${connectedLineNum}`);
      }

      // Update the CDR record
      await CDR.update(updateData, {
        where: { uniqueid: uniqueid },
      });
      log.success(
        `CDR record updated for call: ${uniqueid}, disposition: ${disposition}`
      );

      // Emit call history update to notify clients
      // Fetch the updated record and format it for the client
      const updatedRecord = await CDR.findOne({ where: { uniqueid: uniqueid } });
      if (updatedRecord) {
        // Get the extension from the channel (e.g., PJSIP/1010-xxx -> 1010)
        const channel = event.Channel || event.channel || "";
        const extensionMatch = channel.match(/PJSIP\/(\d+)-/);
        const extension = extensionMatch ? extensionMatch[1] : null;

        if (extension) {
          const formattedRecord = formatCdrRecord(updatedRecord, extension);
          socketService.emitCallHistoryUpdate(formattedRecord);
          log.info(`Emitted call history update for extension ${extension}`);
        }
      }
    } else {
      // Create a new CDR record when one doesn't exist
      log.warn(`No CDR record found for call: ${uniqueid}, creating one`);

      const startTime =
        callData.startTime instanceof Date
          ? callData.startTime
          : new Date(callData.startTime || Date.now() - 10000);

      const endTime = new Date();
      const durationSeconds = Math.ceil((endTime - startTime) / 1000);

      // For inbound calls to extensions, the actual caller is in ConnectedLineNum
      // CallerIDNum contains the DID that was called
      const connectedLineNum = event.ConnectedLineNum || event.connectedlinenum;
      const callerIdNum = event.CallerIDNum || event.calleridnum;
      const context = callData.dcontext || event.Context || event.context || "from-voip-provider";

      // Determine the actual caller number for inbound calls
      // If context is from-internal and ConnectedLineNum looks like an external number, use it
      let actualCaller = callData.src || callerIdNum || "unknown";
      if (context === "from-internal" && connectedLineNum && connectedLineNum.length >= 7) {
        // This is likely an inbound call to an extension - ConnectedLineNum has the real caller
        actualCaller = connectedLineNum;
      }

      // Determine call type based on channel and context
      const channel = callData.channel || event.Channel || event.channel || "";
      const isOutbound = channel.match(/^PJSIP\/\d{4}-/) && context === "from-internal";
      const callType = isOutbound ? "outbound" : "inbound";

      await CDR.create({
        uniqueid: uniqueid,
        calldate: new Date(),
        start: startTime,
        end: endTime,
        src: actualCaller,
        dst: callData.dst || event.Exten || event.exten || "unknown",
        dcontext: context,
        channel: channel,
        lastapp: "Queue",
        lastdata: callData.queue || "",
        duration: durationSeconds,
        billsec: 0,
        disposition: disposition,
        clid: `"${connectedLineNum || actualCaller}" <${actualCaller}>`,
        amaflags: 0,
        accountcode: "",
        userfield: connectedLineNum || "", // Store ConnectedLineNum in userfield as backup
        type: callType,
      });

      log.success(`CDR record created for ${disposition} call: ${uniqueid}, caller: ${actualCaller}`);
    }

    // Force immediate stats broadcast for abandoned calls, but with a delay
    // to ensure database operations complete
    if (
      disposition === "NO ANSWER" &&
      (dcontext === "from-voip-provider" ||
        callData.dcontext === "from-voip-provider")
    ) {
      log.info(`Broadcasting stats update for abandoned call: ${uniqueid}`);
      // Verify the update was applied correctly
      const verifyRecord = await CDR.findOne({ where: { uniqueid: uniqueid } });
      if (verifyRecord) {
        log.info(`Verified CDR record: disposition=${verifyRecord.disposition}, billsec=${verifyRecord.billsec}, dcontext=${verifyRecord.dcontext}`);
      }
      setTimeout(() => broadcastStats(), 500);
    } else if (wasActive) {
      // If the call was in the active map but not an abandoned call
      // still broadcast stats after a slight delay
      setTimeout(() => broadcastStats(), 100);
    }
  } catch (error) {
    log.error(`Error updating CDR record for call: ${uniqueid}`, error);
    // Broadcast stats even on error to ensure UI consistency
    broadcastStats();
  }
};

const handleBridge = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received bridge event without uniqueid:", event);
    return;
  }

  // log.info(`Call bridged: ${uniqueid}`, {
  //   bridgeChannel: event.bridgechannel || event.BridgeChannel,
  // });

  try {
    // Update the CDR record with answer time and bridged channel
    await CDR.update(
      {
        answer: new Date(),
        disposition: "ANSWERED",
        dstchannel: event.bridgechannel || event.BridgeChannel || "",
      },
      {
        where: { uniqueid: uniqueid },
      }
    );
    log.success(`CDR record updated for bridged call: ${uniqueid}`);
  } catch (error) {
    log.error(`Error updating CDR on bridge for call: ${uniqueid}`, error);
  }

  // Update the active call in memory
  const call = activeCallsMap.get(uniqueid);
  if (call) {
    // Update call status to answered
    call.status = "answered";
    call.answerTime = new Date().toISOString();
    call.dstchannel = event.bridgechannel || event.BridgeChannel || "";
    call.lastUpdate = Date.now();
    activeCallsMap.set(uniqueid, call);

    // log.info(`Call updated to answered: ${uniqueid}`, {
    //   status: call.status,
    //   answerTime: call.answerTime,
    //   dstchannel: call.dstchannel,
    // });

    // Broadcast updated stats immediately
    broadcastStats();
  } else {
    log.warn(
      `Call not found in active calls map for bridge event: ${uniqueid}`
    );
  }
};

// Handle BridgeEnter event
const handleBridgeEnter = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received BridgeEnter event without uniqueid:", event);
    return;
  }

  // log.info(`Call entered bridge: ${uniqueid}`, {
  //   bridgeId: event.BridgeUniqueid || event.bridgeuniqueid,
  //   channel: event.Channel || event.channel,
  // });

  // Update the active call in memory
  const call = activeCallsMap.get(uniqueid);
  if (call) {
    // Update call status to answered
    call.status = "answered";
    call.answerTime = new Date().toISOString();
    call.bridgeId = event.BridgeUniqueid || event.bridgeuniqueid;
    call.lastUpdate = Date.now();
    activeCallsMap.set(uniqueid, call);

    // log.info(`Call updated on bridge enter: ${uniqueid}`, {
    //   status: call.status,
    //   answerTime: call.answerTime,
    //   bridgeId: call.bridgeId,
    // });

    // Broadcast updated stats immediately
    broadcastStats();
  } else {
    log.warn(
      `Call not found in active calls map for BridgeEnter event: ${uniqueid}`
    );
  }
};

// Handle Newstate event
const handleNewstate = async (event) => {
  // Check if we have a valid uniqueid - check both lowercase and uppercase versions
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) {
    log.error("Received Newstate event without uniqueid:", event);
    return;
  }

  const channelState = event.ChannelState || event.channelstate;
  const channelStateDesc = event.ChannelStateDesc || event.channelstatedesc;

  // log.info(`Call state changed: ${uniqueid}`, {
  //   state: channelState,
  //   stateDesc: channelStateDesc,
  //   channel: event.Channel || event.channel,
  // });

  // Update the active call in memory
  const call = activeCallsMap.get(uniqueid);
  if (call) {
    // Update call status based on channel state
    if (channelStateDesc === "Up" || channelState === "6") {
      call.status = "answered";
      call.answerTime = new Date().toISOString();
    } else if (channelStateDesc === "Ringing" || channelState === "4") {
      call.status = "ringing";
    }

    call.lastUpdate = Date.now();
    activeCallsMap.set(uniqueid, call);

    // log.info(`Call updated on state change: ${uniqueid}`, {
    //   status: call.status,
    //   channelState: channelState,
    //   channelStateDesc: channelStateDesc,
    // });

    // Broadcast updated stats immediately
    broadcastStats();
  } else {
    log.warn(
      `Call not found in active calls map for Newstate event: ${uniqueid}`
    );
  }
};

// Handle cases where the caller abandons the queue before answer
const handleQueueCallerAbandon = async (event) => {
  const uniqueid = event.uniqueid || event.Uniqueid;
  if (!uniqueid) return;
  const had = activeCallsMap.has(uniqueid);
  activeCallsMap.delete(uniqueid);
  queueCallsMap.delete(uniqueid);
  if (had) {
    // Refresh dashboards quickly
    setTimeout(() => broadcastStats(), 50);
  }
};

// Keep activity timestamp fresh while the agent connects/finishes so they are not reaped
const handleAgentConnect = async (event) => {
  const uniqueid = event.Uniqueid || event.uniqueid;
  if (!uniqueid) return;
  touchActiveCall(uniqueid);
};

const handleAgentComplete = async (event) => {
  const uniqueid = event.Uniqueid || event.uniqueid;
  if (!uniqueid) return;
  touchActiveCall(uniqueid);
};

// Function to request queue statistics from Asterisk
const requestQueueStats = async () => {
  try {
    // log.info("Requesting queue statistics from Asterisk...");

    // Request queue summary for all queues
    await amiService.executeAction({
      Action: "QueueSummary",
    });

    // log.info("Queue summary request sent");

    // Request queue status for all queues
    await amiService.executeAction({
      Action: "QueueStatus",
    });

    // log.info("Queue status request sent");

    return true;
  } catch (error) {
    log.error("Error requesting queue statistics:", error);
    return false;
  }
};

// Get active agents from queue members
const getActiveAgents = async () => {
  try {
    // Use the new AMI service that gets data from ps_contacts table (single source of truth)
    const extensionStatuses = await amiService.getAllExtensionStatuses();

    // Get all users with extensions from database
    const users = await UserModel.findAll({
      where: {
        extension: {
          [Op.not]: null,
        },
      },
    });

    // Process and return the results using the new AMI service data
    return processUserResultsWithAMI(users, extensionStatuses);
  } catch (error) {
    log.error("Error getting active agents:", error);
    return []; // Return empty array on error
  }
};

// Helper function to process user results into agent objects using AMI data
function processUserResultsWithAMI(users, extensionStatuses) {
  return users.map((user) => {
    const extension = user.extension;

    // Handle both array and object formats for backward compatibility
    let amiStatus = null;
    if (Array.isArray(extensionStatuses)) {
      // New format: array of agent objects
      amiStatus =
        extensionStatuses.find((agent) => agent.extension === extension) ||
        null;
    } else if (extensionStatuses && typeof extensionStatuses === "object") {
      // Old format: object with extension keys
      amiStatus = extensionStatuses[extension] || null;
    }

    // Use AMI status as the authoritative source
    const isActive = amiStatus?.isRegistered || false;
    const status = amiStatus?.status || "Offline";
    const lastSeen = amiStatus?.lastSeen || null;

    // Determine if this extension is currently on a call by scanning active calls
    const currentCall = findActiveCallForExtension(extension);

    // Get display name from user data with fallbacks
    const displayName =
      user.displayName ||
      user.fullName ||
      (user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : null) ||
      user.name || // Some schemas use 'name' directly
      user.username ||
      `Agent ${extension}`;

    return {
      id: user.id,
      name: displayName,
      extension: extension,
      status: isActive ? (currentCall ? "On Call" : status) : "Offline",
      callsDone: user.callsDone || 0,
      queues: [], // Empty array for now
      lastSeen: lastSeen,
      currentCall: currentCall
        ? {
          uniqueId: currentCall.uniqueId || currentCall.uniqueid,
          callerId:
            currentCall.callerId ||
            currentCall.callerid ||
            currentCall.src ||
            null,
          startTime: currentCall.startTime,
          duration: currentCall.duration || 0,
        }
        : null,
      paused: user.paused || false,
      // Add AMI-specific data for debugging
      amiStatus: amiStatus?.rawStatus || null,
      contactUri: amiStatus?.contactUri || null,
      expirationTime: amiStatus?.expirationTime || null,
    };
  });
}

// Handle QueueMember event
const handleQueueMember = async (event) => {
  const queueName = event.Queue || event.queue;
  const memberName =
    event.Name || event.name || event.Interface || event.interface;

  if (!queueName || !memberName) {
    log.error(
      "Received QueueMember event without queue name or member name:",
      event
    );
    return;
  }

  // log.info(`Queue member updated: ${queueName} - ${memberName}`, {
  //   status: event.Status || event.status,
  //   paused: event.Paused || event.paused,
  //   callsTaken: event.CallsTaken || event.callstaken,
  //   lastCall: event.LastCall || event.lastcall,
  // });

  // Get or create queue stats
  const queueStats = queueStatsMap.get(queueName) || {
    name: queueName,
    members: [],
  };

  // Initialize members array if it doesn't exist
  if (!queueStats.members) {
    queueStats.members = [];
  }

  // Find existing member or create new one
  const memberIndex = queueStats.members.findIndex(
    (m) => m.name === memberName || m.interface === memberName
  );

  const memberStatus = event.Status || event.status;
  const statusText =
    memberStatus === "1"
      ? "Not in use"
      : memberStatus === "2"
        ? "In use"
        : memberStatus === "3"
          ? "Busy"
          : memberStatus === "6"
            ? "Unavailable"
            : "Unknown";

  const memberData = {
    name: memberName,
    interface: event.Interface || event.interface,
    status: statusText,
    statusCode: memberStatus,
    paused: (event.Paused || event.paused) === "1",
    callsTaken: Number(event.CallsTaken || event.callstaken) || 0,
    lastCall: event.LastCall || event.lastcall,
  };

  if (memberIndex >= 0) {
    // Update existing member
    queueStats.members[memberIndex] = {
      ...queueStats.members[memberIndex],
      ...memberData,
    };
  } else {
    // Add new member
    queueStats.members.push(memberData);
  }

  // Update the queue stats map
  queueStatsMap.set(queueName, queueStats);

  // Broadcast updated stats immediately
  broadcastStats();
};

// Handle CDR events for call history
const handleCdr = async (event) => {
  try {
    // log.info("CDR event received", {
    //   uniqueid: event.uniqueid,
    //   src: event.src,
    //   dst: event.dst,
    //   disposition: event.disposition,
    //   duration: event.duration,
    // });

    // Format the CDR record
    const formattedRecord = formatCdrRecord(event, event.src);

    // Broadcast to all connected clients for real-time updates
    socketService.broadcast("call_update", formattedRecord);

    // Find users with this source or destination extension
    try {
      const srcUser = await UserModel.findOne({
        where: { extension: event.src },
      });
      const dstUser = await UserModel.findOne({
        where: { extension: event.dst },
      });

      // Broadcast to specific users
      if (srcUser) {
        // log.info(
        //   `Emitting call update to source user ${srcUser.id} (${event.src})`
        // );
        socketService.emitToUser(srcUser.id, "call_update", formattedRecord);
      }

      if (dstUser && dstUser.id !== srcUser?.id) {
        // log.info(
        //   `Emitting call update to destination user ${dstUser.id} (${event.dst})`
        // );
        socketService.emitToUser(dstUser.id, "call_update", formattedRecord);
      }
    } catch (userError) {
      log.error("Error finding users for call update", userError);
    }

    // Also save to database for persistence
    try {
      // Determine call type based on phone number patterns
      // External numbers are typically 7+ digits, internal extensions are 3-4 digits
      const src = (event.src || "").toString().trim();
      const dst = (event.dst || "").toString().trim();

      // Clean numbers (remove non-digits for length check)
      const srcClean = src.replace(/\D/g, '');
      const dstClean = dst.replace(/\D/g, '');

      const srcIsExternal = srcClean.length >= 7;
      const dstIsExternal = dstClean.length >= 7;
      const srcIsExtension = srcClean.length >= 3 && srcClean.length <= 4;
      const dstIsExtension = dstClean.length >= 3 && dstClean.length <= 4;

      // Debug logging for direction detection
      // console.log(`Direction check: src=${src}(${srcClean}), dst=${dst}(${dstClean})`);

      // Inbound: external src calling internal dst
      // Outbound: internal src calling external dst
      let callType = "inbound"; // default
      if (srcIsExternal && dstIsExtension) {
        callType = "inbound";
      } else if (srcIsExtension && dstIsExternal) {
        callType = "outbound";
      } else if (srcIsExtension && dstIsExtension) {
        // Internal call - use dcontext to determine from whose perspective
        callType = "internal";
      }

      await CDR.create({
        uniqueid: event.uniqueid,
        calldate: new Date(),
        src: src, // save original
        dst: dst, // save original
        disposition: event.disposition,
        duration: event.duration || 0,
        billsec: event.billsec || 0,
        recordingfile: event.recordingfile || "",
        userfield: event.userfield || "",
        cdr_json: JSON.stringify(event),
        type: callType,
      });

      // Emit socket event
      socketService.emitCallHistoryUpdate(formattedRecord);
    } catch (dbError) {
      log.error("Error saving CDR to database", dbError);
    }
  } catch (error) {
    log.error("Error handling CDR event", error);
  }
};

// Function to get queue statistics
const getQueueStats = () => {
  return Array.from(queueStatsMap.values());
};

// Initialize the service
const initialize = () => {
  // log.info("Initializing call monitoring service");
  // Clear any existing active calls
  activeCallsMap.clear();
  queueCallsMap.clear();
  queueStatsMap.clear();

  // Set up AMI event listeners
  amiService.on("Newchannel", handleNewCall);
  amiService.on("Hangup", handleHangup);
  amiService.on("Bridge", handleBridge);
  amiService.on("BridgeEnter", handleBridgeEnter);
  amiService.on("Newstate", handleNewstate);
  amiService.on("QueueCallerJoin", handleQueueCallerJoin);
  amiService.on("QueueCallerLeave", handleQueueCallerLeave);
  amiService.on("queue:caller:abandon", handleQueueCallerAbandon);
  amiService.on("queue:agent:connect", handleAgentConnect);
  amiService.on("queue:agent:complete", handleAgentComplete);
  amiService.on("QueueMember", handleQueueMember);
  amiService.on("QueueParams", handleQueueParams);
  amiService.on("QueueSummary", handleQueueSummary);

  // Also register for the wrapped events from eventBus
  amiService.on("call:new", handleNewCall);
  amiService.on("call:hangup", handleHangup);
  amiService.on("call:bridged", handleBridge);
  amiService.on("call:bridge:enter", handleBridgeEnter);
  amiService.on("call:state", handleNewstate);
  amiService.on("queue:caller:join", handleQueueCallerJoin);
  amiService.on("queue:caller:leave", handleQueueCallerLeave);
  amiService.on("queue:update", handleQueueParams);
  amiService.on("queue:member:update", handleQueueMember);
  // Extension status/contact changes should prompt a stats refresh for dashboards
  amiService.on("extension:status", () => {
    broadcastStats();
  });
  amiService.on("extension:contactStatus", () => {
    broadcastStats();
  });

  // Transfer event handlers
  amiService.on("call:ami_transfer_complete", (event) => {
    const { channel, targetExtension, transferType } = event;
    console.log(
      `AMI Transfer complete: ${channel} to ${targetExtension} (${transferType})`
    );

    // Find the call by channel and update its status
    const call = Array.from(activeCallsMap.values()).find(
      (c) => c.channel === channel
    );
    if (call) {
      call.status = "transferred";
      call.transferTarget = targetExtension;
      call.transferType = transferType;
      call.transferTime = new Date().toISOString();
    }

    broadcastStats();
  });

  amiService.on("call:ami_transfer_failed", (event) => {
    const { channel, targetExtension, error } = event;
    console.error(
      `AMI Transfer failed: ${channel} to ${targetExtension} - ${error}`
    );
    broadcastStats();
  });

  amiService.on("call:ami_attended_transfer_started", (event) => {
    const { channel, targetExtension } = event;
    console.log(
      `AMI Attended transfer started: ${channel} to ${targetExtension}`
    );

    // Find the call by channel and update its status
    const call = Array.from(activeCallsMap.values()).find(
      (c) => c.channel === channel
    );
    if (call) {
      call.status = "consulting";
      call.transferTarget = targetExtension;
      call.transferType = "attended";
    }

    broadcastStats();
  });

  // Make sure CDR event listener is registered
  amiService.on("Cdr", handleCdr);

  // Log that we've set up the CDR handler
  // log.info("CDR event handler registered");

  // Request initial queue stats
  requestQueueStats();

  // Set up periodic stats broadcast
  const statsInterval = setInterval(async () => {
    try {
      await broadcastStats();
    } catch (error) {
      log.error("Error broadcasting stats", error);
    }
  }, 10000); // Every 10 seconds

  // Set up periodic queue stats request
  const queueStatsInterval = setInterval(() => {
    requestQueueStats();
  }, 30000); // Every 30 seconds

  // Periodic stale-call sweeper: remove entries that haven't updated recently
  const staleSweepInterval = setInterval(() => {
    const now = Date.now();
    const STALE_MS = 2 * 60 * 1000; // 2 minutes
    let removed = 0;
    for (const [id, call] of activeCallsMap.entries()) {
      const last =
        call.lastUpdate || new Date(call.startTime || call.start).getTime();
      if (now - last > STALE_MS) {
        activeCallsMap.delete(id);
        queueCallsMap.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      broadcastStats();
    }
  }, 60000);

  // Return cleanup function
  return () => {
    clearInterval(statsInterval);
    clearInterval(queueStatsInterval);
    clearInterval(staleSweepInterval);
    activeCallsMap.clear();
    queueCallsMap.clear();
    queueStatsMap.clear();

    // Remove event listeners
    amiService.off("Newchannel", handleNewCall);
    amiService.off("Hangup", handleHangup);
    amiService.off("Bridge", handleBridge);
    amiService.off("BridgeEnter", handleBridgeEnter);
    amiService.off("Newstate", handleNewstate);
    amiService.off("QueueCallerJoin", handleQueueCallerJoin);
    amiService.off("QueueCallerLeave", handleQueueCallerLeave);
    amiService.off("queue:caller:abandon", handleQueueCallerAbandon);
    amiService.off("queue:agent:connect", handleAgentConnect);
    amiService.off("queue:agent:complete", handleAgentComplete);
    amiService.off("QueueMember", handleQueueMember);
    amiService.off("QueueParams", handleQueueParams);
    amiService.off("QueueSummary", handleQueueSummary);
    amiService.off("Cdr", handleCdr);

    // Remove transfer event listeners
    amiService.off("call:ami_transfer_complete");
    amiService.off("call:ami_transfer_failed");
    amiService.off("call:ami_attended_transfer_started");
  };
};

// Cleanup function to remove event listeners
const cleanup = () => {
  // log.info("Cleaning up call monitoring service...");

  // Remove AMI event handlers for direct events
  amiService.off("Newchannel", handleNewCall);
  amiService.off("Hangup", handleHangup);
  amiService.off("Bridge", handleBridge);
  amiService.off("BridgeEnter", handleBridgeEnter);
  amiService.off("Newstate", handleNewstate);
  amiService.off("QueueCallerJoin", handleQueueCallerJoin);
  amiService.off("QueueCallerLeave", handleQueueCallerLeave);
  amiService.off("QueueParams", handleQueueParams);
  amiService.off("QueueSummary", handleQueueSummary);
  amiService.off("QueueMember", handleQueueMember);
  amiService.off("Cdr", handleCdr); // Remove CDR event listener

  // Also remove wrapped event handlers
  amiService.off("call:new", handleNewCall);
  amiService.off("call:hangup", handleHangup);
  amiService.off("call:bridged", handleBridge);
  amiService.off("call:bridge:enter", handleBridgeEnter);
  amiService.off("call:state", handleNewstate);
  amiService.off("queue:caller:join", handleQueueCallerJoin);
  amiService.off("queue:caller:leave", handleQueueCallerLeave);
  amiService.off("queue:update", handleQueueParams);
  amiService.off("queue:member:update", handleQueueMember);

  // Clear active calls map
  activeCallsMap.clear();
  queueCallsMap.clear();
  queueStatsMap.clear();

  // log.success("Call monitoring service cleanup completed");
};

// Export the service
export const callMonitoringService = {
  initialize,
  cleanup,
  monitorCalls: initialize,
  broadcastStats,
  getActiveCalls,
  getTotalCallsCount,
  getAbandonedCallsCount,
  requestQueueStats,
  handleCdr,
  getActiveAgents,
  getCallVolumeByHour,
  getQueueStats,
};

export default callMonitoringService;
