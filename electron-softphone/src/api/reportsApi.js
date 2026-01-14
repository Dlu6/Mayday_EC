import axios from "axios";
import { storageService } from "../services/storageService";
import serverConfig from "../config/serverConfig";

// Create API instance with base URL from centralized config
const API = axios.create({
  baseURL: serverConfig.apiUrl,
});

// Add auth token to all requests
API.interceptors.request.use((req) => {
  const token = storageService.getAuthToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Reports API endpoints
export const getCallVolumeData = (startDate, endDate) =>
  API.get(`/api/users/reports/call-volume`, { params: { startDate, endDate } });

export const getAgentPerformanceData = (startDate, endDate) =>
  API.get(`/api/users/reports/agent-performance`, {
    params: { startDate, endDate },
  });

export const getQueueDistributionData = (startDate, endDate) =>
  API.get(`/api/users/reports/queue-distribution`, {
    params: { startDate, endDate },
  });

export const getSLAComplianceData = (startDate, endDate) =>
  API.get(`/api/users/reports/sla-compliance`, {
    params: { startDate, endDate },
  });

export const exportReportData = (startDate, endDate, reportType) =>
  API.get(`/api/users/reports/export`, {
    params: { startDate, endDate, reportType },
    responseType: "blob",
  });

export const getDataToolMetricsData = (startDate, endDate) =>
  API.get(`/api/dataTool/metrics`, {
    params: { startDate, endDate },
  });
