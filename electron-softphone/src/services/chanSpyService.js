import { storageService } from "./storageService";
import serverConfig from "../config/serverConfig";

// Use centralized server configuration
const getBase = () => serverConfig.apiUrl;

const apiFetch = async (path, options = {}) => {
  const token =
    storageService.getAuthToken() || localStorage.getItem("authToken") || "";
  const res = await fetch(`${getBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const msg = data?.message || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
};

/**
 * ChanSpy Service - Call Monitoring/Supervision for Electron Softphone
 * Provides API methods for supervisors to monitor agent calls
 */
export const chanSpyService = {
  /**
   * ChanSpy mode constants
   */
  MODES: {
    LISTEN: "listen",   // Silent monitoring - hear both parties
    WHISPER: "whisper", // Speak to agent only (caller can't hear)
    BARGE: "barge",     // Speak to both parties (3-way conversation)
  },

  /**
   * Get list of channels that can be spied on (active calls)
   * @returns {Promise<Array>} Array of spyable channels
   */
  getSpyableChannels: async () => {
    const response = await apiFetch("/api/ami/chanspy/channels");
    return response.data || [];
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
    return apiFetch("/api/ami/chanspy/start", {
      method: "POST",
      body: JSON.stringify({
        spyerExtension,
        targetChannel,
        mode: options.mode || "listen",
        quiet: options.quiet !== false,
        volume: options.volume,
        group: options.group,
      }),
    });
  },

  /**
   * Start ChanSpy session by extension (auto-finds active channel)
   * @param {string} spyerExtension - Extension of the supervisor
   * @param {string} targetExtension - Extension to spy on
   * @param {Object} options - ChanSpy options
   * @returns {Promise<Object>} Result of the spy operation
   */
  startChanSpyByExtension: async (spyerExtension, targetExtension, options = {}) => {
    return apiFetch("/api/ami/chanspy/start-by-extension", {
      method: "POST",
      body: JSON.stringify({
        spyerExtension,
        targetExtension,
        mode: options.mode || "listen",
        quiet: options.quiet !== false,
        volume: options.volume,
        group: options.group,
      }),
    });
  },

  /**
   * Stop an active ChanSpy session
   * @param {string} spyerExtension - Extension doing the spying
   * @returns {Promise<Object>} Result of the stop operation
   */
  stopChanSpy: async (spyerExtension) => {
    return apiFetch("/api/ami/chanspy/stop", {
      method: "POST",
      body: JSON.stringify({ spyerExtension }),
    });
  },

  /**
   * Switch ChanSpy mode during an active session
   * @param {string} spyerExtension - Extension doing the spying
   * @param {string} mode - New mode ('listen', 'whisper', 'barge')
   * @returns {Promise<Object>} Result of the mode switch
   */
  switchMode: async (spyerExtension, mode) => {
    return apiFetch("/api/ami/chanspy/switch-mode", {
      method: "POST",
      body: JSON.stringify({ spyerExtension, mode }),
    });
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
