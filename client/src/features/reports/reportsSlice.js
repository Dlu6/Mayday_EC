import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient";

// Async thunks
export const fetchCallVolume = createAsyncThunk(
  "reports/fetchCallVolume",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/call-volume?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

export const fetchQualityMetrics = createAsyncThunk(
  "reports/fetchQualityMetrics",
  async ({ startDate, endDate }) => {
    try {
      // Only try to get data from the quality metrics endpoint
      const response = await apiClient.get(
        `/users/reports/quality?startDate=${startDate}&endDate=${endDate}`
      );

      // Return whatever data we get, even if it's empty
      return response.data || {};
    } catch (error) {
      console.error("Error fetching quality metrics:", error);
      throw error;
    }
  }
);

export const fetchPerformanceMetrics = createAsyncThunk(
  "reports/fetchPerformanceMetrics",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/agent-performance?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

// Add new async thunks for additional report types
export const fetchQueueDistribution = createAsyncThunk(
  "reports/fetchQueueDistribution",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/queue-distribution?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

export const fetchSLACompliance = createAsyncThunk(
  "reports/fetchSLACompliance",
  async ({ startDate, endDate }) => {
    const response = await apiClient.get(
      `/users/reports/sla-compliance?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }
);

// Add new async thunk for downloads
export const downloadReport = createAsyncThunk(
  "reports/downloadReport",
  async ({ startDate, endDate, type }, { dispatch, rejectWithValue }) => {
    try {
      // Map frontend report types to backend report types
      const reportTypeMap = {
        volume: "call-detail",
        quality: "quality",
        performance: "agent-performance",
        queues: "system-health",
        datatool: "comprehensive-datatool",
        "datatool-all-time": "datatool-all-time",
        // Map UI 'call-detail' to backend 'comprehensive-cdr'
        "call-detail": "comprehensive-cdr",
        "agent-performance": "agent-performance",
        "system-health": "system-health",
        "comprehensive-datatool": "comprehensive-datatool",
        "call-distribution": "call-distribution",
      };

      const reportType = reportTypeMap[type] || type;

      dispatch(updateDownloadProgress(10));

      // Use different endpoints for different report types
      let endpoint;
      if (reportType === "comprehensive-datatool") {
        endpoint = `/enhanced-datatool/download?startDate=${startDate}&endDate=${endDate}&format=csv`;
      } else {
        endpoint = `/users/reports/export?startDate=${startDate}&endDate=${endDate}&reportType=${reportType}`;
      }

      const response = await apiClient.get(endpoint, {
        responseType: "blob",
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 404,
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          dispatch(updateDownloadProgress(percentCompleted));
        },
      });

      dispatch(updateDownloadProgress(100));

      if (response.status === 404) {
        const reader = new FileReader();
        const textData = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsText(response.data);
        });

        try {
          const jsonData = JSON.parse(textData);
          return rejectWithValue({
            type: "NO_DATA",
            message:
              jsonData.message ||
              "No data available for the selected date range",
            silent: true,
          });
        } catch (parseError) {
          return rejectWithValue({
            type: "ERROR",
            message: "Invalid response format",
            silent: false,
          });
        }
      }

      // Create a URL for the blob and trigger download directly here
      // instead of returning the blob to Redux
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const filename = `${reportType}-report-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Small timeout to ensure the download starts before cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      // Return a simple success object without the blob
      return { success: true, filename };
    } catch (error) {
      if (error.isAxiosError && error.response?.status === 404) {
        return rejectWithValue({
          type: "NO_DATA",
          message: "No data available for the selected date range",
          silent: true,
        });
      }
      return rejectWithValue({
        type: "ERROR",
        message: error.message,
      });
    }
  }
);

// Add this new thunk action
export const fetchDataToolMetrics = createAsyncThunk(
  "reports/fetchDataToolMetrics",
  async (params, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/dataTool/metrics", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch Data Tool metrics"
      );
    }
  }
);

// Add this new thunk for all-time metrics
export const fetchDataToolAllTimeMetrics = createAsyncThunk(
  "reports/fetchDataToolAllTimeMetrics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/dataTool/metrics/all-time");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch all-time Data Tool metrics"
      );
    }
  }
);

const initialState = {
  callVolume: [],
  qualityMetrics: {},
  performance: [],
  queueDistribution: [],
  slaCompliance: [],
  slaThreshold: 60,
  dataToolMetrics: {},
  dataToolAllTimeMetrics: {},
  loading: false,
  allTimeLoading: false,
  error: null,
  downloadProgress: 0,
  isDownloading: false,
};

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearReports: (state) => {
      state.callVolume = [];
      state.qualityMetrics = {};
      state.performance = [];
      state.queueDistribution = [];
      state.slaCompliance = [];
      state.slaThreshold = 60;
      state.dataToolMetrics = {};
      state.dataToolAllTimeMetrics = {};
      state.error = null;
    },
    updateDownloadProgress: (state, action) => {
      state.downloadProgress = action.payload;
    },
    resetDownloadProgress: (state) => {
      state.downloadProgress = 0;
      state.isDownloading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Call Volume
      .addCase(fetchCallVolume.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCallVolume.fulfilled, (state, action) => {
        state.loading = false;
        state.callVolume = action.payload;
        state.error = null;
      })
      .addCase(fetchCallVolume.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Quality Metrics
      .addCase(fetchQualityMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQualityMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.qualityMetrics = action.payload;
        state.error = null;
      })
      .addCase(fetchQualityMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Performance Metrics
      .addCase(fetchPerformanceMetrics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPerformanceMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.performance = action.payload;
        state.error = null;
      })
      .addCase(fetchPerformanceMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Queue Distribution
      .addCase(fetchQueueDistribution.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQueueDistribution.fulfilled, (state, action) => {
        state.loading = false;
        state.queueDistribution = action.payload;
        state.error = null;
      })
      .addCase(fetchQueueDistribution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // SLA Compliance
      .addCase(fetchSLACompliance.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSLACompliance.fulfilled, (state, action) => {
        state.loading = false;
        // Handle both old format (array) and new format (object with data property)
        state.slaCompliance = action.payload?.data || action.payload;
        state.slaThreshold = action.payload?.slaThreshold || 60;
        state.error = null;
      })
      .addCase(fetchSLACompliance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Download Report
      .addCase(downloadReport.pending, (state) => {
        state.isDownloading = true;
        state.downloadProgress = 0;
      })
      .addCase(downloadReport.fulfilled, (state) => {
        state.isDownloading = false;
        state.downloadProgress = 100;
      })
      .addCase(downloadReport.rejected, (state, action) => {
        state.isDownloading = false;
        state.downloadProgress = 0;

        // Check if this is a NO_DATA response
        if (action.payload?.type === "NO_DATA") {
          state.error = {
            type: "NO_DATA",
            message: action.payload.message,
          };
        } else {
          state.error = {
            type: "ERROR",
            message: action.error.message,
          };
        }
      })
      // Data Tool Metrics
      .addCase(fetchDataToolMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDataToolMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.dataToolMetrics = action.payload;
      })
      .addCase(fetchDataToolMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch Data Tool metrics";
      })
      // Data Tool All-Time Metrics
      .addCase(fetchDataToolAllTimeMetrics.pending, (state) => {
        state.allTimeLoading = true;
      })
      .addCase(fetchDataToolAllTimeMetrics.fulfilled, (state, action) => {
        state.allTimeLoading = false;
        state.dataToolAllTimeMetrics = action.payload;
      })
      .addCase(fetchDataToolAllTimeMetrics.rejected, (state, action) => {
        state.allTimeLoading = false;
        state.error =
          action.payload || "Failed to fetch all-time Data Tool metrics";
      });
  },
});

export const { clearReports, updateDownloadProgress, resetDownloadProgress } =
  reportsSlice.actions;
export default reportsSlice.reducer;
