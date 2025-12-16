import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tab,
  Tabs,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  CircularProgress,
  Alert,
  Avatar,
  Popover,
  Menu,
  ListItemText,
} from "@mui/material";
import {
  DateRange,
  Download,
  Refresh,
  BarChart,
  PieChart,
  Timeline,
  Assessment,
  Call,
  AccessTime,
  TrendingUp,
  CalendarMonth,
} from "@mui/icons-material";
import ContentFrame from "./ContentFrame";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import {
  getCallVolumeData,
  getAgentPerformanceData,
  getQueueDistributionData,
  getSLAComplianceData,
  exportReportData,
  getDataToolMetricsData,
} from "../api/reportsApi";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const Reports = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState("week");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date picker state
  const [anchorEl, setAnchorEl] = useState(null);
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateError, setDateError] = useState("");

  // State for report data
  const [callVolumeData, setCallVolumeData] = useState([]);
  const [agentPerformanceData, setAgentPerformanceData] = useState([]);
  const [queueDistributionData, setQueueDistributionData] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [dataToolMetrics, setDataToolMetrics] = useState(null);

  // State for export menu
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const exportMenuOpen = Boolean(exportAnchorEl);
  // Get date range parameters based on selection
  const getDateParams = () => {
    const today = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case "today":
        startDate = today.toISOString().split("T")[0];
        endDate = startDate;
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split("T")[0];
        endDate = startDate;
        break;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split("T")[0];
        endDate = today.toISOString().split("T")[0];
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        startDate = monthAgo.toISOString().split("T")[0];
        endDate = today.toISOString().split("T")[0];
        break;
      case "custom":
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        startDate = today.toISOString().split("T")[0];
        endDate = startDate;
    }

    return { startDate, endDate };
  };

  // Fetch all report data
  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);

    const { startDate, endDate } = getDateParams();

    try {
      // Fetch call volume data
      const callVolumeResponse = await getCallVolumeData(startDate, endDate);
      setCallVolumeData(callVolumeResponse.data);

      // Fetch agent performance data
      const agentPerformanceResponse = await getAgentPerformanceData(
        startDate,
        endDate
      );
      setAgentPerformanceData(agentPerformanceResponse.data);

      // Fetch queue distribution data
      const queueDistributionResponse = await getQueueDistributionData(
        startDate,
        endDate
      );
      setQueueDistributionData(queueDistributionResponse.data);

      // Fetch SLA data
      const slaResponse = await getSLAComplianceData(startDate, endDate);
      setSlaData(slaResponse.data);

      // Fetch DataTool metrics
      try {
        const dataToolResponse = await getDataToolMetricsData(
          startDate,
          endDate
        );
        setDataToolMetrics(dataToolResponse.data);
      } catch (dataToolError) {
        console.error("Error fetching DataTool metrics:", dataToolError);
        // Don't fail the entire report if just DataTool fails
      }
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("Failed to load report data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (open) {
      fetchReportData();
    }
  }, [open, dateRange]);

  const handleRefresh = () => {
    fetchReportData();
  };

  const handleExportMenuOpen = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = async (reportType) => {
    try {
      setIsLoading(true);
      handleExportMenuClose();
      const { startDate, endDate } = getDateParams();

      // If no specific report type provided, use active tab
      if (!reportType) {
        reportType =
          activeTab === 0
            ? "call-volume"
            : activeTab === 1
            ? "agent-performance"
            : activeTab === 2
            ? "queue-metrics"
            : "datatool";
      }

      // Request report export from backend
      const response = await exportReportData(startDate, endDate, reportType);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `report-${reportType}-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting report:", err);
      setError("Failed to export report. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Date picker handlers
  const handleOpenDatePicker = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseDatePicker = () => {
    setAnchorEl(null);
  };

  const handleApplyDateRange = () => {
    // Validate date format
    if (
      !isValidDateFormat(customStartDate) ||
      !isValidDateFormat(customEndDate)
    ) {
      setDateError("Please use YYYY-MM-DD format for dates");
      return;
    }

    // Parse dates for validation
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setDateError("Invalid date format");
      return;
    }

    // Validate date range
    if (endDate < startDate) {
      setDateError("End date must be after start date");
      return;
    }

    // Check if date range is too large (e.g., more than 90 days)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      setDateError("Date range cannot exceed 90 days");
      return;
    }

    setDateRange("custom");
    setDateError("");
    handleCloseDatePicker();
    fetchReportData();
  };

  // Helper to validate date format (YYYY-MM-DD)
  const isValidDateFormat = (dateString) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  };

  const isDatePickerOpen = Boolean(anchorEl);

  // Modern date picker component
  const DatePickerPopover = () => (
    <Popover
      open={isDatePickerOpen}
      anchorEl={anchorEl}
      onClose={handleCloseDatePicker}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      PaperProps={{
        sx: { p: 3, width: 320 },
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Select Date Range
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          label="Start Date"
          type="date"
          value={customStartDate}
          onChange={(e) => setCustomStartDate(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          label="End Date"
          type="date"
          value={customEndDate}
          onChange={(e) => setCustomEndDate(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {dateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dateError}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={handleCloseDatePicker}>Cancel</Button>
        <Button variant="contained" onClick={handleApplyDateRange}>
          Apply
        </Button>
      </Box>
    </Popover>
  );

  const renderCallVolumeReport = () => (
    <Paper sx={{ p: 3, height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Call Volume Trends</Typography>
        <Tooltip title="Export">
          <IconButton onClick={handleExport}>
            <Download />
          </IconButton>
        </Tooltip>
      </Box>
      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 300,
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : callVolumeData.length === 0 ? (
        <Alert severity="info">No data available for the selected period</Alert>
      ) : (
        <>
          {/* Legend with explanations */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 2,
              flexWrap: "wrap",
              gap: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: "#2196f3",
                  mr: 1,
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">
                <strong>Inbound Calls</strong> - Total calls received
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: "#4caf50",
                  mr: 1,
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">
                <strong>Outbound Calls</strong> - Calls made by agents
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: "#f44336",
                  mr: 1,
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">
                <strong>Abandoned Calls</strong> - Callers who hung up before
                connecting
              </Typography>
            </Box>
          </Box>

          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={callVolumeData}
                margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <ChartTooltip
                  formatter={(value, name) => [
                    value,
                    name === "inbound"
                      ? "Inbound Calls"
                      : name === "outbound"
                      ? "Outbound Calls"
                      : "Abandoned Calls",
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    padding: 10,
                    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                  }}
                  itemStyle={{ padding: 4 }}
                />
                <Bar
                  dataKey="inbound"
                  fill="#2196f3"
                  name="Inbound"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="outbound"
                  fill="#4caf50"
                  name="Outbound"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="abandoned"
                  fill="#f44336"
                  name="Abandoned"
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </Box>

          {/* Call volume explanation */}
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: "rgba(0,0,0,0.02)",
              borderRadius: 1,
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <Typography variant="body2" gutterBottom>
              <strong style={{ color: "#2196f3" }}>KEY:</strong>
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Inbound Calls (Blue)🔵:</strong> Total number of calls
              received from external callers.
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Outbound Calls (Green)🟢:</strong> Calls initiated by your
              agents to customers or external parties.
            </Typography>
            <Typography variant="body2">
              <strong>Abandoned Calls (Red)🔴:</strong> Inbound calls where the
              caller disconnected before being connected to an agent. High
              abandoned rates may indicate long wait times or insufficient
              staffing.
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );

  const renderAgentPerformance = () => (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Agent Performance Metrics
        </Typography>

        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: "rgba(0,0,0,0.02)",
            borderRadius: 1,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <Typography variant="body2">
            This report shows individual agent performance metrics for the
            selected time period. The table includes:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Call sx={{ color: "primary.main", mr: 0.5, fontSize: 16 }} />
              <Typography variant="body2">
                <strong>Total Calls</strong> - Number of calls handled by each
                agent
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <AccessTime sx={{ color: "info.main", mr: 0.5, fontSize: 16 }} />
              <Typography variant="body2">
                <strong>Avg Handle Time</strong> - Average duration of calls
                (mm:ss)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <TrendingUp
                sx={{ color: "success.main", mr: 0.5, fontSize: 16 }}
              />
              <Typography variant="body2">
                <strong>Satisfaction</strong> - Customer satisfaction rating (%)
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table>
          <TableHead sx={{ bgcolor: "primary.light" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Agent Name</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Total Calls
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Avg Handle Time
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Satisfaction
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Alert severity="error">{error}</Alert>
                </TableCell>
              </TableRow>
            ) : agentPerformanceData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Alert severity="info">
                    No data available for the selected period
                  </Alert>
                </TableCell>
              </TableRow>
            ) : (
              agentPerformanceData.map((agent) => (
                <TableRow
                  key={agent.name}
                  sx={{
                    "&:nth-of-type(odd)": { bgcolor: "rgba(0,0,0,0.02)" },
                    "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
                    transition: "background-color 0.2s",
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          mr: 1,
                          bgcolor: "primary.main",
                        }}
                      >
                        {agent.name.charAt(0)}
                      </Avatar>
                      {agent.name}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Call
                        sx={{ color: "primary.main", mr: 0.5, fontSize: 16 }}
                      />
                      <Typography fontWeight="medium">{agent.calls}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <AccessTime
                        sx={{ color: "info.main", mr: 0.5, fontSize: 16 }}
                      />
                      <Typography fontWeight="medium">
                        {agent.avgHandleTime}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Box
                        sx={{
                          width: 60,
                          mr: 1,
                          bgcolor: "background.paper",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor:
                            agent.satisfaction >= 90
                              ? "success.main"
                              : agent.satisfaction >= 80
                              ? "info.main"
                              : agent.satisfaction >= 70
                              ? "warning.main"
                              : "error.main",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: 6,
                            width: `${agent.satisfaction}%`,
                            bgcolor:
                              agent.satisfaction >= 90
                                ? "success.main"
                                : agent.satisfaction >= 80
                                ? "info.main"
                                : agent.satisfaction >= 70
                                ? "warning.main"
                                : "error.main",
                          }}
                        />
                      </Box>
                      <Typography
                        fontWeight="medium"
                        color={
                          agent.satisfaction >= 90
                            ? "success.main"
                            : agent.satisfaction >= 80
                            ? "info.main"
                            : agent.satisfaction >= 70
                            ? "warning.main"
                            : "error.main"
                        }
                      >
                        {`${agent.satisfaction}%`}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  const renderQueueMetrics = () => (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Queue Distribution
          </Typography>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : queueDistributionData.length === 0 ? (
            <Alert severity="info">
              No data available for the selected period
            </Alert>
          ) : (
            <>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={queueDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {queueDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      formatter={(value) => [`${value} calls`, "Call Volume"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        padding: 10,
                        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Box>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "rgba(0,0,0,0.02)",
                  borderRadius: 1,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <Typography variant="body2">
                  This chart shows how calls are distributed across different
                  queues in your system. Each segment represents the percentage
                  of total calls handled by that queue.
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6" gutterBottom>
            SLA Compliance
          </Typography>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : slaData.length === 0 ? (
            <Alert severity="info">
              No data available for the selected period
            </Alert>
          ) : (
            <>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={slaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip
                      formatter={(value) => [`${value}%`, "SLA Compliance"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        padding: 10,
                        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{
                        r: 6,
                        stroke: "#8884d8",
                        strokeWidth: 2,
                        fill: "#fff",
                      }}
                    />
                    {/* Add a reference line for target SLA (e.g., 80%) */}
                    <ReferenceLine
                      y={80}
                      stroke="#4caf50"
                      strokeDasharray="3 3"
                      label={{
                        value: "Target SLA (80%)",
                        position: "insideBottomRight",
                        fill: "#4caf50",
                        fontSize: 12,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "rgba(0,0,0,0.02)",
                  borderRadius: 1,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <Typography variant="body2">
                  <strong>SLA (Service Level Agreement) Compliance</strong>{" "}
                  shows the percentage of calls answered within the target time
                  (typically 20 seconds) for each hour of the day. Higher
                  percentages indicate better service levels and shorter wait
                  times for callers.
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  // Render DataTool Report
  const renderDataToolReport = () => (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Case Distribution by Type
          </Typography>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : !dataToolMetrics ||
            !dataToolMetrics.casesByDifficulty ||
            dataToolMetrics.casesByDifficulty.length === 0 ? (
            <Alert severity="info">
              No data available for the selected period
            </Alert>
          ) : (
            <>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={dataToolMetrics.casesByDifficulty.map((item) => ({
                        ...item,
                        shortName: item.name.split("-")[0].trim(), // Create shortened labels
                      }))}
                      dataKey="value"
                      nameKey="shortName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ shortName, percent }) =>
                        `${shortName}: ${(percent * 100).toFixed(0)}%`
                      }
                      fontSize={11}
                    >
                      {dataToolMetrics.casesByDifficulty.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      formatter={(value, name, props) => {
                        // Find the original full name from the shortened version
                        const fullItem = dataToolMetrics.casesByDifficulty.find(
                          (item) => item.name.startsWith(name)
                        );
                        return [
                          `${value} cases`,
                          fullItem ? fullItem.name : name,
                        ];
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        padding: 10,
                        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Box>

              {/* Legend with full descriptions */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "rgba(0,0,0,0.02)",
                  borderRadius: 1,
                  border: "1px solid rgba(0,0,0,0.08)",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Case Types Legend:
                </Typography>
                {/* Add a scrollbar to the legend */}
                <Grid
                  container
                  spacing={1}
                  sx={{ maxHeight: 150, overflow: "auto" }}
                >
                  {dataToolMetrics.casesByDifficulty.map((item, index) => (
                    <Grid item xs={12} key={index}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 0.5 }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            bgcolor: COLORS[index % COLORS.length],
                            mr: 1,
                            borderRadius: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                          <strong>{item.name.split("-")[0].trim()}</strong>:{" "}
                          {item.name.includes("-")
                            ? item.name.split("-")[1].trim()
                            : ""}{" "}
                          (
                          {(
                            (item.value /
                              dataToolMetrics.casesByDifficulty.reduce(
                                (sum, i) => sum + i.value,
                                0
                              )) *
                            100
                          ).toFixed(0)}
                          %)
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "rgba(0,0,0,0.02)",
                  borderRadius: 1,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <Typography variant="body2">
                  This chart shows the distribution of cases by difficulty
                  level. Each segment represents the percentage of total cases
                  with that difficulty.
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Counselor Performance
          </Typography>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : !dataToolMetrics ||
            !dataToolMetrics.counselorPerformance ||
            dataToolMetrics.counselorPerformance.length === 0 ? (
            <Alert severity="info">
              No data available for the selected period
            </Alert>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 300, overflow: "auto" }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "primary.light" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Counselor
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        Cases
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        Sessions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataToolMetrics.counselorPerformance.map((counselor) => (
                      <TableRow
                        key={counselor.id}
                        sx={{
                          "&:nth-of-type(odd)": { bgcolor: "rgba(0,0,0,0.02)" },
                          "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                mr: 1,
                                bgcolor: "primary.main",
                                fontSize: "0.75rem",
                              }}
                            >
                              {counselor.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">
                              {counselor.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{counselor.cases}</TableCell>
                        <TableCell align="right">
                          {counselor.sessions}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "rgba(0,0,0,0.02)",
                  borderRadius: 1,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <Typography variant="body2">
                  This table shows the performance of counselors in terms of
                  cases handled and total sessions conducted during the selected
                  period.
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Grid>

      {/* Add a summary card with total numbers */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : !dataToolMetrics ? (
            <Alert severity="info">
              No data available for the selected period
            </Alert>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h4">
                    {dataToolMetrics.totalCases || 0}
                  </Typography>
                  <Typography variant="subtitle1">Total Cases</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "secondary.light",
                    color: "secondary.contrastText",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h4">
                    {dataToolMetrics.totalSessions || 0}
                  </Typography>
                  <Typography variant="subtitle1">Total Sessions</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "success.light",
                    color: "success.contrastText",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h4">
                    {dataToolMetrics.activeUsers || 0}
                  </Typography>
                  <Typography variant="subtitle1">Active Counselors</Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Reports</Typography>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ color: "inherit" }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Refresh />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      }
      headerColor="#2e7d32"
    >
      <Box sx={{ p: 3 }}>
        {/* Controls */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
            alignItems: "center",
          }}
        >
          <TextField
            select
            size="small"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            sx={{ minWidth: 150 }}
            label="Date Range"
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="yesterday">Yesterday</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>

          {dateRange === "custom" && (
            <Button
              variant="outlined"
              startIcon={<DateRange />}
              onClick={handleOpenDatePicker}
              size="small"
            >
              {customStartDate} to {customEndDate}
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportMenuOpen}
            disabled={isLoading}
          >
            Export Report
          </Button>
        </Box>

        {/* Date range display */}
        {dateRange === "custom" && (
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarMonth fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">
              Showing data from <strong>{customStartDate}</strong> to{" "}
              <strong>{customEndDate}</strong>
            </Typography>
          </Box>
        )}

        {/* Report Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
        >
          <Tab icon={<BarChart />} label="Call Volume" />
          <Tab icon={<Assessment />} label="Agent Performance" />
          <Tab icon={<PieChart />} label="Queue Metrics" />
          <Tab icon={<Timeline />} label="DataTool" />
        </Tabs>

        {/* Report Content */}
        {activeTab === 0 && renderCallVolumeReport()}
        {activeTab === 1 && renderAgentPerformance()}
        {activeTab === 2 && renderQueueMetrics()}
        {activeTab === 3 && renderDataToolReport()}
      </Box>

      {/* Modern Date Picker */}
      <DatePickerPopover />

      {/* Export Menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={exportMenuOpen}
        onClose={handleExportMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <MenuItem onClick={() => handleExport()}>
          <ListItemText>Current Tab Data</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport("comprehensive-cdr")}>
          <ListItemText
            primary="Comprehensive CDR Report"
            secondary="All call details with metadata"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("detailed-agent-report")}>
          <ListItemText
            primary="Detailed Agent Report"
            secondary="Extended agent metrics"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("call-disposition-report")}>
          <ListItemText
            primary="Call Disposition Analysis"
            secondary="Disposition breakdown"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("hourly-call-pattern")}>
          <ListItemText
            primary="Hourly Call Pattern"
            secondary="24-hour call distribution"
          />
        </MenuItem>
        <MenuItem onClick={() => handleExport("trunk-usage-report")}>
          <ListItemText
            primary="Trunk Usage Report"
            secondary="Channel utilization stats"
          />
        </MenuItem>
        {activeTab === 3 && (
          <>
            <MenuItem onClick={() => handleExport("datatool")}>
              <ListItemText
                primary="DataTool Report"
                secondary="Current date range"
              />
            </MenuItem>
            <MenuItem onClick={() => handleExport("datatool-all-time")}>
              <ListItemText
                primary="DataTool All-Time Report"
                secondary="Complete historical data"
              />
            </MenuItem>
          </>
        )}
      </Menu>
    </ContentFrame>
  );
};

export default Reports;
