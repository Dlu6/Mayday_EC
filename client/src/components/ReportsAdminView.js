import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCallVolume,
  fetchPerformanceMetrics,
  fetchQueueDistribution,
  fetchSLACompliance,
  downloadReport,
  clearReports,
  fetchDataToolMetrics,
  fetchDataToolAllTimeMetrics,
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
  Timeline,
  SupervisorAccount,
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
    dataToolMetrics,
    dataToolAllTimeMetrics,
    allTimeLoading,
  } = useSelector((state) => state.reports);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [selectedView, setSelectedView] = useState("volume");
  const [dataToolTab, setDataToolTab] = useState("filtered");

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
      datatool: "DataTool Analytics",
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
      case "datatool":
        dispatch(fetchDataToolMetrics(params));
        dispatch(fetchDataToolAllTimeMetrics());
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
        datatool: "comprehensive-datatool",
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

  const renderDataToolMetrics = () => {
    // Check if data is loading or not available
    if (loading && dataToolTab === "filtered") {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          {/* <CircularProgress /> */}
          <LoadingIndicator />
        </Box>
      );
    }

    if (allTimeLoading && dataToolTab === "allTime") {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          {/* <CircularProgress /> */}
          <LoadingIndicator />
        </Box>
      );
    }

    // Add tabs for filtered vs all-time data
    const handleDataToolTabChange = (event, newValue) => {
      setDataToolTab(newValue);
    };

    // Enhanced StatCard component similar to SessionAnalytics
    const StatCard = ({ title, value, icon, color, subtitle }) => (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          height: "100%",
          bgcolor: `${color}15`,
          border: 1,
          borderColor: `${color}30`,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: (theme) => theme.shadows[12],
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 500, color: color }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Paper>
    );

    // User Activity Card component similar to SessionAnalytics
    const UserActivityCard = ({ counselor, totalCases, totalSessions }) => {
      const postPercentage =
        totalCases > 0 ? (counselor.cases / totalCases) * 100 : 0;
      const sessionPercentage =
        totalSessions > 0 ? (counselor.sessions / totalSessions) * 100 : 0;

      return (
        <Card
          elevation={3}
          sx={{
            height: "100%",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: (theme) => theme.shadows[12],
            },
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 2,
              }}
            >
              <People sx={{ color: "primary.main" }} />
              <Typography variant="h6">{counselor.name}</Typography>
              <Chip
                label={
                  counselor.role === "CREATOR" ? "Counselor" : "Supervisor"
                }
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            {/* Activity Progress Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cases Activity
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Box sx={{ flex: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={postPercentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: (theme) => theme.palette.grey[200],
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        backgroundColor: "#2196f3",
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {postPercentage.toFixed(1)}%
                </Typography>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom
                sx={{ mt: 2 }}
              >
                Sessions Activity
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ flex: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={sessionPercentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: (theme) => theme.palette.grey[200],
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        backgroundColor: "#4caf50",
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {sessionPercentage.toFixed(1)}%
                </Typography>
              </Box>
            </Box>

            {/* Metrics Explanation */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography color="text.secondary" variant="body2">
                  Cases
                </Typography>
                <Typography variant="h6">{counselor.cases}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Total interactions initiated
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="text.secondary" variant="body2">
                  Sessions
                </Typography>
                <Typography variant="h6">
                  {counselor.sessions.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed conversations
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    };

    // Render the date-filtered metrics
    const renderFilteredMetrics = () => {
      if (!dataToolMetrics || Object.keys(dataToolMetrics).length === 0) {
        return (
          <Alert severity="info" sx={{ mb: 2 }}>
            No data available for the selected date range. Please adjust your
            filters or ensure data exists for this period.
          </Alert>
        );
      }

      // Extract metrics from the data
      const {
        totalCases = 0,
        totalSessions = 0,
        activeUsers = 0,
        casesByDifficulty = [],
        casesByRegion = [],
        casesBySex = [],
        sessionsByMonth = [],
        casesBySource = [],
        casesByAge = [],
        counselorPerformance = [],
      } = dataToolMetrics;

      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Summary Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total Cases"
                value={totalCases.toLocaleString()}
                icon={<Assessment sx={{ color: "#2196f3" }} />}
                color="#2196f3"
                subtitle="Selected date range"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total Sessions"
                value={totalSessions.toLocaleString()}
                icon={<Timeline sx={{ color: "#4caf50" }} />}
                color="#4caf50"
                subtitle="Selected date range"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Active Counselors"
                value={activeUsers}
                icon={<SupervisorAccount sx={{ color: "#ff9800" }} />}
                color="#ff9800"
                subtitle="Selected date range"
              />
            </Grid>
          </Grid>

          {/* Counselor Performance Cards */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Counselor Performance
          </Typography>
          <Grid container spacing={3}>
            {counselorPerformance.map((counselor, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <UserActivityCard
                  counselor={counselor}
                  totalCases={totalCases}
                  totalSessions={totalSessions}
                />
              </Grid>
            ))}
          </Grid>

          {/* Cases by Difficulty and Region */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Case Distribution
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={cardStyles}>
                <CardHeader
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <PieChartIcon fontSize="small" color="primary" />
                      <Typography variant="h6" color="primary">
                        Cases by Difficulty
                      </Typography>
                    </Box>
                  }
                />
                <CardContent>
                  {casesByDifficulty?.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={casesByDifficulty}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => {
                              // Truncate long names to make labels more readable
                              const truncatedName =
                                name.length > 15
                                  ? `${name.substring(0, 15)}...`
                                  : name;
                              return `${truncatedName}: ${(
                                percent * 100
                              ).toFixed(0)}%`;
                            }}
                          >
                            {casesByDifficulty.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => {
                              // Return the full untruncated name and value
                              return [
                                `${value} cases (${(
                                  (value / totalCases) *
                                  100
                                ).toFixed(1)}%)`,
                                name,
                              ];
                            }}
                            contentStyle={{
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.divider}`,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Custom legend for better readability */}
                      <Box
                        sx={{
                          mt: 2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {casesByDifficulty.map((entry, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                backgroundColor: COLORS[index % COLORS.length],
                                borderRadius: "2px",
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.75rem" }}
                            >
                              {entry.name} ({entry.value} cases,{" "}
                              {((entry.value / totalCases) * 100).toFixed(1)}%)
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        No data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={cardStyles}>
                <CardHeader
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <PieChartIcon fontSize="small" color="primary" />
                      <Typography variant="h6" color="primary">
                        Cases by Region
                      </Typography>
                    </Box>
                  }
                />
                <CardContent>
                  {casesByRegion?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={casesByRegion}
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
                          {casesByRegion.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value} cases`, "Count"]}
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        No data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Sessions by Month */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Time Analysis
          </Typography>
          <Card sx={cardStyles}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <BarChartIcon fontSize="small" color="primary" />
                  <Typography variant="h6" color="primary">
                    Sessions by Month
                  </Typography>
                </Box>
              }
            />
            <CardContent>
              {sessionsByMonth?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionsByMonth}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [`${value} sessions`, "Count"]}
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    <Bar dataKey="sessions" fill={theme.palette.primary.main} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: "center", p: 4 }}>
                  <Typography color="textSecondary">
                    No data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Cases by Source and Age Group */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Demographic Analysis
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={cardStyles}>
                <CardHeader
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <BarChartIcon fontSize="small" color="primary" />
                      <Typography variant="h6" color="primary">
                        Cases by Source
                      </Typography>
                    </Box>
                  }
                />
                <CardContent>
                  {casesBySource?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={casesBySource} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip
                          formatter={(value) => [`${value} cases`, "Count"]}
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill={theme.palette.primary.main}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        No data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={cardStyles}>
                <CardHeader
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <BarChartIcon fontSize="small" color="primary" />
                      <Typography variant="h6" color="primary">
                        Cases by Age Group
                      </Typography>
                    </Box>
                  }
                />
                <CardContent>
                  {casesByAge?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={casesByAge}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`${value} cases`, "Count"]}
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        />
                        <Bar dataKey="value" fill={theme.palette.primary.main}>
                          {casesByAge.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        No data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Add Cases by Sex chart */}
            <Grid item xs={12} md={6}>
              <Card sx={cardStyles}>
                <CardHeader
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <PieChartIcon fontSize="small" color="primary" />
                      <Typography variant="h6" color="primary">
                        Cases by Sex
                      </Typography>
                    </Box>
                  }
                />
                <CardContent>
                  {casesBySex?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={casesBySex}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => {
                            // Truncate long names to make labels more readable
                            const truncatedName =
                              name.length > 15
                                ? `${name.substring(0, 15)}...`
                                : name;
                            return `${truncatedName}: ${(percent * 100).toFixed(
                              0
                            )}%`;
                          }}
                        >
                          {casesBySex.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [
                            `${value} cases (${(
                              (value / totalCases) *
                              100
                            ).toFixed(1)}%)`,
                            "Count",
                          ]}
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: "center", p: 4 }}>
                      <Typography color="textSecondary">
                        No data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      );
    };

    // Render the all-time metrics
    const renderAllTimeMetrics = () => {
      if (
        !dataToolAllTimeMetrics ||
        Object.keys(dataToolAllTimeMetrics).length === 0
      ) {
        return (
          <Alert severity="info" sx={{ mb: 2 }}>
            No all-time data available. Please ensure your database contains
            records.
          </Alert>
        );
      }

      // Extract metrics from the data
      const {
        totalCases = 0,
        totalSessions = 0,
        activeUsers = 0,
        counselorPerformance = [],
      } = dataToolAllTimeMetrics;

      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Summary Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total Cases"
                value={totalCases.toLocaleString()}
                icon={<Assessment sx={{ color: "#2196f3" }} />}
                color="#2196f3"
                subtitle="All time"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total Sessions"
                value={totalSessions.toLocaleString()}
                icon={<Timeline sx={{ color: "#4caf50" }} />}
                color="#4caf50"
                subtitle="All time"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Active Counselors"
                value={activeUsers}
                icon={<SupervisorAccount sx={{ color: "#ff9800" }} />}
                color="#ff9800"
                subtitle="All time"
              />
            </Grid>
          </Grid>

          {/* Counselor Performance Cards */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            All-Time Counselor Performance
          </Typography>
          <Grid container spacing={3}>
            {counselorPerformance.map((counselor, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <UserActivityCard
                  counselor={counselor}
                  totalCases={totalCases}
                  totalSessions={totalSessions}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Sub-tabs for filtered vs all-time */}
        <Paper sx={{ borderRadius: 2 }}>
          <Tabs
            value={dataToolTab}
            onChange={handleDataToolTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab
              label="Date Range Metrics"
              value="filtered"
              icon={<DateRange />}
              iconPosition="start"
            />
            <Tab
              label="All-Time Metrics"
              value="allTime"
              icon={<Assessment />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Render the appropriate content based on the selected tab */}
        {dataToolTab === "filtered"
          ? renderFilteredMetrics()
          : renderAllTimeMetrics()}

        {/* Download Data Tool Report Button */}
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", mt: 2, gap: 2 }}
        >
          {dataToolTab === "filtered" ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Download />}
              onClick={() => {
                dispatch(
                  downloadReport({
                    startDate: dateRange.startDate.toISOString(),
                    endDate: dateRange.endDate.toISOString(),
                    type: "datatool",
                  })
                );
              }}
              disabled={isDownloading || !isDateRangeValid()}
            >
              Download Date Range Report
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Download />}
              onClick={() => {
                dispatch(
                  downloadReport({
                    startDate: new Date(0).toISOString(), // Use epoch time as start date
                    endDate: new Date().toISOString(),
                    type: "datatool-all-time",
                  })
                );
              }}
              disabled={isDownloading}
            >
              Download All-Time Report
            </Button>
          )}
        </Box>
      </Box>
    );
  };

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
        <Tab icon={<BarChartIcon />} label="Data Tool" value="datatool" />
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
        {selectedView === "datatool" && renderDataToolMetrics()}
        {selectedView === "distribution" && renderCallDistributionView()}
      </Box>
    </Box>
  );
};

export default Reports;
