import axios from "axios";

// Base API configuration
const API = axios.create({
  // eslint-disable-next-line no-undef
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * ChanSpy Service - Call Monitoring/Supervision
 * Provides API methods for supervisors to monitor agent calls
 */
const chanSpyService = {
  /**
   * Get list of channels that can be spied on (active calls)
   * @returns {Promise<Array>} Array of spyable channels
   */
  getSpyableChannels: async () => {
    try {
      const response = await API.get("/ami/chanspy/channels");
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error("Error fetching spyable channels:", error);
      throw error;
    }
  },

  /**
   * Start ChanSpy session on a specific channel
   * @param {string} spyerExtension - Extension of the supervisor
   * @param {string} targetChannel - Channel to spy on
   * @param {Object} options - ChanSpy options
   * @param {string} options.mode - 'listen', 'whisper', or 'barge'
   * @param {boolean} options.quiet - Don't play beep to spied channel
   * @param {number} options.volume - Volume adjustment (-4 to +4)
   * @returns {Promise<Object>} Result of the spy operation
   */
  startChanSpy: async (spyerExtension, targetChannel, options = {}) => {
    try {
      const response = await API.post("/ami/chanspy/start", {
        spyerExtension,
        targetChannel,
        mode: options.mode || "listen",
        quiet: options.quiet !== false,
        volume: options.volume,
        group: options.group,
      });
      return response.data;
    } catch (error) {
      console.error("Error starting ChanSpy:", error);
      throw error;
    }
  },

  /**
   * Start ChanSpy session by extension (auto-finds active channel)
   * @param {string} spyerExtension - Extension of the supervisor
   * @param {string} targetExtension - Extension to spy on
   * @param {Object} options - ChanSpy options
   * @returns {Promise<Object>} Result of the spy operation
   */
  startChanSpyByExtension: async (spyerExtension, targetExtension, options = {}) => {
    try {
      const response = await API.post("/ami/chanspy/start-by-extension", {
        spyerExtension,
        targetExtension,
        mode: options.mode || "listen",
        quiet: options.quiet !== false,
        volume: options.volume,
        group: options.group,
      });
      return response.data;
    } catch (error) {
      console.error("Error starting ChanSpy by extension:", error);
      throw error;
    }
  },

  /**
   * Stop an active ChanSpy session
   * @param {string} spyerExtension - Extension doing the spying
   * @returns {Promise<Object>} Result of the stop operation
   */
  stopChanSpy: async (spyerExtension) => {
    try {
      const response = await API.post("/ami/chanspy/stop", {
        spyerExtension,
      });
      return response.data;
    } catch (error) {
      console.error("Error stopping ChanSpy:", error);
      throw error;
    }
  },

  /**
   * Switch ChanSpy mode during an active session
   * @param {string} spyerExtension - Extension doing the spying
   * @param {string} mode - New mode ('listen', 'whisper', 'barge')
   * @returns {Promise<Object>} Result of the mode switch
   */
  switchMode: async (spyerExtension, mode) => {
    try {
      const response = await API.post("/ami/chanspy/switch-mode", {
        spyerExtension,
        mode,
      });
      return response.data;
    } catch (error) {
      console.error("Error switching ChanSpy mode:", error);
      throw error;
    }
  },

  /**
   * ChanSpy mode constants
   */
  MODES: {
    LISTEN: "listen",   // Silent monitoring - hear both parties
    WHISPER: "whisper", // Speak to agent only (caller can't hear)
    BARGE: "barge",     // Speak to both parties (3-way conversation)
  },

  /**
   * Get mode description for UI display
   * @param {string} mode - ChanSpy mode
   * @returns {Object} Mode info with label and description
   */
  getModeInfo: (mode) => {
    const modes = {
      listen: {
        label: "Silent Monitor",
        description: "Listen to the call without being heard",
        icon: "Headphones",
        color: "info",
      },
      whisper: {
        label: "Whisper",
        description: "Speak to the agent only (caller cannot hear)",
        icon: "RecordVoiceOver",
        color: "warning",
      },
      barge: {
        label: "Barge In",
        description: "Join the call and speak to both parties",
        icon: "Phone",
        color: "error",
      },
    };
    return modes[mode] || modes.listen;
  },
};

export default chanSpyService;
