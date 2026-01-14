import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  Refresh,
  Phone,
  PhoneDisabled,
  Timer,
  CheckCircle,
  PauseCircle,
  Block,
  SupervisorAccount,
} from "@mui/icons-material";
import ContentFrame from "./ContentFrame";
import { callMonitoringService } from "../services/callMonitoringServiceElectron";
import { formatDistanceToNow } from "date-fns";

// Status configuration
const statusConfig = {
  "On Call": { color: "#2196f3", icon: Phone, label: "On Call" },
  Available: { color: "#4caf50", icon: CheckCircle, label: "Available" },
  Offline: { color: "#9e9e9e", icon: Block, label: "Offline" },
  Break: { color: "#ff9800", icon: PauseCircle, label: "Break" },
  "Not Ready": { color: "#f44336", icon: Block, label: "Not Ready" },
};

// Helper function to get status config with fallbacks
const getStatusConfig = (status) => {
  return (
    statusConfig[status] || {
      color: "#9e9e9e",
      icon: Block,
      label: status || "Unknown",
    }
  );
};

// Helper function to format last seen time
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Unknown";
  try {
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
  } catch (error) {
    return "Unknown";
  }
};

const AgentStatusCard = ({ agent }) => {
  const status = getStatusConfig(agent.status);
  const StatusIcon = status.icon;

  // Generate initials from name for avatar
  const initials = agent.name
    ? agent.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "??";

  return (
    <Card
      elevation={2}
      sx={{
        border: 1,
        borderColor: "divider",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: status.color, mr: 2 }}>{initials}</Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 500 }}>
              {agent.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ext: {agent.extension}
            </Typography>
          </Box>
          <Chip
            icon={<StatusIcon sx={{ fontSize: 16 }} />}
            label={status.label}
            size="small"
            sx={{
              bgcolor: `${status.color}15`,
              color: status.color,
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Box>

        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Status Duration
            </Typography>
            <Typography variant="body2">
              {agent.currentCall
                ? agent.currentCall.duration
                  ? `${Math.floor(agent.currentCall.duration / 60)}:${(
                      agent.currentCall.duration % 60
                    )
                      .toString()
                      .padStart(2, "0")}`
                  : "00:00"
                : "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Calls Handled
            </Typography>
            <Typography variant="body2">{agent.callsDone || 0}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Queue
            </Typography>
            <Typography variant="body2">
              {agent.queues && agent.queues.length > 0
                ? agent.queues.join(", ")
                : "None"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Last Seen
            </Typography>
            <Typography variant="body2">
              {agent.status === "Offline"
                ? formatLastSeen(agent.lastSeen)
                : "Currently Online"}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const AgentStatus = ({ open, onClose }) => {
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(callMonitoringService.getDefaultStats());

  // Initialize socket connection
  useEffect(() => {
    if (open) {
      // Connect to socket service if not already connected
      callMonitoringService.connect((newStats) => {
        setStats(newStats);
        if (newStats.activeAgentsList) {
          setAgents(newStats.activeAgentsList);
          setIsLoading(false);
        }
      });
    }

    return () => {
      // No need to disconnect when closing, as other components might be using it
    };
  }, [open]);

  const handleRefresh = () => {
    setIsLoading(true);
    // Re-fetch agent data
    // This will trigger the socket to send updated data
    setTimeout(() => {
      // If no update received after timeout, stop loading indicator
      setIsLoading(false);
    }, 3000);
  };

  const filteredAgents = useMemo(() => {
    return agents.filter(
      (agent) =>
        agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.extension?.includes(searchQuery)
    );
  }, [agents, searchQuery]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return {
      total: agents.length,
      available: agents.filter(
        (a) => a.status === "Available" || a.status === "Registered"
      ).length,
      onCall: agents.filter((a) => a.status === "On Call").length,
      offline: agents.filter((a) => a.status === "Offline").length,
    };
  }, [agents]);

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Agent Status</Typography>
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
      headerColor="#0288d1"
    >
      <Box sx={{ p: 3 }}>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#f5f5f5",
              }}
            >
              <SupervisorAccount color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Agents
                </Typography>
                <Typography variant="h6">{summary.total}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#e8f5e9",
              }}
            >
              <CheckCircle color="success" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Available
                </Typography>
                <Typography variant="h6">{summary.available}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#e3f2fd",
              }}
            >
              <Phone color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  On Call
                </Typography>
                <Typography variant="h6">{summary.onCall}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#ffebee",
              }}
            >
              <Block color="error" />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Offline
                </Typography>
                <Typography variant="h6">{summary.offline}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search agents by name or extension..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {isLoading && agents.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={agent.id || agent.extension}
                >
                  <AgentStatusCard agent={agent} />
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  textAlign="center"
                >
                  {searchQuery
                    ? "No agents found matching your search"
                    : "No agents available"}
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </ContentFrame>
  );
};

export default AgentStatus;
