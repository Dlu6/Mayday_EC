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
 * Service for fetching call statistics from Asterisk
 */
const callStatsService = {
  /**
   * Get current call statistics
   * @returns {Promise<Object>} Call statistics data
   */
  getCallStats: async () => {
    try {
      const response = await API.get("/admin/call-stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching call statistics:", error);
      // Return fallback data in case of error
      return {
        waiting: 0,
        talking: 0,
        answered: 0,
        abandoned: 0,
        totalOffered: 0,
        avgHoldTime: 0,
      };
    }
  },

  /**
   * Get queue activity metrics
   * @returns {Promise<Object>} Queue activity data
   */
  getQueueActivity: async () => {
    try {
      const response = await API.get("/admin/queue-activity");
      return response.data;
    } catch (error) {
      console.error("Error fetching queue activity:", error);
      // Return fallback data in case of error
      return {
        serviceLevel: 0,
        waitTime: 0,
        abandonRate: 0,
      };
    }
  },

  /**
   * Get historical call data for trends
   * @param {string} timeframe - Time period for historical data (hour, day, week)
   * @returns {Promise<Object>} Historical call data
   */
  getHistoricalData: async (timeframe = "hour") => {
    try {
      const response = await API.get(
        `/admin/historical-stats?timeframe=${timeframe}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      return null;
    }
  },

  /**
   * Get active agents list with real-time status
   * @returns {Promise<Array>} Array of active agents with status
   */
  getActiveAgents: async () => {
    try {
      // baseURL may already include /api; avoid double-prefix
      const response = await API.get("/transfers/available-agents");
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error("Error fetching active agents:", error);
      // Return fallback data in case of error
      return [];
    }
  },

  /**
   * Get abandon rate statistics with breakdown
   * @returns {Promise<Object>} Abandon rate stats for today, week, month with hourly breakdown
   */
  getAbandonRateStats: async () => {
    try {
      const response = await API.get("/admin/abandon-rate-stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching abandon rate stats:", error);
      // Return fallback data in case of error
      return {
        today: { abandonRate: 0, abandonedCalls: 0, totalCalls: 0 },
        week: { abandonRate: 0 },
        month: { abandonRate: 0 },
        hourlyBreakdown: [],
      };
    }
  },

  /**
   * Get all agents with their real-time status (including offline)
   * @returns {Promise<Array>} Array of all agents with status
   */
  getAllAgentsWithStatus: async () => {
    try {
      const response = await API.get("/admin/all-agents");
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error("Error fetching all agents:", error);
      return [];
    }
  },
};

export default callStatsService;
