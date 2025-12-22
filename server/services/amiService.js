import { getAmiClient } from "../config/amiClient.js";
import { EventEmitter } from "events";
import chalk from "chalk";
import { PJSIPContact } from "../models/pjsipModel.js";
import sequelize from "../config/sequelize.js";

const createAmiService = () => {
  const state = {
    client: getAmiClient(),
    connected: false,
    connectionAttempts: 0,
    // Remove local state tracking - use database as single source of truth
    extensionStatusCache: new Map(), // Cache for performance, but database is authoritative
    lastCacheUpdate: null,
    cacheValidityMs: 5000, // Cache valid for 5 seconds
  };

  const emitter = new EventEmitter();

  // 📞 CALL EVENT HANDLERS
  const handleCallEvents = {
    Newchannel: (event) => emitEvent("call:new", event),
    Bridge: (event) => emitEvent("call:bridged", event),
    Hangup: (event) => emitEvent("call:hangup", event),
    Newstate: (event) => emitEvent("call:state", event),
    BridgeEnter: (event) => emitEvent("call:bridge:enter", event),
    BridgeLeave: (event) => emitEvent("call:bridge:leave", event),
  };

  // ☎️ QUEUE EVENT HANDLERS
  const handleQueueEvents = {
    QueueParams: (event) => emitEvent("queue:update", event),
    QueueCallerJoin: (event) => emitEvent("queue:caller:join", event),
    QueueCallerLeave: (event) => emitEvent("queue:caller:leave", event),
    QueueMemberStatus: (event) => emitEvent("queue:member:update", event),
    QueueCallerAbandon: (event) => emitEvent("queue:caller:abandon", event),
    AgentConnect: (event) => emitEvent("queue:agent:connect", event),
    AgentComplete: (event) => emitEvent("queue:agent:complete", event),
  };

  // 📡 EXTENSION EVENT HANDLERS - ENHANCED FOR PJSIP
  const handleExtensionEvents = {
    // PJSIP Contact Status - This is the PRIMARY source of truth
    ContactStatus: async (event) => {
      try {
        const aor = event.AOR || event.aor || event.Endpoint || event.endpoint;
        const status = event.ContactStatus || event.Status || event.status;
        const contactUri = event.Contact || event.contact;
        const now = new Date().toISOString();

        if (aor) {
          console.log(chalk.blue(`[AMI] ContactStatus: ${aor} -> ${status}`));

          // Update the ps_contacts table immediately
          await updateContactStatus(aor, status, contactUri, now);

          // Emit event for real-time updates
          emitEvent("extension:contactStatus", {
            extension: aor,
            status: status,
            contactUri: contactUri,
            timestamp: now,
            online: isStatusOnline(status),
          });

          // Trigger immediate stats broadcast
          emitEvent("extension:availability_changed", {
            extension: aor,
            available: isStatusOnline(status),
            timestamp: now,
          });
        }
      } catch (error) {
        console.error("[AMI] Error handling ContactStatus:", error);
      }
    },

    // PJSIP Endpoint List - Secondary source for endpoint configuration
    EndpointList: async (event) => {
      try {
        const extension = event.ObjectName;
        const deviceState = event.DeviceState;
        const now = new Date().toISOString();

        if (extension) {
          console.log(
            chalk.blue(`[AMI] EndpointList: ${extension} -> ${deviceState}`)
          );

          // Update endpoint status in database
          await updateEndpointStatus(extension, deviceState, now);

          emitEvent("extension:endpointStatus", {
            extension: extension,
            deviceState: deviceState,
            timestamp: now,
          });
        }
      } catch (error) {
        console.error("[AMI] Error handling EndpointList:", error);
      }
    },

    // Legacy SIP events - Keep for compatibility
    PeerStatus: (event) => {
      try {
        // Debug: log raw AMI PeerStatus payload for field validation across versions
        try {
          console.log(chalk.blue("[AMI] PeerStatus raw:"), event);
        } catch (e) {
          // ignore console errors
        }

        const peerRaw =
          event.Peer || event.peer || event.Endpoint || event.ObjectName || "";
        let extension = null;
        if (typeof peerRaw === "string" && peerRaw.length > 0) {
          extension = peerRaw.includes("/") ? peerRaw.split("/")[1] : peerRaw;
        }

        // Some AMI stacks send 'Peer' empty; try PJSIP fields
        if (
          !extension &&
          typeof event.ChannelType === "string" &&
          event.ChannelType.toUpperCase() === "PJSIP"
        ) {
          const target = event.Address || event.Channel || "";
          if (typeof target === "string" && target.includes("/")) {
            extension = target.split("/")[1]?.split("-")[0];
          }
        }

        emitEvent("extension:peerStatus", {
          ...event,
          extension: extension || null,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("[AMI] PeerStatus handling error:", err?.message || err);
        emitEvent("extension:peerStatus", {
          ...event,
          extension: null,
          timestamp: new Date().toISOString(),
        });
      }
    },

    Registry: (event) => {
      const extension = event.Username;
      if (extension) {
        emitEvent("extension:registration", {
          ...event,
          timestamp: new Date().toISOString(),
        });
      }
    },
  };

  // 🔄 DATABASE OPERATIONS - SINGLE SOURCE OF TRUTH

  /**
   * Update in-memory cache only (read-only mode for ps_contacts)
   * Asterisk is the single source of truth for ps_contacts.
   */
  async function updateContactStatus(aor, status, contactUri) {
    try {
      const nowSeconds = Math.floor(Date.now() / 1000);

      const hasValidRegistration =
        !!contactUri && contactUri !== `sip:${aor}@offline`;
      const isQualified = isStatusOnline(status);

      const cacheEntry = {
        isRegistered: hasValidRegistration,
        status: hasValidRegistration ? "Registered" : "Offline",
        online: hasValidRegistration,
        amiStatus: hasValidRegistration
          ? isQualified
            ? "Reachable"
            : "NonQualified"
          : "Offline",
        lastSeen: nowSeconds,
        contactUri: contactUri || null,
        rawStatus: status,
        expirationTime: null,
      };

      state.extensionStatusCache.set(aor, cacheEntry);
      state.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error(`[AMI] Error caching contact status for ${aor}:`, error);
    }
  }

  /**
   * Manually set contact status to offline (for logout scenarios)
   * This ensures ps_contacts table reflects actual session state
   */
  async function setContactOffline(extension) {
    try {
      console.log(
        chalk.yellow(
          `[AMI] setContactOffline skipped DB write (read-only mode). Using cache.`
        )
      );

      // Update cache only
      state.extensionStatusCache.set(extension, {
        isRegistered: false,
        status: "Offline",
        online: false,
        amiStatus: "Offline",
        lastSeen: Math.floor(Date.now() / 1000),
        contactUri: `sip:${extension}@offline`,
        rawStatus: "Expired",
        expirationTime: null,
      });
      state.lastCacheUpdate = Date.now();

      emitEvent("extension:contactStatus", {
        extension,
        status: "Expired",
        contactUri: `sip:${extension}@offline`,
        timestamp: new Date().toISOString(),
        online: false,
      });
      emitEvent("extension:availability_changed", {
        extension,
        available: false,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error(`[AMI] Error caching ${extension} offline:`, error);
      return false;
    }
  }

  /**
   * Manually set contact status to online (for login scenarios)
   * This ensures ps_contacts table reflects actual session state
   */
  async function setContactOnline(extension, contactUri = null) {
    try {
      console.log(
        chalk.green(
          `[AMI] setContactOnline skipped DB write (read-only mode). Using cache.`
        )
      );

      const nowSeconds = Math.floor(Date.now() / 1000);
      const uri =
        contactUri ||
        `sip:${extension}@${process.env.ASTERISK_HOST || "localhost"}`;
      const isQualified = true;

      // Update cache only
      state.extensionStatusCache.set(extension, {
        isRegistered: true,
        status: "Registered",
        online: true,
        amiStatus: isQualified ? "Reachable" : "NonQualified",
        lastSeen: nowSeconds,
        contactUri: uri,
        rawStatus: "Reachable",
        expirationTime: null,
      });
      state.lastCacheUpdate = Date.now();

      emitEvent("extension:contactStatus", {
        extension,
        status: "Reachable",
        contactUri: uri,
        timestamp: new Date().toISOString(),
        online: true,
      });
      emitEvent("extension:availability_changed", {
        extension,
        available: true,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error(`[AMI] Error caching ${extension} online:`, error);
      return false;
    }
  }

  /**
   * Update endpoint status in ps_endpoints table
   */
  async function updateEndpointStatus(extension, deviceState) {
    try {
      // This would update the ps_endpoints table if needed
      // For now, we'll focus on ps_contacts as the primary source
      console.log(`[AMI] Endpoint ${extension} device state: ${deviceState}`);
    } catch (error) {
      console.error(
        `[AMI] Error updating endpoint status for ${extension}:`,
        error
      );
    }
  }

  /**
   * Check if a status indicates the extension has been qualified/verified by Asterisk
   * Note: This is different from registration status. An extension can be registered
   * (has valid contactUri) but not qualified (NonQualified status) and still make/receive calls.
   *
   * @param {string} status - The raw status from Asterisk
   * @returns {boolean} True if the status indicates the endpoint has been qualified
   */
  function isStatusOnline(status) {
    if (!status) return false;

    const statusLower = status.toLowerCase();
    return (
      statusLower.includes("reachable") ||
      statusLower.includes("created") ||
      statusLower.includes("ok") ||
      statusLower.includes("available") ||
      statusLower.includes("online")
    );
    // Note: "NonQualified" is intentionally not included here
    // as it indicates the endpoint hasn't been checked, not that it's offline
  }

  /**
   * Get extension status from database (authoritative source)
   */
  async function getExtensionStatusFromDatabase(extension) {
    try {
      // Check if ps_contacts table exists first
      const tableExists = await sequelize
        .getQueryInterface()
        .showAllTables()
        .then((tables) => tables.includes("ps_contacts"));

      if (!tableExists) {
        console.log(
          chalk.yellow(
            "[AMI] ps_contacts table does not exist yet. Run migration first."
          )
        );
        return {
          isRegistered: false,
          status: "Offline",
          lastSeen: null,
          contactUri: null,
          rawStatus: null,
          expirationTime: null,
        };
      }

      // Find the most recent contact record for this extension
      const contact = await PJSIPContact.findOne({
        where: { endpoint: extension },
        order: [["id", "DESC"]], // Use id instead of updated_at since timestamps are disabled
      });

      if (!contact) {
        return {
          isRegistered: false,
          status: "Offline",
          lastSeen: null,
          contactUri: null,
          rawStatus: null,
          expirationTime: null,
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const isExpired =
        contact.expiration_time && contact.expiration_time < now;
      const isOnline = !isExpired && isStatusOnline(contact.status);

      return {
        isRegistered: isOnline,
        status: isOnline ? "Registered" : "Offline",
        lastSeen: contact.last_seen || null,
        contactUri: contact.uri,
        rawStatus: contact.status,
        expirationTime: contact.expiration_time,
      };
    } catch (error) {
      console.error(
        `[AMI] Error getting extension status from database for ${extension}:`,
        error
      );
      return {
        isRegistered: false,
        status: "Error",
        lastSeen: null,
        contactUri: null,
        rawStatus: null,
        expirationTime: null,
      };
    }
  }

  /**
   * Get all extension statuses from database (authoritative source)
   */
  async function getAllExtensionStatusesFromDatabase() {
    try {
      // Check if ps_contacts table exists first
      const tableExists = await sequelize
        .getQueryInterface()
        .showAllTables()
        .then((tables) => tables.includes("ps_contacts"));

      if (!tableExists) {
        console.log(
          chalk.yellow(
            "[AMI] ps_contacts table does not exist yet. Run migration first."
          )
        );
        return [];
      }

      // Check cache validity
      const now = Date.now();
      if (
        state.lastCacheUpdate &&
        now - state.lastCacheUpdate < state.cacheValidityMs &&
        state.extensionStatusCache.size > 0
      ) {
        // Convert cached object back to array format for consistency
        const cachedObject = Object.fromEntries(state.extensionStatusCache);
        return Object.entries(cachedObject).map(([extension, data]) => ({
          extension,
          ...data,
        }));
      }

      // Query all contacts from database - get the latest contact per endpoint
      // Use a simpler approach to avoid GROUP BY issues
      const allContacts = await PJSIPContact.findAll({
        attributes: [
          "id",
          "endpoint",
          "uri",
          "status",
          "expiration_time",
          "contact",
          "user_agent",
        ],
        order: [["id", "DESC"]], // Use id instead of updated_at since timestamps are disabled
      });

      // Group by endpoint and get the latest contact per endpoint
      const contactsMap = new Map();
      for (const contact of allContacts) {
        if (contact.endpoint && !contactsMap.has(contact.endpoint)) {
          contactsMap.set(contact.endpoint, contact);
        }
      }
      const contacts = Array.from(contactsMap.values());

      const result = {};
      const nowSeconds = Math.floor(Date.now() / 1000);

      for (const contact of contacts) {
        const extension = contact.endpoint;
        if (!extension) {
          continue;
        }

        const isExpired =
          contact.expiration_time && contact.expiration_time < nowSeconds;

        // Consider extension online if it has a valid URI and hasn't expired
        // This is the correct logic - registration status is what matters
        const hasValidRegistration =
          !!contact.uri &&
          contact.uri !== "sip:${extension}@offline" &&
          !isExpired;

        // Determine actual reachability status
        const isQualified = isStatusOnline(contact.status);

        // Extension is online if it has valid registration, regardless of qualification
        const isOnline = hasValidRegistration;

        result[extension] = {
          isRegistered: isOnline,
          status: isOnline ? "Registered" : "Offline",
          online: isOnline,
          amiStatus: isOnline
            ? isQualified
              ? "Reachable"
              : "NonQualified"
            : "Offline",
          lastSeen: contact.last_seen || null,
          contactUri: contact.uri,
          rawStatus: contact.status,
          expirationTime: contact.expiration_time,
        };
      }

      // console.log(`[AMI] Final result object:`, result);

      // Update cache
      state.extensionStatusCache.clear();
      for (const [key, value] of Object.entries(result)) {
        state.extensionStatusCache.set(key, value);
      }
      state.lastCacheUpdate = now;

      // Convert object to array format for consistency with frontend expectations
      const resultArray = Object.entries(result).map(([extension, data]) => ({
        extension,
        ...data,
      }));

      // console.log(`[AMI] Final result array:`, resultArray);
      return resultArray;
    } catch (error) {
      console.error(
        "[AMI] Error getting all extension statuses from database:",
        error
      );
      return [];
    }
  }

  /**
   * Initialize extension statuses by querying current PJSIP state
   */
  async function initializeExtensionStatus() {
    try {
      console.log(
        chalk.blue("[AMI] Initializing extension statuses from PJSIP...")
      );

      // Get current PJSIP endpoints and contacts
      const [endpointsResult, contactsResult] = await Promise.all([
        state.client.sendAction({ Action: "PJSIPShowEndpoints" }),
        state.client.sendAction({ Action: "PJSIPShowContacts" }),
      ]);

      const now = new Date().toISOString();

      // Process endpoints
      if (endpointsResult && endpointsResult.events) {
        for (const event of endpointsResult.events) {
          if (event.Event === "EndpointList") {
            const extension = event.ObjectName;
            const deviceState = event.DeviceState;

            if (extension) {
              await updateEndpointStatus(extension, deviceState, now);
            }
          }
        }
      }

      // Process contacts - This is the primary source
      if (contactsResult && contactsResult.events) {
        for (const event of contactsResult.events) {
          if (
            event.Event === "ContactStatusDetail" ||
            event.Event === "ContactStatus"
          ) {
            const aor = event.AOR || event.ObjectName || event.Endpoint;
            const status =
              event.Status || event.ContactStatus || event.StatusDesc;
            const contactUri = event.Contact || event.URI;

            if (aor) {
              await updateContactStatus(aor, status, contactUri, now);
            }
          }
        }
      }

      console.log(
        chalk.green("[AMI] Extension statuses initialized from PJSIP")
      );
    } catch (error) {
      console.error("[AMI] Error initializing extension status:", error);
    }
  }

  /**
   * Force refresh of extension statuses
   */
  async function refreshExtensionStatuses() {
    try {
      console.log(chalk.blue("[AMI] Forcing refresh of extension statuses..."));

      // Clear cache
      state.extensionStatusCache.clear();
      state.lastCacheUpdate = null;

      // Re-initialize from PJSIP
      await initializeExtensionStatus();

      // Emit refresh event
      const statuses = await getAllExtensionStatusesFromDatabase();
      emitEvent("extension:statuses_refreshed", {
        timestamp: new Date().toISOString(),
        count: Array.isArray(statuses)
          ? statuses.length
          : Object.keys(statuses).length,
      });
    } catch (error) {
      console.error("[AMI] Error refreshing extension statuses:", error);
    }
  }

  // 🔄 TRANSFER FUNCTIONS (use blindTransfer/attendedTransfer below)

  const getChannelForExtension = async (extension) => {
    try {
      // Use CoreShowChannels to find the ACTIVE channel that belongs to this extension
      const response = await state.client.sendAction({
        Action: "CoreShowChannels",
      });

      // Response contains Events array with CoreShowChannel events
      if (response && response.events && Array.isArray(response.events)) {
        // Prefer PJSIP channels with matching CallerIDNum
        const candidate = response.events.find(
          (e) =>
            e.Event === "CoreShowChannel" &&
            (e.Channel?.startsWith("PJSIP/") ||
              e.Channel?.startsWith("SIP/")) &&
            (e.CallerIDNum === String(extension) ||
              e.CallerIDName === String(extension) ||
              e.Channel?.includes(`/${extension}-`))
        );

        if (candidate) {
          return {
            channel: candidate.Channel,
            uniqueId: candidate.Uniqueid,
            state: candidate.ChannelState,
          };
        }
      }

      // Fallback: attempt to guess the latest channel name pattern
      const fallbackChannel = `PJSIP/${extension}`;
      return { channel: fallbackChannel, uniqueId: null };
    } catch (error) {
      console.error(
        `[AMI] Error getting channel for extension ${extension}:`,
        error
      );
      return null;
    }
  };

  // 🔌 CONNECTION MANAGEMENT
  const setupEventListeners = () => {
    if (!state.client) return;

    state.client.on("connect", () => {
      console.log(chalk.green("[AMI] Connected to Asterisk AMI"));
      state.connected = true;
      emitter.emit("connected");

      // Initialize extension statuses immediately after connection
      initializeExtensionStatus();
    });

    state.client.on("event", (event) => {
      if (handleCallEvents[event.Event]) handleCallEvents[event.Event](event);
      if (handleQueueEvents[event.Event]) handleQueueEvents[event.Event](event);
      if (handleExtensionEvents[event.Event])
        handleExtensionEvents[event.Event](event);
    });

    state.client.on("disconnect", () => {
      console.warn(chalk.yellow("[AMI] Connection lost, reconnecting..."));
      state.connected = false;
      emitter.emit("disconnected");
    });
  };

  function emitEvent(eventName, event) {
    emitter.emit(eventName, event);
  }

  return {
    connect: async () => {
      if (state.connected) {
        console.log(chalk.yellow("[AMI] Already connected"));
        return true;
      }

      try {
        await state.client.connect();
        setupEventListeners();
        state.connected = true;
        return true;
      } catch (error) {
        console.error("[AMI] Connection error:", error.message);
        throw error;
      }
    },

    disconnect: async () => {
      if (state.client) {
        await state.client.disconnect();
      }
      state.connected = false;
      state.extensionStatusCache.clear();
      state.lastCacheUpdate = null;
    },

    getState: () => ({
      connected: state.connected,
      cacheSize: state.extensionStatusCache.size,
      lastCacheUpdate: state.lastCacheUpdate,
    }),

    // 🔑 CORE FUNCTIONS - SINGLE SOURCE OF TRUTH

    /**
     * Get extension status from database (authoritative source)
     */
    getExtensionStatus: async (extension) => {
      return await getExtensionStatusFromDatabase(extension);
    },

    /**
     * Get all extension statuses from database (authoritative source)
     */
    getAllExtensionStatuses: async () => {
      return await getAllExtensionStatusesFromDatabase();
    },

    /**
     * Force refresh of all extension statuses
     */
    refreshExtensionStatuses,

    /**
     * Initialize extension statuses from PJSIP
     */
    initializeExtensionStatus,

    /**
     * Manually set contact status to offline (for logout scenarios)
     */
    setContactOffline,

    /**
     * Manually set contact status to online (for login scenarios)
     */
    setContactOnline,

    // 🔄 TRANSFER FUNCTIONS
    getChannelForExtension,

    // 📞 CALL MANAGEMENT FUNCTIONS
    originateCall: async (
      fromExtension,
      toNumber,
      callerId = null,
      options = {}
    ) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Originating call from ${fromExtension} to ${toNumber}`
          )
        );

        const action = {
          Action: "Originate",
          Channel: `PJSIP/${fromExtension}`,
          Context: "from-internal",
          Exten: toNumber,
          Priority: 1,
          Timeout: options.timeout || 30000,
          Callerid: callerId || `${fromExtension} <${fromExtension}>`,
          Async: "yes",
        };

        const result = await state.client.sendAction(action);
        console.log(chalk.green(`[AMI] Call originated successfully:`, result));
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Call origination failed:`, error.message)
        );
        throw error;
      }
    },

    blindTransfer: async (channel, targetExtension) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Blind transfer from ${channel} to ${targetExtension}`
          )
        );

        // Attempt native BlindTransfer first
        const blind = {
          Action: "BlindTransfer",
          Channel: channel,
          Context: "from-internal",
          Exten: targetExtension,
          Priority: 1,
        };

        let result = await state.client.sendAction(blind);

        const failed =
          !result || String(result.Response || "").toLowerCase() !== "success";
        const channelMissing = /channel\s+specified\s+does\s+not\s+exist/i.test(
          String(result?.Message || "")
        );

        if (failed || channelMissing) {
          console.warn(
            chalk.yellow(
              `[AMI] BlindTransfer failed (${
                result?.Message || "unknown"
              }). Falling back to Redirect...`
            )
          );

          const redirect = {
            Action: "Redirect",
            Channel: channel,
            Context: "from-internal",
            Exten: targetExtension,
            Priority: 1,
          };
          result = await state.client.sendAction(redirect);
        }

        console.log(
          chalk.green(`[AMI] Blind transfer initiated successfully:`, result)
        );
        return result;
      } catch (error) {
        console.error(chalk.red(`[AMI] Blind transfer failed:`, error.message));
        throw error;
      }
    },

    attendedTransfer: async (channel, targetExtension) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Attended transfer from ${channel} to ${targetExtension}`
          )
        );

        const action = {
          Action: "Atxfer",
          Channel: channel,
          Context: "from-internal",
          Exten: targetExtension,
          Priority: 1,
        };

        const result = await state.client.sendAction(action);
        console.log(
          chalk.green(`[AMI] Attended transfer initiated successfully:`, result)
        );
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Attended transfer failed:`, error.message)
        );
        throw error;
      }
    },

    hangupCall: async (channel, cause = 16) => {
      try {
        console.log(
          chalk.blue(`[AMI] Hanging up call on ${channel} with cause ${cause}`)
        );

        const result = await state.client.sendAction({
          Action: "Hangup",
          Channel: channel,
          Cause: cause,
        });

        console.log(chalk.green(`[AMI] Call hung up successfully:`, result));
        return result;
      } catch (error) {
        console.error(chalk.red(`[AMI] Call hangup failed:`, error.message));
        throw error;
      }
    },

    redirectCall: async (channel, targetExtension) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Redirecting call from ${channel} to ${targetExtension}`
          )
        );

        const action = {
          Action: "Redirect",
          Channel: channel,
          Context: "from-internal",
          Exten: targetExtension,
          Priority: 1,
        };

        const result = await state.client.sendAction(action);
        console.log(chalk.green(`[AMI] Call redirected successfully:`, result));
        return result;
      } catch (error) {
        console.error(chalk.red(`[AMI] Call redirect failed:`, error.message));
        throw error;
      }
    },

    getActiveChannels: async () => {
      try {
        console.log(chalk.blue(`[AMI] Getting active channels`));

        const result = await state.client.sendAction({
          Action: "CoreShowChannels",
        });

        console.log(
          chalk.green(
            `[AMI] Retrieved ${result.events?.length || 0} active channels`
          )
        );
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to get active channels:`, error.message)
        );
        throw error;
      }
    },

    getChannelStatus: async (channel) => {
      try {
        console.log(chalk.blue(`[AMI] Getting status for channel ${channel}`));

        const result = await state.client.sendAction({
          Action: "Status",
          Channel: channel,
        });

        console.log(chalk.green(`[AMI] Channel status retrieved:`, result));
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to get channel status:`, error.message)
        );
        throw error;
      }
    },

    startCallRecording: async (channel, options = {}) => {
      try {
        console.log(
          chalk.blue(`[AMI] Starting recording for channel ${channel}`)
        );

        const filename =
          options.filename ||
          `/var/spool/asterisk/monitor/call_${Date.now()}.wav`;
        const recordingOptions = options.options || "ab";

        const action = {
          Action: "MixMonitor",
          File: filename,
          Options: recordingOptions,
          Channel: channel,
        };

        const result = await state.client.sendAction(action);
        console.log(chalk.green(`[AMI] Call recording started:`, result));
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to start recording:`, error.message)
        );
        throw error;
      }
    },

    stopCallRecording: async (channel) => {
      try {
        console.log(
          chalk.blue(`[AMI] Stopping recording for channel ${channel}`)
        );

        const result = await state.client.sendAction({
          Action: "StopMixMonitor",
          Channel: channel,
        });

        console.log(chalk.green(`[AMI] Call recording stopped:`, result));
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to stop recording:`, error.message)
        );
        throw error;
      }
    },

    addAgentToQueue: async (queueName, agentInterface, options = {}) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Adding agent ${agentInterface} to queue ${queueName}`
          )
        );

        const action = {
          Action: "QueueAdd",
          Queue: queueName,
          Interface: agentInterface,
          MemberName: options.memberName || `Agent ${agentInterface}`,
          Penalty: options.penalty || 0,
          Paused: options.paused || 0,
        };

        const result = await state.client.sendAction(action);
        console.log(
          chalk.green(`[AMI] Agent added to queue successfully:`, result)
        );
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to add agent to queue:`, error.message)
        );
        throw error;
      }
    },

    removeAgentFromQueue: async (queueName, agentInterface) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Removing agent ${agentInterface} from queue ${queueName}`
          )
        );

        const action = {
          Action: "QueueRemove",
          Queue: queueName,
          Interface: agentInterface,
        };

        const result = await state.client.sendAction(action);
        console.log(
          chalk.green(`[AMI] Agent removed from queue successfully:`, result)
        );
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to remove agent from queue:`, error.message)
        );
        throw error;
      }
    },

    getQueueStatus: async (queueName = null) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Getting queue status for ${queueName || "all queues"}`
          )
        );

        const action = {
          Action: "QueueStatus",
        };

        if (queueName) {
          action.Queue = queueName;
        }

        const result = await state.client.sendAction(action);
        console.log(
          chalk.green(`[AMI] Queue status retrieved successfully:`, result)
        );
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to get queue status:`, error.message)
        );
        throw error;
      }
    },

    getQueueSummary: async (queueName = null) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Getting queue summary for ${queueName || "all queues"}`
          )
        );

        const action = {
          Action: "QueueSummary",
        };

        if (queueName) {
          action.Queue = queueName;
        }

        const result = await state.client.sendAction(action);
        console.log(
          chalk.green(`[AMI] Queue summary retrieved successfully:`, result)
        );
        return result;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to get queue summary:`, error.message)
        );
        throw error;
      }
    },

    // � CHANSPY FUNCTIONS - Call Monitoring/Supervision

    /**
     * Start spying on a channel (silent monitoring)
     * @param {string} spyerExtension - The extension of the supervisor who will spy
     * @param {string} targetChannel - The channel to spy on (e.g., "PJSIP/1001-00000001")
     * @param {object} options - ChanSpy options
     * @param {string} options.mode - 'listen' (silent), 'whisper' (speak to agent), 'barge' (speak to both)
     * @param {boolean} options.quiet - Don't play beep to spied channel
     * @param {number} options.volume - Volume adjustment (-4 to +4)
     * @param {string} options.group - Only spy on channels in this group
     */
    startChanSpy: async (spyerExtension, targetChannel, options = {}) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Starting ChanSpy: ${spyerExtension} spying on ${targetChannel}`
          )
        );

        // Build ChanSpy options string
        let chanSpyOptions = "";

        // Mode options
        if (options.mode === "whisper") {
          chanSpyOptions += "w"; // Enable whisper mode
        } else if (options.mode === "barge") {
          chanSpyOptions += "B"; // Enable barge mode (speak to both parties)
        }
        // Default is 'listen' (silent) - no option needed

        // Quiet mode - don't play beep
        if (options.quiet !== false) {
          chanSpyOptions += "q";
        }

        // Volume adjustment
        if (options.volume && options.volume >= -4 && options.volume <= 4) {
          chanSpyOptions += `v(${options.volume})`;
        }

        // Group filter
        if (options.group) {
          chanSpyOptions += `g(${options.group})`;
        }

        // Stop when spied channel hangs up
        chanSpyOptions += "S";

        // Extract the channel prefix for ChanSpy (e.g., "PJSIP/1001" from "PJSIP/1001-00000001")
        const channelPrefix = targetChannel.split("-")[0];

        const action = {
          Action: "Originate",
          Channel: `PJSIP/${spyerExtension}`,
          Application: "ChanSpy",
          Data: `${channelPrefix},${chanSpyOptions}`,
          Timeout: 30000,
          CallerID: `Supervisor <${spyerExtension}>`,
          Async: "yes",
        };

        const result = await state.client.sendAction(action);
        console.log(chalk.green(`[AMI] ChanSpy started successfully:`, result));

        return {
          ...result,
          spyerExtension,
          targetChannel,
          mode: options.mode || "listen",
          options: chanSpyOptions,
        };
      } catch (error) {
        console.error(chalk.red(`[AMI] ChanSpy failed:`, error.message));
        throw error;
      }
    },

    /**
     * Start spying on a specific extension (finds active channel automatically)
     * @param {string} spyerExtension - The extension of the supervisor who will spy
     * @param {string} targetExtension - The extension to spy on
     * @param {object} options - ChanSpy options (same as startChanSpy)
     */
    startChanSpyByExtension: async (spyerExtension, targetExtension, options = {}) => {
      try {
        console.log(
          chalk.blue(
            `[AMI] Starting ChanSpy by extension: ${spyerExtension} spying on ext ${targetExtension}`
          )
        );

        // Find the active channel for the target extension
        const channelInfo = await getChannelForExtension(targetExtension);

        if (!channelInfo?.channel) {
          throw new Error(`No active channel found for extension ${targetExtension}`);
        }

        console.log(
          chalk.gray(`[AMI] Found channel for ${targetExtension}: ${channelInfo.channel}`)
        );

        // Build ChanSpy options string
        let chanSpyOptions = "";

        if (options.mode === "whisper") {
          chanSpyOptions += "w";
        } else if (options.mode === "barge") {
          chanSpyOptions += "B";
        }

        if (options.quiet !== false) {
          chanSpyOptions += "q";
        }

        if (options.volume && options.volume >= -4 && options.volume <= 4) {
          chanSpyOptions += `v(${options.volume})`;
        }

        if (options.group) {
          chanSpyOptions += `g(${options.group})`;
        }

        chanSpyOptions += "S";

        // Use PJSIP/<extension> prefix for ChanSpy to target specific extension
        const action = {
          Action: "Originate",
          Channel: `PJSIP/${spyerExtension}`,
          Application: "ChanSpy",
          Data: `PJSIP/${targetExtension},${chanSpyOptions}`,
          Timeout: 30000,
          CallerID: `Supervisor <${spyerExtension}>`,
          Async: "yes",
        };

        const result = await state.client.sendAction(action);
        console.log(
          chalk.green(`[AMI] ChanSpy by extension started successfully:`, result)
        );

        return {
          ...result,
          spyerExtension,
          targetExtension,
          targetChannel: channelInfo.channel,
          mode: options.mode || "listen",
          options: chanSpyOptions,
        };
      } catch (error) {
        console.error(
          chalk.red(`[AMI] ChanSpy by extension failed:`, error.message)
        );
        throw error;
      }
    },

    /**
     * Stop an active ChanSpy session by hanging up the spy channel
     * @param {string} spyerExtension - The extension doing the spying
     */
    stopChanSpy: async (spyerExtension) => {
      try {
        console.log(
          chalk.blue(`[AMI] Stopping ChanSpy for extension ${spyerExtension}`)
        );

        // Find the spy channel
        const channelInfo = await getChannelForExtension(spyerExtension);

        if (!channelInfo?.channel) {
          throw new Error(`No active spy channel found for extension ${spyerExtension}`);
        }

        // Hangup the spy channel
        const result = await state.client.sendAction({
          Action: "Hangup",
          Channel: channelInfo.channel,
          Cause: 16, // Normal clearing
        });

        console.log(chalk.green(`[AMI] ChanSpy stopped successfully:`, result));
        return result;
      } catch (error) {
        console.error(chalk.red(`[AMI] Stop ChanSpy failed:`, error.message));
        throw error;
      }
    },

    /**
     * Get list of calls that can be spied on (active bridged calls)
     */
    getSpyableChannels: async () => {
      try {
        console.log(chalk.blue(`[AMI] Getting spyable channels`));

        const result = await state.client.sendAction({
          Action: "CoreShowChannels",
        });

        // Filter to only show bridged/active calls
        const spyableChannels = [];
        if (result?.events && Array.isArray(result.events)) {
          for (const event of result.events) {
            if (
              event.Event === "CoreShowChannel" &&
              event.ChannelState === "6" && // Up state
              (event.Channel?.startsWith("PJSIP/") || event.Channel?.startsWith("SIP/"))
            ) {
              // Extract extension from channel name
              const channelMatch = event.Channel.match(/(?:PJSIP|SIP)\/(\d+)-/);
              const extension = channelMatch ? channelMatch[1] : null;

              spyableChannels.push({
                channel: event.Channel,
                extension: extension,
                callerIdNum: event.CallerIDNum,
                callerIdName: event.CallerIDName,
                connectedLineNum: event.ConnectedLineNum,
                connectedLineName: event.ConnectedLineName,
                duration: event.Duration,
                bridgeId: event.BridgeId,
                application: event.Application,
                uniqueId: event.Uniqueid,
              });
            }
          }
        }

        console.log(
          chalk.green(`[AMI] Found ${spyableChannels.length} spyable channels`)
        );
        return spyableChannels;
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Failed to get spyable channels:`, error.message)
        );
        throw error;
      }
    },

    /**
     * Switch ChanSpy mode during an active session
     * @param {string} spyerExtension - The extension doing the spying
     * @param {string} newMode - 'listen', 'whisper', or 'barge'
     */
    switchChanSpyMode: async (spyerExtension, newMode) => {
      try {
        console.log(
          chalk.blue(`[AMI] Switching ChanSpy mode to ${newMode} for ${spyerExtension}`)
        );

        // DTMF codes for ChanSpy mode switching during active session
        // Note: This requires the spy to be in an active ChanSpy application
        const channelInfo = await getChannelForExtension(spyerExtension);

        if (!channelInfo?.channel) {
          throw new Error(`No active channel found for extension ${spyerExtension}`);
        }

        // ChanSpy doesn't have runtime mode switching via DTMF by default
        // We need to use a custom dialplan or send appropriate DTMF
        // For now, return info about the limitation
        return {
          success: false,
          message: "Runtime mode switching requires dialplan configuration. Please stop and restart spy with new mode.",
          currentChannel: channelInfo.channel,
          requestedMode: newMode,
        };
      } catch (error) {
        console.error(
          chalk.red(`[AMI] Switch ChanSpy mode failed:`, error.message)
        );
        throw error;
      }
    },

    // �🔌 UTILITY FUNCTIONS
    executeAction: async (action) => {
      if (!state.client?.isConnected()) {
        throw new Error("AMI not connected");
      }
      return state.client.sendAction(action);
    },

    // Backwards-compatible alias used by some controllers
    executeAMIAction: async (action) => {
      if (!state.client?.isConnected()) {
        throw new Error("AMI not connected");
      }
      return state.client.sendAction(action);
    },

    // 📡 EVENT SYSTEM
    on: (event, listener) => emitter.on(event, listener),
    off: (event, listener) => emitter.off(event, listener),
    once: (event, listener) => emitter.once(event, listener),
    removeAllListeners: (event) => emitter.removeAllListeners(event),

    // 🔗 CLIENT ACCESS
    client: state.client,
  };
};

const amiService = createAmiService();
export default amiService;
