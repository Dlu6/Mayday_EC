// Environment configuration for Electron app
// This file provides centralized URL configuration to avoid file:// protocol issues

const isDevelopment =
  process.env.NODE_ENV === "development" ||
  (typeof import.meta !== "undefined" &&
    import.meta.env?.MODE === "development");

const isElectron =
  typeof window !== "undefined" && window.location?.protocol === "file:";

const config = {
  // API Base URL
  apiUrl: isDevelopment
    ? "http://localhost:8004"
    : import.meta?.env?.VITE_API_URL || "http://192.168.1.14",

  // Socket.IO URL
  socketUrl: isDevelopment
    ? "http://localhost:8004"
    : import.meta?.env?.VITE_SOCKET_URL || "http://192.168.1.14",

  // WebSocket URL for SIP
  wsUrl: isDevelopment
    ? "ws://localhost:8088/ws"
    : import.meta?.env?.VITE_WS_URL || "ws://192.168.1.14:8088/ws",

  // Environment flags
  isDevelopment,
  isProduction: !isDevelopment,
  isElectron,

  // Helper function to get full API URL
  getApiUrl: (path = "") => {
    const baseUrl = config.apiUrl;
    return path ? `${baseUrl}${path}` : baseUrl;
  },

  // Helper function to ensure we never use file:// URLs
  getSafeOrigin: () => {
    if (
      isElectron ||
      (typeof window !== "undefined" &&
        window.location?.origin?.startsWith("file://"))
    ) {
      return config.apiUrl;
    }
    return window.location?.origin || config.apiUrl;
  },
};

export default config;
