import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  Stack,
  Chip,
  Avatar,
  Grid,
  CircularProgress,
  Divider,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import PhoneIcon from "@mui/icons-material/Phone";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import { useState, useEffect } from "react";
import callStatsService from "../services/callStatsService";

const AgentAvailability = ({ agents: propAgents = [] }) => {
  const theme = useTheme();
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Use agents from prop (WebSocket) if available, otherwise fetch via REST API as fallback
  useEffect(() => {
    // If we have agents from WebSocket prop, use them
    if (propAgents && propAgents.length > 0) {
      setAgents(propAgents);
      setIsLoading(false);
      return;
    }

    // Fallback: Fetch via REST API if WebSocket data not available
    const fetchAgents = async () => {
      setIsLoading(true);
      try {
        const agentsData = await callStatsService.getAllAgentsWithStatus();
        setAgents(agentsData || []);
      } catch (error) {
        console.error("Error fetching agents:", error);
        setAgents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();

    // Refresh every 30 seconds as backup
    const intervalId = setInterval(fetchAgents, 30000);
    return () => clearInterval(intervalId);
  }, [propAgents]);

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "available":
      case "ready":
      case "registered":
      case "online":
        return theme.palette.success.main;
      case "on call":
      case "oncall":
      case "busy":
      case "talking":
      case "ringing":
        return theme.palette.error.main;
      case "paused":
      case "break":
      case "away":
        return theme.palette.warning.main;
      case "offline":
      case "unavailable":
      case "unregistered":
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "available":
      case "ready":
      case "registered":
      case "online":
        return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case "on call":
      case "oncall":
      case "busy":
      case "talking":
      case "ringing":
        return <PhoneInTalkIcon sx={{ fontSize: 16 }} />;
      case "paused":
      case "break":
      case "away":
        return <PauseCircleIcon sx={{ fontSize: 16 }} />;
      case "offline":
      case "unavailable":
      case "unregistered":
        return <WifiOffIcon sx={{ fontSize: 16 }} />;
      default:
        return <WifiOffIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getStatusLabel = (status, pauseReason) => {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === "paused" || normalizedStatus === "break") {
      return pauseReason?.label || "Paused";
    }
    return status || "Offline";
  };

  // Count agents by status
  const statusCounts = agents.reduce(
    (acc, agent) => {
      const status = agent.status?.toLowerCase();
      if (
        status === "available" ||
        status === "ready" ||
        status === "registered"
      ) {
        acc.available++;
      } else if (
        status === "on call" ||
        status === "oncall" ||
        status === "busy" ||
        status === "talking"
      ) {
        acc.busy++;
      } else if (status === "paused" || status === "break") {
        acc.paused++;
      } else {
        acc.offline++;
      }
      return acc;
    },
    { available: 0, busy: 0, paused: 0, offline: 0 }
  );

  return (
    <Paper
      sx={{
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
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
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
              <GroupIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="600">
                Agent Availability
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time agent status overview
              </Typography>
            </Box>
          </Stack>

          {/* Status Summary Chips */}
          <Stack direction="row" spacing={1}>
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
              label={`${statusCounts.available} Available`}
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                fontWeight: 400,
                "& .MuiChip-icon": { color: theme.palette.success.main },
              }}
            />
            <Chip
              icon={<PhoneInTalkIcon sx={{ fontSize: 16 }} />}
              label={`${statusCounts.busy} Busy`}
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                fontWeight: 400,
                "& .MuiChip-icon": { color: theme.palette.error.main },
              }}
            />
            <Chip
              icon={<PauseCircleIcon sx={{ fontSize: 16 }} />}
              label={`${statusCounts.paused} Paused`}
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
                fontWeight: 400,
                "& .MuiChip-icon": { color: theme.palette.warning.main },
              }}
            />
          </Stack>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        ) : agents.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No agents available
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Agent List */}
            <Grid item xs={12} md={selectedAgent ? 8 : 12}>
              <Grid container spacing={2}>
                {agents.map((agent, index) => (
                  <Grid item xs={12} sm={6} md={selectedAgent ? 6 : 4} lg={selectedAgent ? 4 : 3} key={agent.extension || index}>
                    <Paper
                      onClick={() => setSelectedAgent(agent)}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(getStatusColor(agent.status), 0.05),
                        border: `1px solid ${alpha(getStatusColor(agent.status), selectedAgent?.extension === agent.extension ? 0.5 : 0.2)}`,
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        outline: selectedAgent?.extension === agent.extension ? `2px solid ${getStatusColor(agent.status)}` : "none",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 8px 20px ${alpha(getStatusColor(agent.status), 0.2)}`,
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            backgroundColor: alpha(getStatusColor(agent.status), 0.2),
                            color: getStatusColor(agent.status),
                          }}
                        >
                          <PersonIcon />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            noWrap
                            sx={{ color: "text.primary" }}
                          >
                            {agent.name || `Agent ${agent.extension}`}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            Ext: {agent.extension}
                          </Typography>
                        </Box>
                        <Chip
                          icon={getStatusIcon(agent.status)}
                          label={getStatusLabel(agent.status, agent.pauseReason)}
                          size="small"
                          sx={{
                            backgroundColor: alpha(getStatusColor(agent.status), 0.1),
                            color: getStatusColor(agent.status),
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            "& .MuiChip-icon": {
                              color: getStatusColor(agent.status),
                            },
                          }}
                        />
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Agent Details Panel */}
            {selectedAgent && (
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 0,
                    borderRadius: 2,
                    backgroundColor: "white",
                    border: `1px solid ${alpha(getStatusColor(selectedAgent.status), 0.3)}`,
                    overflow: "hidden",
                    position: "sticky",
                    top: 16,
                  }}
                >
                  {/* Agent Details Header */}
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: alpha(getStatusColor(selectedAgent.status), 0.08),
                      borderBottom: `1px solid ${alpha(getStatusColor(selectedAgent.status), 0.1)}`,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          backgroundColor: alpha(getStatusColor(selectedAgent.status), 0.1),
                          color: getStatusColor(selectedAgent.status),
                        }}
                      >
                        <InfoIcon />
                      </Box>
                      <Typography variant="h6" fontWeight="600">
                        Agent Details
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Agent Info */}
                  <Box sx={{ p: 3 }}>
                    <Stack alignItems="center" spacing={2} mb={3}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          backgroundColor: alpha(getStatusColor(selectedAgent.status), 0.2),
                          color: getStatusColor(selectedAgent.status),
                          fontSize: 32,
                        }}
                      >
                        <HeadsetMicIcon sx={{ fontSize: 40 }} />
                      </Avatar>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="h6" fontWeight="700">
                          {selectedAgent.name || `Agent ${selectedAgent.extension}`}
                        </Typography>
                        <Chip
                          icon={getStatusIcon(selectedAgent.status)}
                          label={getStatusLabel(selectedAgent.status, selectedAgent.pauseReason)}
                          size="small"
                          sx={{
                            mt: 1,
                            backgroundColor: alpha(getStatusColor(selectedAgent.status), 0.1),
                            color: getStatusColor(selectedAgent.status),
                            fontWeight: 600,
                            "& .MuiChip-icon": {
                              color: getStatusColor(selectedAgent.status),
                            },
                          }}
                        />
                      </Box>
                    </Stack>

                    <Divider sx={{ mb: 3 }} />

                    {/* Agent Stats */}
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.info.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                          <PhoneIcon sx={{ fontSize: 18, color: theme.palette.info.main }} />
                          <Typography variant="body2" fontWeight="600" color="text.secondary">
                            Extension
                          </Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight="700" color="text.primary">
                          {selectedAgent.extension}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.success.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                          <PhoneInTalkIcon sx={{ fontSize: 18, color: theme.palette.success.main }} />
                          <Typography variant="body2" fontWeight="600" color="text.secondary">
                            Calls Handled Today
                          </Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight="700" color="text.primary">
                          {selectedAgent.callsDone || selectedAgent.callsHandled || 0}
                        </Typography>
                      </Box>

                      {selectedAgent.avgTalkTime !== undefined && (
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.warning.main, 0.05),
                            border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                            <AccessTimeIcon sx={{ fontSize: 18, color: theme.palette.warning.main }} />
                            <Typography variant="body2" fontWeight="600" color="text.secondary">
                              Avg Talk Time
                            </Typography>
                          </Stack>
                          <Typography variant="h5" fontWeight="700" color="text.primary">
                            {Math.floor(selectedAgent.avgTalkTime / 60)}m {selectedAgent.avgTalkTime % 60}s
                          </Typography>
                        </Box>
                      )}

                      {selectedAgent.queue && (
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                            <GroupIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                            <Typography variant="body2" fontWeight="600" color="text.secondary">
                              Queue
                            </Typography>
                          </Stack>
                          <Typography variant="h6" fontWeight="700" color="text.primary">
                            {selectedAgent.queue}
                          </Typography>
                        </Box>
                      )}

                      {selectedAgent.pauseReason && (
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.warning.main, 0.05),
                            border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                            <PauseCircleIcon sx={{ fontSize: 18, color: theme.palette.warning.main }} />
                            <Typography variant="body2" fontWeight="600" color="text.secondary">
                              Pause Reason
                            </Typography>
                          </Stack>
                          <Typography variant="body1" fontWeight="600" color="text.primary">
                            {selectedAgent.pauseReason.label || selectedAgent.pauseReason}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </Paper>
  );
};

export default AgentAvailability;
