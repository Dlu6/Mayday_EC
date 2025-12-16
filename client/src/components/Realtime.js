// client/src/components/Realtime.js
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  Grid,
  Typography,
  useTheme,
  alpha,
  Paper,
  CircularProgress,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  Phone,
  PhoneInTalk,
  PauseCircle,
  PlayArrow,
  Person,
  Refresh,
  AccessTime,
  TrendingUp,
  Groups,
  PhoneMissed,
} from "@mui/icons-material";
import { connectWebSocket } from "../services/websocketService";
import callStatsService from "../services/callStatsService";
import cdrService from "../services/cdrService";

// Format duration in MM:SS
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Agent Status Badge Component
const AgentStatusBadge = ({ status, pauseReason }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "ready":
      case "registered":
        return { color: "success", label: "Available", icon: <PlayArrow fontSize="small" /> };
      case "on call":
      case "oncall":
      case "busy":
        return { color: "error", label: "On Call", icon: <PhoneInTalk fontSize="small" /> };
      case "paused":
      case "break":
        return { 
          color: "warning", 
          label: pauseReason?.label || "Paused", 
          icon: <PauseCircle fontSize="small" /> 
        };
      case "offline":
      default:
        return { color: "default", label: "Offline", icon: <Person fontSize="small" /> };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size="small"
      variant="filled"
      sx={{ fontWeight: 500 }}
    />
  );
};

// Realtime Agent Card Component
const AgentCard = ({ agent, theme }) => {
  const [pauseDuration, setPauseDuration] = useState(0);

  // Update pause duration every second if agent is paused
  useEffect(() => {
    if (agent.status?.toLowerCase() === "paused" && agent.pauseStartTime) {
      const interval = setInterval(() => {
        const duration = Math.floor((Date.now() - new Date(agent.pauseStartTime).getTime()) / 1000);
        setPauseDuration(duration);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setPauseDuration(0);
    }
  }, [agent.status, agent.pauseStartTime]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "ready":
      case "registered":
        return theme.palette.success.main;
      case "on call":
      case "oncall":
      case "busy":
        return theme.palette.error.main;
      case "paused":
      case "break":
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Card
      sx={{
        p: 2,
        height: "100%",
        borderLeft: 4,
        borderColor: getStatusColor(agent.status),
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: alpha(getStatusColor(agent.status), 0.2),
            color: getStatusColor(agent.status),
          }}
        >
          <Person />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {agent.name || `Agent ${agent.extension}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ext: {agent.extension}
          </Typography>
        </Box>
        <AgentStatusBadge status={agent.status} pauseReason={agent.pauseReason} />
      </Box>

      {/* Pause Duration */}
      {agent.status?.toLowerCase() === "paused" && pauseDuration > 0 && (
        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <AccessTime fontSize="small" color="warning" />
          <Typography variant="body2" color="warning.main">
            Paused for: {formatDuration(pauseDuration)}
          </Typography>
        </Box>
      )}

      {/* Call Info */}
      {agent.status?.toLowerCase() === "on call" && agent.currentCall && (
        <Box sx={{ mt: 2, p: 1, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 1 }}>
          <Typography variant="caption" color="error.main">
            On call with: {agent.currentCall.callerId || "Unknown"}
          </Typography>
        </Box>
      )}

      {/* Stats */}
      <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Calls Today
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {agent.callsDone || 0}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Avg Handle
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {agent.avgHandleTime || "0:00"}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color, subtitle, trend }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: "100%",
        bgcolor: alpha(color, 0.1),
        border: 1,
        borderColor: alpha(color, 0.2),
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(color, 0.2),
            color,
          }}
        >
          {icon}
        </Box>
      </Box>
      {trend !== undefined && (
        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 0.5 }}>
          <TrendingUp
            fontSize="small"
            sx={{
              color: trend >= 0 ? "success.main" : "error.main",
              transform: trend < 0 ? "rotate(180deg)" : "none",
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: trend >= 0 ? "success.main" : "error.main" }}
          >
            {trend >= 0 ? "+" : ""}{trend}% from last hour
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

const Realtime = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [enrichedAgents, setEnrichedAgents] = useState([]);
  const [stats, setStats] = useState({
    totalAgents: 0,
    availableAgents: 0,
    onCallAgents: 0,
    pausedAgents: 0,
    offlineAgents: 0,
    totalCalls: 0,
    answeredCalls: 0,
    abandonedCalls: 0,
    waitingCalls: 0,
  });
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Calculate agent stats from agent list
  const calculateAgentStats = useCallback((agentList) => {
    const available = agentList.filter(
      (a) => ["available", "ready", "registered"].includes(a.status?.toLowerCase())
    ).length;
    const onCall = agentList.filter(
      (a) => ["on call", "oncall", "busy"].includes(a.status?.toLowerCase())
    ).length;
    const paused = agentList.filter(
      (a) => ["paused", "break"].includes(a.status?.toLowerCase())
    ).length;
    const offline = agentList.filter(
      (a) => !a.status || a.status?.toLowerCase() === "offline"
    ).length;

    return {
      totalAgents: agentList.length,
      availableAgents: available,
      onCallAgents: onCall,
      pausedAgents: paused,
      offlineAgents: offline,
    };
  }, []);

  const syncPausedAgentsSnapshot = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const actualToken = token?.startsWith("Bearer ") ? token.split(" ")[1] : token;
      if (!actualToken) return;

      const isDevelopment = window.location.hostname === "localhost";
      const host = window.location.hostname;
      const port = isDevelopment ? ":8004" : "";
      const baseUrl = `${window.location.protocol}//${host}${port}/api`;

      const response = await fetch(`${baseUrl}/pause/agents/paused`, {
        headers: { Authorization: `Bearer ${actualToken}` },
      });
      if (!response.ok) return;

      const result = await response.json();
      const paused = Array.isArray(result?.data) ? result.data : [];
      if (!paused.length) return;

      setAgents((prev) => {
        const map = new Map(prev.map((a) => [String(a.extension), a]));

        for (const p of paused) {
          const ext = String(p.extension);
          const existing = map.get(ext) || { extension: ext, name: `Agent ${ext}` };
          map.set(ext, {
            ...existing,
            status: "Paused",
            pauseReason: p.pauseReason || existing.pauseReason || null,
            pauseStartTime: p.startTime || p.pauseStartTime || existing.pauseStartTime || null,
          });
        }

        const next = Array.from(map.values());
        const agentStats = calculateAgentStats(next);
        setStats((prevStats) => ({ ...prevStats, ...agentStats }));
        return next;
      });
      setLastUpdate(new Date());
    } catch (_) {
      // non-fatal
    }
  }, [calculateAgentStats]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [callStats, agentsData] = await Promise.all([
        callStatsService.getCallStats(),
        callStatsService.getActiveAgents(),
      ]);

      if (callStats) {
        setStats((prev) => ({
          ...prev,
          totalCalls: callStats.totalCalls || 0,
          answeredCalls: callStats.answered || callStats.answeredCalls || 0,
          abandonedCalls: callStats.abandoned || callStats.missedCalls || 0,
          waitingCalls: callStats.waiting || 0,
        }));
      }

      if (agentsData) {
        setAgents(agentsData);
        const agentStats = calculateAgentStats(agentsData);
        setStats((prev) => ({ ...prev, ...agentStats }));
      }

      // Ensure paused agents are reflected even if WS events were missed
      await syncPausedAgentsSnapshot();

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching realtime data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateAgentStats, syncPausedAgentsSnapshot]);

  // Enrich agents with per-extension CDR counts (answered today as callsDone)
  // without mutating the source list to avoid update loops
  useEffect(() => {
    let cancelled = false;

    const enrich = async () => {
      if (!agents || agents.length === 0) {
        setEnrichedAgents([]);
        return;
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const results = await Promise.all(
          agents.map(async (agent) => {
            if (!agent?.extension) return { agent, counts: null };
            try {
              const resp = await cdrService.getCallCountsByExtension(
                agent.extension,
                todayStr
              );
              return { agent, counts: resp?.data || null };
            } catch (_) {
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

        const totalCallsToday = updated.reduce(
          (sum, a) => sum + (Number(a.callsDone) || 0),
          0
        );

        // Align "Total Calls Today" to CDR answeredCalls (handled calls), while
        // keeping other stats (answered/abandoned/waiting) sourced from call stats.
        setStats((prev) => ({
          ...prev,
          totalCalls: totalCallsToday,
        }));
      } finally {
        // no-op
      }
    };

    enrich();
    return () => {
      cancelled = true;
    };
  }, [agents]);

  // Initialize WebSocket connection
  useEffect(() => {
    let cleanup = undefined;

    try {
      const newSocket = connectWebSocket();
      if (!newSocket) return undefined;

      setSocket(newSocket);
      setIsConnected(newSocket.connected);

      const onConnect = async () => {
        setIsConnected(true);
        await syncPausedAgentsSnapshot();
      };
      const onDisconnect = () => setIsConnected(false);
      const onReconnect = async () => {
        setIsConnected(true);
        await syncPausedAgentsSnapshot();
      };

      newSocket.on("connect", onConnect);
      newSocket.on("disconnect", onDisconnect);
      newSocket.io?.on?.("reconnect", onReconnect);

      cleanup = () => {
        try {
          newSocket.off("connect", onConnect);
          newSocket.off("disconnect", onDisconnect);
          newSocket.io?.off?.("reconnect", onReconnect);
          newSocket.disconnect();
        } catch (_) {
          void 0;
        }
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }

    return cleanup;
  }, [syncPausedAgentsSnapshot]);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle agent status updates
    const handleAgentStatusUpdate = (data) => {
      setAgents((prevAgents) => {
        const updatedAgents = [...prevAgents];
        const agentIndex = updatedAgents.findIndex(
          (agent) => agent.extension === data.extension
        );

        if (agentIndex !== -1) {
          updatedAgents[agentIndex] = {
            ...updatedAgents[agentIndex],
            status: data.status,
            pauseReason: data.pauseReason || null,
            pauseStartTime: data.startTime || null,
            lastSeen: data.timestamp,
          };
        } else {
          // New agent
          updatedAgents.push({
            extension: data.extension,
            name: data.name || `Agent ${data.extension}`,
            status: data.status,
            pauseReason: data.pauseReason || null,
            pauseStartTime: data.startTime || null,
          });
        }

        // Recalculate stats
        const agentStats = calculateAgentStats(updatedAgents);
        setStats((prev) => ({ ...prev, ...agentStats }));

        return updatedAgents;
      });
      setLastUpdate(new Date());
    };

    // Handle agent paused event
    const handleAgentPaused = (data) => {
      console.log("Agent paused:", data);
      handleAgentStatusUpdate({
        extension: data.extension,
        status: "Paused",
        pauseReason: data.pauseReason,
        startTime: data.startTime,
        timestamp: data.timestamp,
      });
    };

    // Handle agent unpaused event
    const handleAgentUnpaused = (data) => {
      console.log("Agent unpaused:", data);
      handleAgentStatusUpdate({
        extension: data.extension,
        status: "Available",
        pauseReason: null,
        startTime: null,
        timestamp: data.timestamp,
      });
    };

    // Handle call stats updates
    const handleCallStatsUpdate = (data) => {
      if (data.type === "call:stats" || data.data) {
        const s = data.data || data;
        setStats((prev) => ({
          ...prev,
          totalCalls: s.totalCalls || s.totalOffered || prev.totalCalls,
          answeredCalls: s.answered || s.answeredCalls || prev.answeredCalls,
          abandonedCalls: s.abandoned || s.missedCalls || prev.abandonedCalls,
          waitingCalls: s.waiting || prev.waitingCalls,
        }));
        setLastUpdate(new Date());
      }
    };

    socket.on("agent:status_update", handleAgentStatusUpdate);
    socket.on("agent:paused", handleAgentPaused);
    socket.on("agent:unpaused", handleAgentUnpaused);
    socket.on("agent:status", handleAgentStatusUpdate);
    socket.on("call:stats", handleCallStatsUpdate);

    return () => {
      socket.off("agent:status_update", handleAgentStatusUpdate);
      socket.off("agent:paused", handleAgentPaused);
      socket.off("agent:unpaused", handleAgentUnpaused);
      socket.off("agent:status", handleAgentStatusUpdate);
      socket.off("call:stats", handleCallStatsUpdate);
    };
  }, [socket, isConnected, calculateAgentStats]);

  const displayedAgents = enrichedAgents.length ? enrichedAgents : agents;

  // Sort agents by status priority
  const sortedAgents = [...displayedAgents].sort((a, b) => {
    const priority = { "on call": 0, oncall: 0, busy: 0, paused: 1, break: 1, available: 2, ready: 2, registered: 2, offline: 3 };
    const aPriority = priority[a.status?.toLowerCase()] ?? 4;
    const bPriority = priority[b.status?.toLowerCase()] ?? 4;
    return aPriority - bPriority;
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ color: "white", mb: 0.5 }}>
            Realtime Agent Monitor
          </Typography>
          <Typography variant="body2" sx={{ color: "white", opacity: 0.8 }}>
            Live agent status and call statistics
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {lastUpdate && (
            <Typography variant="caption" sx={{ color: "white", opacity: 0.7 }}>
              Last update: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} sx={{ color: "white" }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Badge
            color={isConnected ? "success" : "error"}
            variant="dot"
            sx={{ "& .MuiBadge-badge": { width: 12, height: 12, borderRadius: "50%" } }}
          >
            <Chip
              label={isConnected ? "Live" : "Disconnected"}
              color={isConnected ? "success" : "error"}
              size="small"
              variant="filled"
            />
          </Badge>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Agents"
            value={stats.totalAgents}
            icon={<Groups fontSize="large" />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Available"
            value={stats.availableAgents}
            icon={<PlayArrow fontSize="large" />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="On Call"
            value={stats.onCallAgents}
            icon={<PhoneInTalk fontSize="large" />}
            color={theme.palette.error.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Paused"
            value={stats.pausedAgents}
            icon={<PauseCircle fontSize="large" />}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {/* Call Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Calls Today"
            value={stats.totalCalls}
            icon={<Phone fontSize="large" />}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Answered"
            value={stats.answeredCalls}
            icon={<PhoneInTalk fontSize="large" />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Abandoned"
            value={stats.abandonedCalls}
            icon={<PhoneMissed fontSize="large" />}
            color={theme.palette.error.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Waiting"
            value={stats.waitingCalls}
            icon={<AccessTime fontSize="large" />}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {/* Agent Grid */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Agent Status ({displayedAgents.length})
        </Typography>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : sortedAgents.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">No agents found</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {sortedAgents.map((agent) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={agent.extension}>
                <AgentCard agent={agent} theme={theme} />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default Realtime;
