/**
 * Centralized Server Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for server host/IP configuration.
 * Change the DEFAULT_SERVER_HOST value here to update all API, WebSocket,
 * and SIP connections throughout the application.
 * 
 * Priority order:
 * 1. localStorage override (for user-configurable settings)
 * 2. Environment variable (VITE_SERVER_HOST)
 * 3. Default value defined here
 */

// ============================================================================
// CHANGE THIS VALUE TO UPDATE THE SERVER HOST/IP EVERYWHERE
// ============================================================================
const DEFAULT_SERVER_HOST = "192.168.1.14";
// ============================================================================

const isDevelopment =
  process.env.NODE_ENV === "development" ||
  (typeof import.meta !== "undefined" &&
    import.meta.env?.MODE === "development");

const isElectron =
  typeof window !== "undefined" && window.location?.protocol === "file:";

// Storage keys
const STORAGE_KEYS = {
  SERVER_HOST: "serverHost",
  USE_HTTPS: "useHttps",
  API_PORT: "apiPort",
  SIP_PORT: "sipPort",
};

/**
 * Get the server host from localStorage or environment
 */
const getServerHost = () => {
  if (typeof localStorage !== "undefined") {
    const savedHost = localStorage.getItem(STORAGE_KEYS.SERVER_HOST);
    if (savedHost) return savedHost;
  }
  
  // Check environment variable
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SERVER_HOST) {
    return import.meta.env.VITE_SERVER_HOST;
  }
  
  // Development uses localhost
  if (isDevelopment) {
    return "localhost";
  }
  
  return DEFAULT_SERVER_HOST;
};

/**
 * Check if HTTPS should be used
 */
const useHttps = () => {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.USE_HTTPS);
    if (saved !== null) return saved === "true";
  }
  
  // Default: use HTTPS for production (self-signed cert configured on server)
  // Development uses HTTP (localhost)
  return !isDevelopment;
};

/**
 * Get the API port
 */
const getApiPort = () => {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.API_PORT);
    if (saved) return saved;
  }
  
  if (isDevelopment) return "8004";
  
  // Production on-prem uses nginx on port 80
  return "";
};

/**
 * Get the SIP WebSocket port
 */
const getSipPort = () => {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.SIP_PORT);
    if (saved) return saved;
  }
  
  return "8088";
};

/**
 * Build a URL with the given protocol, host, and optional port
 */
const buildUrl = (protocol, host, port = "") => {
  if (port) {
    return `${protocol}://${host}:${port}`;
  }
  return `${protocol}://${host}`;
};

/**
 * Server configuration object - the main export
 */
const serverConfig = {
  // Raw getters
  getServerHost,
  useHttps,
  getApiPort,
  getSipPort,
  
  // Computed URLs
  get host() {
    return getServerHost();
  },
  
  get apiUrl() {
    const protocol = useHttps() ? "https" : "http";
    const host = getServerHost();
    const port = getApiPort();
    return buildUrl(protocol, host, port);
  },
  
  get socketUrl() {
    const protocol = useHttps() ? "https" : "http";
    const host = getServerHost();
    const port = getApiPort();
    return buildUrl(protocol, host, port);
  },
  
  get wsUrl() {
    const protocol = useHttps() ? "wss" : "ws";
    const host = getServerHost();
    const port = getSipPort();
    return `${buildUrl(protocol, host, port)}/ws`;
  },
  
  get sipWsUrl() {
    const protocol = useHttps() ? "wss" : "ws";
    const host = getServerHost();
    const port = getSipPort();
    return `${buildUrl(protocol, host, port)}/ws`;
  },
  
  get baseUrl() {
    return this.apiUrl;
  },
  
  // Helper to get API URL with path
  getApiUrl(path = "") {
    const base = this.apiUrl;
    return path ? `${base}${path}` : base;
  },
  
  // Helper to ensure we never use file:// URLs
  getSafeOrigin() {
    if (
      isElectron ||
      (typeof window !== "undefined" &&
        window.location?.origin?.startsWith("file://"))
    ) {
      return this.apiUrl;
    }
    return window.location?.origin || this.apiUrl;
  },
  
  // Settings management
  setServerHost(host) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.SERVER_HOST, host);
    }
  },
  
  setUseHttps(value) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USE_HTTPS, String(value));
    }
  },
  
  setApiPort(port) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.API_PORT, port);
    }
  },
  
  setSipPort(port) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.SIP_PORT, port);
    }
  },
  
  // Reset to defaults
  resetToDefaults() {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.SERVER_HOST);
      localStorage.removeItem(STORAGE_KEYS.USE_HTTPS);
      localStorage.removeItem(STORAGE_KEYS.API_PORT);
      localStorage.removeItem(STORAGE_KEYS.SIP_PORT);
    }
  },
  
  // Environment flags
  isDevelopment,
  isProduction: !isDevelopment,
  isElectron,
  
  // Default value (for reference/display)
  DEFAULT_SERVER_HOST,
};

export default serverConfig;
