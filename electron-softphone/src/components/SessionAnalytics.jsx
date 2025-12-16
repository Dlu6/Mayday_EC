import React, { useState, useEffect } from "react";
import ContentFrame from "./ContentFrame";
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  Refresh,
  Person,
  Assessment,
  Timeline,
  SupervisorAccount,
} from "@mui/icons-material";
import { fetchStats } from "../api/datatoolApi";

// Enhanced StatCard component
const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Paper
    elevation={3} // Increased shadow
    sx={{
      p: 2,
      height: "100%",
      bgcolor: `${color}15`,
      border: 1,
      borderColor: `${color}30`,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: (theme) => theme.shadows[12], // Increased hover shadow
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

// User Activity Card with enhanced progress visualization
const UserActivityCard = ({ user, totalPosts, totalSessions }) => {
  const postPercentage = (user.posts / totalPosts) * 100;
  const sessionPercentage = (user.sessions / totalSessions) * 100;

  return (
    <Card
      elevation={3} // Increased shadow
      sx={{
        height: "100%",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: (theme) => theme.shadows[12], // Increased hover shadow
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
          <Person sx={{ color: "primary.main" }} />
          <Typography variant="h6">{user.name}</Typography>
          <Chip
            label={user.role === "CREATOR" ? "Counselor" : "Supervisor"}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* Enhanced Activity Progress Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Posts Activity
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
              Posts
            </Typography>
            <Typography variant="h6">{user.posts}</Typography>
            <Typography variant="caption" color="text.secondary">
              Total interactions initiated
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography color="text.secondary" variant="body2">
              Sessions
            </Typography>
            <Typography variant="h6">
              {user.sessions.toLocaleString()}
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

const SessionAnalytics = ({ open, onClose }) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  const handleRefresh = () => {
    loadStats();
  };

  // Calculate summary statistics
  const totalPosts = stats.reduce((sum, user) => sum + user.posts, 0);
  const totalSessions = stats.reduce((sum, user) => sum + user.sessions, 0);
  const activeUsers = stats.length;

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Session Analytics</Typography>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ color: "inherit" }}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Refresh />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      }
      headerColor="#1976d2"
    >
      <Box sx={{ p: 3 }}>
        {error ? (
          <Paper sx={{ p: 2, bgcolor: "#fdeded" }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {/* Summary Statistics */}
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total Posts"
                value={totalPosts.toLocaleString()}
                icon={<Assessment sx={{ color: "#2196f3" }} />}
                color="#2196f3"
                subtitle="Across all users"
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
                subtitle="Current period"
              />
            </Grid>

            {/* User Stats Grid */}
            {stats.map((user) => (
              <Grid item xs={12} sm={6} md={4} key={user.userId}>
                <UserActivityCard
                  user={user}
                  totalPosts={totalPosts}
                  totalSessions={totalSessions}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </ContentFrame>
  );
};

export default SessionAnalytics;
