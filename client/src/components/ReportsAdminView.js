import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCallVolume,
  fetchPerformanceMetrics,
  fetchQueueDistribution,
  fetchSLACompliance,
  downloadReport,
  clearReports,
} from "../features/reports/reportsSlice";
import {
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Tabs,
  Tab,
  Box,
  Alert,
  Chip,
  CircularProgress,
  Button,
  LinearProgress,
  Paper,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Phone,
  People,
  BarChart as BarChartIcon,
  Download,
  DateRange,
  PieChart as PieChartIcon,
  AccessTime,
  Assessment,
} from "@mui/icons-material";
import LoadingIndicator from "./common/LoadingIndicator";

const Reports = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const {
    callVolume,
    performance,
    queueDistribution,
    slaCompliance,
    loading,
    error,
    downloadProgress,
    isDownloading,
  } = useSelector((state) => state.reports);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [selectedView, setSelectedView] = useState("volume");

  const isDateRangeValid = useCallback(() => {
    const now = new Date();
    return (
      dateRange.startDate &&
      dateRange.endDate &&
      dateRange.endDate > dateRange.startDate &&
      dateRange.endDate <= now &&
      dateRange.startDate <= now
    );
  }, [dateRange]);

  const getButtonText = () => {
    if (isDownloading) return `Downloading ${downloadProgress}%`;
    if (!dateRange.startDate || !dateRange.endDate) return "Select Date Range";
    if (dateRange.endDate > new Date()) return "Future Dates Not Allowed";
    if (dateRange.endDate <= dateRange.startDate) return "Invalid Date Range";

    // Calculate the difference in days
    const diffTime = Math.abs(dateRange.endDate - dateRange.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Get report type description
    const reportTypeDescriptions = {
      volume: "Comprehensive Call Detail",
      performance: "Agent Performance",
      queues: "System Health",
      distribution: "Detailed Call Distribution",
    };

    const reportType = reportTypeDescriptions[selectedView] || "Report";

    // Return appropriate text based on the range
    if (diffDays === 7) return `Download Weekly ${reportType} Report`;
    if (diffDays === 30 || diffDays === 31)
      return `Download Monthly ${reportType} Report`;
    return `Download ${diffDays}-Day ${reportType} Report`;
  };

  useEffect(() => {
    if (!isDateRangeValid()) return;

    const params = {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    };

    switch (selectedView) {
      case "volume":
        dispatch(fetchCallVolume(params));
        break;
      case "performance":
        dispatch(fetchPerformanceMetrics(params));
        break;
      case "queues":
        dispatch(fetchQueueDistribution(params));
        dispatch(fetchSLACompliance(params));
        break;
      case "distribution":
        // For call distribution, we can use the same data as volume or create a specific fetch
        dispatch(fetchCallVolume(params));
        break;
      default:
        break;
    }
  }, [dispatch, dateRange, selectedView, isDateRangeValid]);

  const handleDownload = async () => {
    if (!isDateRangeValid()) return;

    try {
      // Map the selected view to the appropriate report type
      let reportType = selectedView;

      // Map UI views to backend report types
      const reportTypeMapping = {
        volume: "call-detail",
        performance: "agent-performance",
        queues: "system-health",
        distribution: "call-distribution",
      };

      reportType = reportTypeMapping[selectedView] || selectedView;

      // The download is now handled directly in the thunk
      await dispatch(
        downloadReport({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          type: reportType,
        })
      ).unwrap();

      // No need to handle the blob here anymore as it's done in the thunk
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Updated styles for the main container
  const containerStyles = {
    p: 4,
    backgroundColor: theme.palette.background.default,
    minHeight: "100vh",
  };

  // Updated card styles
  const cardStyles = {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 2,
    boxShadow: theme.shadows[3],
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: theme.shadows[6],
    },
  };

  // COLORS for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const renderCallVolumeChart = () => {
    // Format data for the chart if needed
    const formattedData = callVolume.map((item) => ({
      date: item.date,
      inbound: item.inbound || 0,
      outbound: item.outbound || 0,
      abandoned: item.abandoned || 0,
    }));

    return (
      <Card sx={cardStyles}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <Phone fontSize="small" color="primary" />
              <Typography variant="h6" color="primary">
                Call Volume Trends
              </Typography>
            </Box>
          }
        />
        <CardContent>
          {loading ? (
            // <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            //   <CircularProgress />
            // </Box>
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography>Loading Analytics...</Typography>
              <LoadingIndicator />
            </Box>
          ) : formattedData.length === 0 ? (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <Typography color="textSecondary">No data available</Typography>
            </Box>
          ) : (
            <Paper elevation={0} sx={{ p: 2, backgroundColor: "transparent" }}>
              <ResponsiveContainer height={400}>
                <LineChart data={formattedData}>
                  <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="inbound"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Inbound Calls"
                  />
                  <Line
                    type="monotone"
                    dataKey="outbound"
                    stroke={theme.palette.success.main}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Outbound Calls"
                  />
                  <Line
                    type="monotone"
                    dataKey="abandoned"
                    stroke={theme.palette.error.main}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Abandoned Calls"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceMetrics = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          {/* <CircularProgress /> */}
          <LoadingIndicator />
        </Box>
      ) : performance?.length === 0 ? (
        <Box sx={{ textAlign: "center", p: 4 }}>
          <Typography color="textSecondary">No agent data available</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: theme.shadows[3] }}>
          <Table>
            <TableHead sx={{ backgroundColor: theme.palette.primary.main }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Agent Name
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Total Calls
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Avg Handle Time
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Satisfaction
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Pause Count
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Total Pause
                </TableCell>
                <TableCell
                  sx={{ color: "white", fontWeight: "bold" }}
                  align="center"
                >
                  Top Pause Reason
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {performance.map((agent, index) => (
                <TableRow
                  key={index}
                  sx={{
                    "&:nth-of-type(odd)": {
                      backgroundColor: theme.palette.action.hover,
                    },
                    "&:hover": {
                      backgroundColor: theme.palette.action.selected,
                    },
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <People color="primary" fontSize="small" />
                      <Typography>{agent.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={agent.calls}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell align="center">{agent.avgHandleTime}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${agent.satisfaction}%`}
                      color={
                        agent.satisfaction > 90
                          ? "success"
                          : agent.satisfaction > 80
                          ? "info"
                          : "warning"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={agent.pauseCount ?? 0}
                      color={(agent.pauseCount ?? 0) > 0 ? "warning" : "default"}
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {agent.totalPauseTime || "0:00"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {agent.topPauseReason || ""}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderQueueMetrics = () => (
    <Grid container spacing={3}>
      {/* Queue Distribution Pie Chart */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyles}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <PieChartIcon fontSize="small" color="primary" />
                <Typography variant="h6" color="primary">
                  Queue Distribution
                </Typography>
              </Box>
            }
          />
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                {/* <CircularProgress /> */}
                <LoadingIndicator />
              </Box>
            ) : queueDistribution?.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4 }}>
                <Typography color="textSecondary">
                  No queue data available
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={queueDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {queueDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} calls`, "Volume"]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* SLA Compliance Bar Chart */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyles}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <BarChartIcon fontSize="small" color="primary" />
                <Typography variant="h6" color="primary">
                  SLA Compliance by Hour
                </Typography>
              </Box>
            }
          />
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                {/* <CircularProgress /> */}
                <LoadingIndicator />
              </Box>
            ) : slaCompliance?.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4 }}>
                <Typography color="textSecondary">
                  No SLA data available
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={slaCompliance}>
                  <XAxis dataKey="hour" />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "SLA Compliance"]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Bar
                    dataKey="percentage"
                    fill={theme.palette.primary.main}
                    name="SLA Compliance"
                  >
                    {slaCompliance.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.percentage >= 90
                            ? theme.palette.success.main
                            : entry.percentage >= 80
                            ? theme.palette.warning.main
                            : theme.palette.error.main
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );


  const renderDownloadButton = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Button
        variant="contained"
        startIcon={
          isDownloading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <Download />
          )
        }
        onClick={handleDownload}
        disabled={isDownloading || !isDateRangeValid()}
        title={getButtonText()}
      >
        {getButtonText()}
      </Button>
      {isDownloading && (
        <LinearProgress
          variant="determinate"
          value={downloadProgress}
          sx={{ width: 100 }}
        />
      )}
    </Box>
  );

  if (error) {
    return (
      <Alert
        severity={error.type === "NO_DATA" ? "info" : "error"}
        sx={{
          m: 2,
          display: "flex",
          alignItems: "center",
          "& .MuiAlert-action": {
            alignItems: "center",
          },
        }}
        action={
          error.type === "NO_DATA" && (
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                color="info"
                size="small"
                startIcon={<AccessTime />}
                onClick={() => {
                  dispatch(clearReports());
                  setDateRange({
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    endDate: new Date(),
                  });
                }}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outlined"
                color="info"
                size="small"
                startIcon={<DateRange />}
                onClick={() => dispatch(clearReports())}
              >
                Try Different Dates
              </Button>
            </Box>
          )
        }
      >
        {error.message}
      </Alert>
    );
  }

  const renderCallDistributionView = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Detailed Call Distribution Report"
              subheader="Comprehensive analysis of all call records with detailed CDR information"
              avatar={<Assessment color="primary" />}
            />
            <CardContent>
              <Typography variant="body1" color="text.secondary" paragraph>
                This report provides the a comprehensive view of call center
                data, including all CDR columns with information such as agent
                details, call classifications, performance metrics.
              </Typography>

              <Box
                sx={{
                  mt: 3,
                  p: 3,
                  backgroundColor: "background.default",
                  borderRadius: 1,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Report Features:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" component="div">
                      • All 19 CDR database columns
                    </Typography>
                    <Typography variant="body2" component="div">
                      • Agent information enrichment
                    </Typography>
                    <Typography variant="body2" component="div">
                      • Call performance metrics
                    </Typography>
                    <Typography variant="body2" component="div">
                      • Business hours analysis
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" component="div">
                      • Quality indicators
                    </Typography>
                    <Typography variant="body2" component="div">
                      • Cost analysis
                    </Typography>
                    <Typography variant="body2" component="div">
                      • Temporal analysis
                    </Typography>
                    <Typography variant="body2" component="div">
                      • Summary statistics
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {callVolume && callVolume.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Current Data Overview
                  </Typography>
                  <Grid container spacing={2}>
                    {callVolume.slice(0, 3).map((day, index) => (
                      <Grid item xs={12} md={4} key={index}>
                        <Paper sx={{ p: 2, textAlign: "center" }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {day.date}
                          </Typography>
                          <Typography variant="h6">
                            {day.inbound + day.outbound} calls
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {day.inbound} inbound, {day.outbound} outbound
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Note:</strong> The detailed call distribution report
                  includes all available CDR columns and calculated metrics.
                  This comprehensive dataset enables advanced analysis and
                  informed decision-making for call center operations.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={containerStyles}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                backgroundColor: theme.palette.primary.main,
                borderRadius: 2,
                p: 2,
                display: "inline-block",
                boxShadow: `0 4px 14px ${theme.palette.primary.main}40`,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  color: theme.palette.primary.contrastText,
                  fontWeight: 600,
                  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                Call Reports Dashboard
              </Typography>
            </Box>
          </Grid>
          <Grid
            item
            xs={12}
            md={4}
            sx={{
              marginLeft: "auto",
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box display="flex" gap={2}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(date) =>
                    setDateRange((prev) => ({ ...prev, startDate: date }))
                  }
                  maxDate={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      helperText: "Past dates only",
                    },
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(date) =>
                    setDateRange((prev) => ({ ...prev, endDate: date }))
                  }
                  maxDate={new Date()}
                  minDate={dateRange.startDate}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: "outlined",
                      helperText: "Must be after start date",
                    },
                  }}
                />
              </Box>
            </LocalizationProvider>
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              {renderDownloadButton()}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Tabs
        value={selectedView}
        onChange={(_, value) => setSelectedView(value)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            minHeight: 64,
            fontSize: "1rem",
          },
        }}
      >
        <Tab icon={<Phone />} label="Call Volume" value="volume" />
        <Tab icon={<People />} label="Agent Performance" value="performance" />
        <Tab icon={<PieChartIcon />} label="Queue Metrics" value="queues" />
        <Tab
          icon={<Assessment />}
          label="Call Distribution"
          value="distribution"
        />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {selectedView === "volume" && renderCallVolumeChart()}
        {selectedView === "performance" && renderPerformanceMetrics()}
        {selectedView === "queues" && renderQueueMetrics()}
        {selectedView === "distribution" && renderCallDistributionView()}
      </Box>
    </Box>
  );
};

export default Reports;
