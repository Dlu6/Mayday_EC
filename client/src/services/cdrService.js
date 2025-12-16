import axios from "axios";

// Base API configuration (same pattern as callStatsService)
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

const cdrService = {
  // Get comprehensive call counts for an extension, optionally within a date range
  getCallCountsByExtension: async (
    extension,
    startDate = null,
    endDate = null
  ) => {
    if (!extension) return null;

    const params = { extension };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      // baseURL already includes /api; avoid double-prefix here
      const response = await API.get("/cdr/counts", { params });
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching CDR counts for extension ${extension}:`,
        error
      );
      throw error;
    }
  },
};

export default cdrService;
