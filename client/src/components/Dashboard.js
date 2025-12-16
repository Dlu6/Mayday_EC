import {
  Box,
  Card,
  Grid,
  Typography,
  useTheme,
  alpha,
  Paper,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
} from "@mui/material";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import { useState, useEffect } from "react";
import callStatsService from "../services/callStatsService";
import { connectWebSocket } from "../services/websocketService";
import cdrService from "../services/cdrService";
import {
  Phone,
  PhoneInTalk,
  PhoneMissed,
  PhoneForwarded,
  PhoneCallback,
  Timer,
  CallEnd,
} from "@mui/icons-material";

// Agent Status Component with pause reason support
const AgentStatusChip = ({ status, pauseReason }) => {
  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "available":
      case "ready":
      case "registered":
        return "success";
      case "on call":
      case "oncall":
      case "busy":
        return "error";
      case "paused":
      case "break":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status, pauseReason) => {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === "paused" || normalizedStatus === "break") {
      return pauseReason?.label || "Paused";
    }
    return status || "Offline";
  };

  return (
    <Chip
      label={getStatusLabel(status, pauseReason)}
      color={getStatusColor(status)}
      size="small"
      variant="outlined"
      sx={{
        borderColor: pauseReason?.color || undefined,
        color: pauseReason?.color || undefined,
      }}
    />
  );
};

// Active Agents List Component
const ActiveAgentsList = ({ agents, isLoading }) => {
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">No agents available</Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {agents.map((agent, index) => (
        <ListItem
          key={agent.extension || index}
          sx={{
            borderBottom: index < agents.length - 1 ? "1px solid" : "none",
            borderColor: "divider",
            py: 1,
          }}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
              <SupervisorAccountIcon fontSize="small" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight="medium">
                {agent.name || `Agent ${agent.extension}`}
              </Typography>
            }
            secondary={
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mt: 0.5,
                  }}
                >
                  <AgentStatusChip status={agent.status} pauseReason={agent.pauseReason} />
                  <span>Ext: {agent.extension}</span>
                  {agent.callsDone > 0 && (
                    <>
                      <span>•</span>
                      <span>{agent.callsDone} calls</span>
                    </>
                  )}
                </Box>
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

const StatCard = ({ title, value, icon, color, trend, isLoading }) => {
  const theme = useTheme();

  const getIcon = () => {
    if (icon) return icon;

    // Map titles to appropriate icons
    if (title.toLowerCase().includes("total")) return <Phone />;
    if (title.toLowerCase().includes("answered")) return <PhoneInTalk />;
    if (title.toLowerCase().includes("missed")) return <PhoneMissed />;
    if (title.toLowerCase().includes("outbound")) return <PhoneForwarded />;
    if (title.toLowerCase().includes("inbound")) return <PhoneCallback />;
    if (title.toLowerCase().includes("duration")) return <Timer />;
    if (title.toLowerCase().includes("abandon")) return <CallEnd />;

    return <Phone />;
  };

  const getIconColor = () => {
    if (color) return color;

    // Map titles to appropriate colors
    if (title.toLowerCase().includes("total")) return "#1976d2";
    if (title.toLowerCase().includes("answered")) return "#2e7d32";
    if (title.toLowerCase().includes("missed")) return "#d32f2f";
    if (title.toLowerCase().includes("outbound")) return "#ed6c02";
    if (title.toLowerCase().includes("inbound")) return "#9c27b0";
    if (title.toLowerCase().includes("duration")) return "#1565c0";
    if (title.toLowerCase().includes("abandon")) return "#f57c00";

    return "#1976d2";
  };

  return (
    <Card
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        boxShadow: theme.shadows[2],
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: theme.shadows[8],
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "4px",
          backgroundColor: getIconColor(),
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: alpha(getIconColor(), 0.1),
            color: getIconColor(),
          }}
        >
          {getIcon()}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color:
              trend > 0
                ? "success.main"
                : trend < 0
                ? "error.main"
                : "text.secondary",
            display: "flex",
            alignItems: "center",
          }}
        >
          {trend !== null ? `${trend}% from last hour` : "No trend data"}
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold" }}>
          {value}
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: "auto" }}>
        {title}
      </Typography>
    </Card>
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

const Dashboard = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [queueActivity, setQueueActivity] = useState({ serviceLevel: 0 });
  const [activeAgents, setActiveAgents] = useState([]);
  const [enrichedAgents, setEnrichedAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  // WebSocket connection for real-time updates
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    try {
      const newSocket = connectWebSocket();
      if (newSocket) {
        setSocket(newSocket);
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  }, []);

  // Fetch call statistics
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [callStats, queueData, agentsData] = await Promise.all([
          callStatsService.getCallStats(),
          callStatsService.getQueueActivity(),
          callStatsService.getActiveAgents(),
        ]);

        if (callStats) {
          const mappedStats = {
            waiting: callStats.waiting || 0,
            talking: callStats.talking || 0,
            answered: callStats.answered || callStats.answeredCalls || 0,
            abandoned: callStats.abandoned || callStats.missedCalls || 0,
            totalOffered: callStats.totalOffered || callStats.totalCalls || 0,
            avgHoldTime:
              callStats.avgHoldTime || callStats.avgCallDuration || 0,
          };
          // Compute abandonRate if not provided
          const computedAbandonRate = mappedStats.totalOffered
            ? Math.round(
                (mappedStats.abandoned / mappedStats.totalOffered) * 100
              )
            : 0;
          mappedStats.abandonRate =
            callStats.abandonRate ?? computedAbandonRate;

          setStats(mappedStats);
          // Merge the computed abandon rate into queue activity
          setQueueActivity({
            ...queueData,
            abandonRate: mappedStats.abandonRate,
          });
          setActiveAgents(agentsData || []);
          setEnrichedAgents([]);
          setAgentsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for agent status updates
    const handleAgentStatusUpdate = (data) => {
      // Handle both formats: { type: "agent:status", ... } and direct { extension, status, ... }
      const extension = data.extension;
      const status = data.data?.status || data.status;
      const pauseReason = data.data?.pauseReason || data.pauseReason;
      const timestamp = data.data?.timestamp || data.timestamp;

      if (extension && status) {
        setActiveAgents((prevAgents) => {
          const updatedAgents = [...prevAgents];
          const agentIndex = updatedAgents.findIndex(
            (agent) => agent.extension === extension
          );

          if (agentIndex !== -1) {
            updatedAgents[agentIndex] = {
              ...updatedAgents[agentIndex],
              status: status,
              pauseReason: pauseReason || null,
              lastSeen: timestamp,
            };
          }

          return updatedAgents;
        });
      }
    };

    // Listen for agent paused events
    const handleAgentPaused = (data) => {
      console.log("Agent paused event received:", data);
      setActiveAgents((prevAgents) => {
        const updatedAgents = [...prevAgents];
        const agentIndex = updatedAgents.findIndex(
          (agent) => agent.extension === data.extension
        );

        if (agentIndex !== -1) {
          updatedAgents[agentIndex] = {
            ...updatedAgents[agentIndex],
            status: "Paused",
            pauseReason: data.pauseReason,
            pauseStartTime: data.startTime,
            lastSeen: data.timestamp,
          };
        }

        return updatedAgents;
      });
    };

    // Listen for agent unpaused events
    const handleAgentUnpaused = (data) => {
      console.log("Agent unpaused event received:", data);
      setActiveAgents((prevAgents) => {
        const updatedAgents = [...prevAgents];
        const agentIndex = updatedAgents.findIndex(
          (agent) => agent.extension === data.extension
        );

        if (agentIndex !== -1) {
          updatedAgents[agentIndex] = {
            ...updatedAgents[agentIndex],
            status: "Available",
            pauseReason: null,
            pauseStartTime: null,
            lastSeen: data.timestamp,
          };
        }

        return updatedAgents;
      });
    };

    // Listen for call stats updates
    const handleCallStatsUpdate = (data) => {
      if (data.type === "call:stats") {
        const s = data.data || {};
        const mappedStats = {
          waiting: s.waiting || 0,
          talking: s.talking || 0,
          answered: s.answered || s.answeredCalls || 0,
          abandoned: s.abandoned || s.missedCalls || 0,
          totalOffered: s.totalOffered || s.totalCalls || 0,
          avgHoldTime: s.avgHoldTime || s.avgCallDuration || 0,
        };
        const computedAbandonRate = mappedStats.totalOffered
          ? Math.round((mappedStats.abandoned / mappedStats.totalOffered) * 100)
          : 0;
        mappedStats.abandonRate = s.abandonRate ?? computedAbandonRate;

        setStats((prevStats) => ({ ...prevStats, ...mappedStats }));
      }
    };

    // Listen for agent availability changes
    const handleAgentAvailabilityChange = (data) => {
      if (data.type === "extension:availability_changed") {
        // Refresh agent list when availability changes
        callStatsService.getActiveAgents().then((agentsData) => {
          setActiveAgents(agentsData || []);
        });
      }
    };

    socket.on("agent:status", handleAgentStatusUpdate);
    socket.on("agent:status_update", handleAgentStatusUpdate);
    socket.on("agent:paused", handleAgentPaused);
    socket.on("agent:unpaused", handleAgentUnpaused);
    socket.on("call:stats", handleCallStatsUpdate);
    socket.on("extension:availability_changed", handleAgentAvailabilityChange);

    return () => {
      socket.off("agent:status", handleAgentStatusUpdate);
      socket.off("agent:status_update", handleAgentStatusUpdate);
      socket.off("agent:paused", handleAgentPaused);
      socket.off("agent:unpaused", handleAgentUnpaused);
      socket.off("call:stats", handleCallStatsUpdate);
      socket.off(
        "extension:availability_changed",
        handleAgentAvailabilityChange
      );
    };
  }, [socket, isConnected]);

  // Removed periodic polling to avoid duplicate loads; rely on sockets

  // Enrich agents with per-extension CDR counts (answered today as callsDone),
  // without mutating the source list to avoid update loops
  useEffect(() => {
    let cancelled = false;
    const enrich = async () => {
      if (!activeAgents || activeAgents.length === 0) return;
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const results = await Promise.all(
          activeAgents.map(async (agent) => {
            if (!agent?.extension) return { agent, counts: null };
            try {
              const resp = await cdrService.getCallCountsByExtension(
                agent.extension,
                todayStr
              );
              return { agent, counts: resp?.data || null };
            } catch (e) {
              return { agent, counts: null };
            }
          })
        );

        if (cancelled) return;

        const updated = results.map(({ agent, counts }) => ({
          ...agent,
          callsDone: counts?.answeredCalls || 0,
          callStats: counts || undefined,
        }));
        setEnrichedAgents(updated);
      } finally {
        // no-op
      }
    };
    enrich();
    return () => {
      cancelled = true;
    };
  }, [activeAgents]);

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        }}
      >
        <Typography variant="h4" sx={{ color: "white", mb: 1 }}>
          Daily Stats Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: "white", opacity: 0.8 }}>
          Real-time monitoring and analytics!
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {stats &&
          Object.entries(stats).map(([key, value]) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <StatCard
                title={key.replace(/([A-Z])/g, " $1").trim()}
                value={value}
                icon={null}
                color={null}
                trend={null}
                isLoading={isLoading}
              />
            </Grid>
          ))}
      </Grid>

      {/* Activity Overview */}
      <Paper sx={{ mt: 4, p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Queue Activity
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Service Level
              </Typography>
              {isLoading ? (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}
                >
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading...</Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h6">
                    {queueActivity.serviceLevel}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={queueActivity.serviceLevel}
                    sx={{
                      mt: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        backgroundColor: theme.palette.primary.main,
                      },
                    }}
                  />
                </>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Average Wait Time
              </Typography>
              {isLoading ? (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}
                >
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading...</Typography>
                </Box>
              ) : (
                <Typography variant="h6">
                  {formatTime(queueActivity.waitTime)}
                </Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Abandon Rate
              </Typography>
              {isLoading ? (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}
                >
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading...</Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h6">
                    {queueActivity.abandonRate}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={queueActivity.abandonRate}
                    sx={{
                      mt: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        backgroundColor: theme.palette.error.main,
                      },
                    }}
                  />
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Active Agents */}
      <Paper sx={{ mt: 4, p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Active Agents
        </Typography>
        <ActiveAgentsList
          agents={enrichedAgents.length > 0 ? enrichedAgents : activeAgents}
          isLoading={agentsLoading}
        />
      </Paper>
    </Box>
  );
};

export default Dashboard;
