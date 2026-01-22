import {
  Box,
  Card,
  Grid,
  Typography,
  useTheme,
  alpha,
  Paper,
  LinearProgress,
  Stack,
  IconButton,
  Tooltip,
  Badge,
  Chip,
} from "@mui/material";
import TalkIcon from "@mui/icons-material/Forum";
import AnswerIcon from "@mui/icons-material/QuestionAnswer";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import TimerIcon from "@mui/icons-material/Timer";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useState, useEffect, useRef } from "react";
import callStatsService from "../services/callStatsService";
import AgentAvailability from "./AgentAvailability";
import { connectWebSocket } from "../services/websocketService";

const StatCard = ({ title, value, icon, color, tooltip, isLoading }) => {
  return (
    <Tooltip title={tooltip || ""} arrow placement="top">
      <Card
        sx={{
          p: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          borderRadius: 3,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.95)",
          border: "1px solid rgba(0,0,0,0.06)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "help",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            borderColor: alpha(color, 0.3),
          },
        }}
      >
        {/* Header with colored background */}
        <Box
          sx={{
            p: 2.5,
            backgroundColor: alpha(color, 0.08),
            borderBottom: `1px solid ${alpha(color, 0.1)}`,
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: "white",
              color: color,
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
          <Typography
            variant="h3"
            sx={{
              mb: 1,
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "-0.02em",
              transition: "all 0.3s ease",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: "0.5px",
              fontSize: "0.75rem",
              transition: "all 0.3s ease",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {title}
          </Typography>
        </Box>

        {/* Bottom accent */}
        <Box
          sx={{
            height: 4,
            backgroundColor: color,
            opacity: 0.8,
          }}
        />
      </Card>
    </Tooltip>
  );
};

// Helper function to format time in MM:SS format
const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

// Helper function to format wait time with better readability
const formatWaitTime = (seconds) => {
  if (!seconds && seconds !== 0) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};


const Dashboard = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [queueActivity, setQueueActivity] = useState({ serviceLevel: 0 });
  const [abandonRateStats, setAbandonRateStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [activeAgentsList, setActiveAgentsList] = useState([]);

  // Reference to socket for refresh functionality
  const socketRef = useRef(null);

  // Helper to format stats array for display
  const formatStatsForDisplay = (callStats) => {
    return [
      {
        title: "WAITING",
        value: callStats.waiting || 0,
        icon: <PhoneCallbackIcon />,
        color: theme.palette.info.main,
        tooltip: "Number of callers currently waiting in queue to be connected to an agent",
      },
      {
        title: "TALKING",
        value: callStats.talking || 0,
        icon: <TalkIcon />,
        color: theme.palette.warning.main,
        tooltip: "Number of calls currently being handled by agents",
      },
      {
        title: "ANSWERED",
        value: callStats.answered || 0,
        icon: <AnswerIcon />,
        color: theme.palette.success.main,
        tooltip: "Total number of calls answered by agents today",
      },
      {
        title: "ABANDONED",
        value: callStats.abandoned || 0,
        icon: <PhoneMissedIcon />,
        color: theme.palette.error.main,
        tooltip: "Total number of calls where the caller hung up before being answered today",
      },
      {
        title: "TOTAL OFFERED",
        value: callStats.totalOffered || 0,
        icon: <PhoneForwardedIcon />,
        color: theme.palette.primary.main,
        tooltip: "Total number of calls received today (Answered + Abandoned)",
      },
      {
        title: "AVERAGE HOLD TIME",
        value: formatTime(callStats.avgHoldTime),
        icon: <TimerIcon />,
        color: "#6b7280",
        tooltip: "Average time callers waited in queue before being answered today",
      },
    ];
  };

  // Initialize WebSocket connection and subscribe to real-time callStats
  useEffect(() => {
    const socket = connectWebSocket();
    if (!socket) return;

    // Store socket reference for refresh functionality
    socketRef.current = socket;
    setIsConnected(socket.connected);

    const onConnect = () => {
      setIsConnected(true);
      // Subscribe to call stats updates like the Electron softphone does
      socket.emit("subscribeToCallStats");
    };
    const onDisconnect = () => setIsConnected(false);

    // Handle real-time callStats updates from server
    const onCallStats = (data) => {
      // Extract waiting/talking from activeCallsList if available
      const activeCallsList = data.activeCallsList || [];
      const waiting = activeCallsList.filter(
        (call) => call.status === "waiting" || call.status === "queued" || call.status === "ringing"
      ).length;
      const talking = activeCallsList.filter(
        (call) => call.status === "answered" || call.status === "in-progress"
      ).length;

      // Use CDR-based abandoned count (already filtered for today by the server)
      // Queue stats are cumulative since Asterisk restart, not daily filtered
      const totalCalls = data.totalCalls || 0;
      const abandonedCalls = Math.min(data.abandonedCalls || 0, totalCalls);
      const answeredCalls = Math.max(0, totalCalls - abandonedCalls);

      // Build callStats object from real-time data
      const callStats = {
        waiting: waiting,
        talking: talking,
        answered: answeredCalls,
        abandoned: abandonedCalls,
        totalOffered: totalCalls,
        avgHoldTime: 0, // Would need to be calculated from queue data
      };

      // Update stats for display
      const formattedStats = formatStatsForDisplay(callStats);
      setStats(formattedStats);

      // Update queue activity from real-time data
      if (data.queueStatus && data.queueStatus.length > 0) {
        const queue = data.queueStatus[0];
        setQueueActivity({
          serviceLevel: queue.sla || 0,
          waitTime: 0,
          abandonRate: queue.abandonRate || 0,
        });
      }

      // Extract activeAgentsList from WebSocket data (same as Electron softphone)
      if (data.activeAgentsList && Array.isArray(data.activeAgentsList)) {
        setActiveAgentsList(data.activeAgentsList);
      }

      setLastUpdated(new Date());
      setIsLoading(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("callStats", onCallStats);

    // If already connected, subscribe immediately
    if (socket.connected) {
      socket.emit("subscribeToCallStats");
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("callStats", onCallStats);
    };
  }, [theme]);

  // Initial fetch for queue activity and abandon rate (one-time, not polling)
  // Call stats come exclusively from WebSocket to prevent flickering
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const queueData = await callStatsService.getQueueActivity();
        const abandonStats = await callStatsService.getAbandonRateStats();
        setQueueActivity(queueData);
        setAbandonRateStats(abandonStats);
      } catch (error) {
        console.error("Error fetching initial dashboard data:", error);
      }
    };

    fetchInitialData();
    // No polling - WebSocket is the single source of truth for stats
  }, []);

  // Refresh handler - triggers WebSocket re-subscription for fresh data
  const handleRefresh = () => {
    if (!socketRef.current) {
      console.warn("Cannot refresh: WebSocket not connected");
      return;
    }

    setIsLoading(true);

    // Re-subscribe to get fresh stats from server
    socketRef.current.emit("subscribeToCallStats");

    // Also refresh queue activity and abandon stats
    (async () => {
      try {
        const queueData = await callStatsService.getQueueActivity();
        const abandonStats = await callStatsService.getAbandonRateStats();
        setQueueActivity(queueData);
        setAbandonRateStats(abandonStats);
      } catch (error) {
        console.error("Error refreshing queue data:", error);
      }
    })();

    // Loading will be set to false when callStats event arrives
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <Box sx={{ p: 1, pt: 0, backgroundColor: "#fafafa", minHeight: "100vh" }}>
      {/* Enhanced Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DashboardIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="700">
                Daily Stats Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time monitoring and analytics for call center operations
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: "right" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
              <Badge
                variant="dot"
                sx={{
                  mt: 0.5,
                  "& .MuiBadge-badge": {
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: isConnected ? "#00ff04ff" : undefined
                  }
                }}
                color={isConnected ? "success" : "error"}
              >
                <Chip
                  label={isLoading ? "Updating..." : isConnected ? "Live" : "Disconnected"}
                  size="small"
                  variant="filled"
                  sx={{
                    backgroundColor: isLoading
                      ? alpha(theme.palette.warning.main, 0.1)
                      : isConnected ? "#00ff04ff" : undefined,
                    color: isLoading
                      ? theme.palette.warning.main
                      : isConnected ? "#000" : undefined,
                    fontWeight: 500
                  }}
                  color={isLoading ? undefined : isConnected ? undefined : "error"}
                />
              </Badge>
            </Box>
            <Tooltip title="Refresh Data">
              <span>
                <IconButton
                  onClick={handleRefresh}
                  disabled={isLoading}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Stats Grid */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="subtitle1"
          fontWeight="600"
          sx={{ mb: 1.5, color: "text.secondary" }}
        >
          Key Performance Indicators
        </Typography>
        <Grid container spacing={2}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={4} key={index}>
              <StatCard {...stat} isLoading={isLoading} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Enhanced Queue Activity */}
      <Paper
        sx={{
          mt: 4,
          p: 0,
          borderRadius: 3,
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            >
              <ShowChartIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="600">
                Queue Activity Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time performance metrics and service levels
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                    }}
                  >
                    <SpeedIcon />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="600"
                    color="text.secondary"
                  >
                    SERVICE LEVEL
                  </Typography>
                </Stack>

                <Typography
                  variant="h4"
                  fontWeight="700"
                  sx={{
                    mb: 2,
                    color: theme.palette.success.main,
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {queueActivity.serviceLevel}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={queueActivity.serviceLevel}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      backgroundColor: theme.palette.success.main,
                    },
                  }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                    }}
                  >
                    <AccessTimeIcon />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="600"
                    color="text.secondary"
                  >
                    AVERAGE WAIT TIME
                  </Typography>
                </Stack>

                <Typography
                  variant="h4"
                  fontWeight="700"
                  sx={{
                    mb: 1,
                    color: theme.palette.info.main,
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {formatWaitTime(queueActivity.waitTime)}
                </Typography>

                {/* Show additional wait time info */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2, fontSize: "0.875rem" }}
                >
                  Average time to answer calls today
                </Typography>

                <LinearProgress
                  variant="determinate"
                  value={Math.min((queueActivity.waitTime / 180) * 100, 100)} // Scale to 3 minutes max for better visualization
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      backgroundColor: theme.palette.info.main,
                    },
                  }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.error.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      color: theme.palette.error.main,
                    }}
                  >
                    <TrendingDownIcon />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="600"
                    color="text.secondary"
                  >
                    ABANDON RATE
                  </Typography>
                </Stack>

                <Typography
                  variant="h4"
                  fontWeight="700"
                  sx={{
                    mb: 1,
                    color: theme.palette.error.main,
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {abandonRateStats?.today?.abandonRate ||
                    queueActivity.abandonRate ||
                    0}
                  %
                </Typography>

                {/* Show call counts */}
                {abandonRateStats?.today && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, fontSize: "0.875rem" }}
                  >
                    {abandonRateStats.today.abandonedCalls} of{" "}
                    {abandonRateStats.today.totalCalls} calls abandoned today
                  </Typography>
                )}

                <LinearProgress
                  variant="determinate"
                  value={
                    abandonRateStats?.today?.abandonRate ||
                    queueActivity.abandonRate ||
                    0
                  }
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    transition: "all 0.3s ease",
                    opacity: isLoading ? 0.7 : 1,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      backgroundColor: theme.palette.error.main,
                    },
                  }}
                />

                {/* Show additional stats if available */}
                {abandonRateStats && (
                  <Stack direction="row" spacing={2} mt={2}>
                    <Box sx={{ textAlign: "center", flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        This Week
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        color="text.primary"
                      >
                        {abandonRateStats.week?.abandonRate || 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        This Month
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        color="text.primary"
                      >
                        {abandonRateStats.month?.abandonRate || 0}%
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Hourly Abandon Rate Trend */}
          {abandonRateStats?.hourlyBreakdown &&
            abandonRateStats.hourlyBreakdown.length > 0 && (
              <Paper
                sx={{
                  mt: 3,
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                }}
              >
                <Typography variant="h6" fontWeight="600" mb={2}>
                  Hourly Abandon Rate Trend (Today)
                </Typography>
                <Grid container spacing={2}>
                  {abandonRateStats.hourlyBreakdown.map((hourData, index) => (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 1,
                          backgroundColor: "white",
                          border: "1px solid rgba(0,0,0,0.1)",
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {hourData.hour}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          color="text.primary"
                        >
                          {hourData.abandonRate}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {hourData.abandonedCalls}/{hourData.totalCalls}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
        </Box>
      </Paper>

      {/* Agent Availability Section */}
      <Box sx={{ mt: 4 }}>
        <AgentAvailability agents={activeAgentsList} />
      </Box>
    </Box>
  );
};

export default Dashboard;
