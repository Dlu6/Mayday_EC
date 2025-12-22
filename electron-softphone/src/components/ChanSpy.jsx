/**
 * ChanSpy Component - Call Monitoring for Electron Softphone
 * 
 * ============================================================================
 * OVERVIEW
 * ============================================================================
 * ChanSpy (Channel Spy) allows supervisors to monitor live calls in real-time.
 * This component provides both compact (sidebar) and full view modes.
 * 
 * ============================================================================
 * LICENSE REQUIREMENT
 * ============================================================================
 * Requires 'chanspy' license feature (Enterprise/Professional plans).
 * 
 * ============================================================================
 * HOW IT WORKS
 * ============================================================================
 * 1. Supervisor views active calls (via /api/ami/chanspy/channels)
 * 2. Clicks "Monitor" and selects mode (Listen/Whisper/Barge)
 * 3. Server originates call to supervisor's phone with ChanSpy application
 * 4. Supervisor answers phone to start monitoring
 * 5. Based on mode:
 *    - LISTEN: Hear both parties silently (QA, training)
 *    - WHISPER: Speak to agent only (coaching)
 *    - BARGE: Speak to both parties (escalation)
 * 6. Hang up or click "Stop" to end session
 * 
 * ============================================================================
 * COMPONENT MODES
 * ============================================================================
 * - compact={true}: Minimal UI for sidebar/panel integration
 * - compact={false}: Full-featured standalone view
 * 
 * ============================================================================
 * REAL-TIME UPDATES
 * ============================================================================
 * - Polls every 10 seconds as fallback
 * - WebSocket events: callStats, call:new, call:end, call:status
 * 
 * @requires chanspy license feature
 * @prop {boolean} compact - Use compact mode for sidebar integration
 * @prop {function} onClose - Callback when close button clicked (full mode)
 */

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
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
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  Slider,
  Badge,
} from "@mui/material";
import {
  Headphones,
  RecordVoiceOver,
  Phone,
  PhoneInTalk,
  Stop,
  Refresh,
  AccessTime,
  Visibility,
  VisibilityOff,
  VolumeUp,
  VolumeMute,
  PlayArrow,
} from "@mui/icons-material";
import { chanSpyService } from "../services/chanSpyService";
import { storageService } from "../services/storageService";
import websocketService from "../services/websocketService";

// Format duration in MM:SS
const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Parse duration string (e.g., "00:01:23") to seconds
const parseDuration = (durationStr) => {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

// Mode Button Component
const ModeButton = ({ mode, currentMode, onClick, disabled, size = "small" }) => {
  const modeInfo = chanSpyService.getModeInfo(mode);
  const isActive = currentMode === mode;

  const getIcon = () => {
    switch (mode) {
      case "listen":
        return <Headphones fontSize={size} />;
      case "whisper":
        return <RecordVoiceOver fontSize={size} />;
      case "barge":
        return <Phone fontSize={size} />;
      default:
        return <Headphones fontSize={size} />;
    }
  };

  return (
    <Tooltip title={modeInfo.description}>
      <Button
        variant={isActive ? "contained" : "outlined"}
        color={modeInfo.color}
        onClick={() => onClick(mode)}
        disabled={disabled}
        startIcon={getIcon()}
        size={size}
        sx={{ minWidth: size === "small" ? 100 : 120 }}
      >
        {modeInfo.label}
      </Button>
    </Tooltip>
  );
};

// Active Call Card for spy selection
const ActiveCallCard = ({ call, onSpyClick, isSpying, theme, compact = false }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const startSeconds = parseDuration(call.duration);
    setDuration(startSeconds);

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.duration]);

  if (compact) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.success.main, 0.1),
          border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PhoneInTalk fontSize="small" color="success" />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Ext: {call.extension || "N/A"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDuration(duration)}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          color={isSpying ? "error" : "primary"}
          onClick={() => onSpyClick(call)}
        >
          {isSpying ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
        </IconButton>
      </Box>
    );
  }

  return (
    <Card
      sx={{
        borderLeft: 4,
        borderColor: theme.palette.success.main,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.2),
              color: theme.palette.success.main,
              width: 40,
              height: 40,
            }}
          >
            <PhoneInTalk />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="medium">
              Ext: {call.extension || "Unknown"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {call.callerIdNum} → {call.connectedLineNum}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <AccessTime sx={{ fontSize: 12 }} color="action" />
              <Typography variant="caption" color="text.secondary">
                {formatDuration(duration)}
              </Typography>
            </Box>
          </Box>
          <Tooltip title={isSpying ? "Stop Monitoring" : "Start Monitoring"}>
            <IconButton
              color={isSpying ? "error" : "primary"}
              onClick={() => onSpyClick(call)}
              sx={{
                bgcolor: alpha(
                  isSpying ? theme.palette.error.main : theme.palette.primary.main,
                  0.1
                ),
              }}
            >
              {isSpying ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

// Main ChanSpy Component for Electron Softphone
const ChanSpy = ({ compact = false, onClose }) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [activeCalls, setActiveCalls] = useState([]);
  const [isSpying, setIsSpying] = useState(false);
  const [currentMode, setCurrentMode] = useState("listen");
  const [volume, setVolume] = useState(0);
  const [targetInfo, setTargetInfo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, call: null });

  // Get user extension from storage
  const userExtension = storageService.getExtension() || localStorage.getItem("extension");

  // Fetch active calls
  const fetchActiveCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      const calls = await chanSpyService.getSpyableChannels();
      setActiveCalls(calls);
    } catch (err) {
      console.error("Error fetching active calls:", err);
      setError("Failed to fetch active calls");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, 10000);
    return () => clearInterval(interval);
  }, [fetchActiveCalls]);

  // WebSocket for real-time updates
  useEffect(() => {
    const handleCallUpdate = () => {
      fetchActiveCalls();
    };

    // Listen for call-related events
    websocketService.on("callStats", handleCallUpdate);
    websocketService.on("call:new", handleCallUpdate);
    websocketService.on("call:end", handleCallUpdate);
    websocketService.on("call:status", handleCallUpdate);

    return () => {
      websocketService.off("callStats", handleCallUpdate);
      websocketService.off("call:new", handleCallUpdate);
      websocketService.off("call:end", handleCallUpdate);
      websocketService.off("call:status", handleCallUpdate);
    };
  }, [fetchActiveCalls]);

  // Start spying
  const handleStartSpy = async (call, mode = "listen") => {
    if (!userExtension) {
      setError("Your extension is not configured. Please log in again.");
      return;
    }

    try {
      setIsLoading(true);

      const result = call.extension
        ? await chanSpyService.startChanSpyByExtension(userExtension, call.extension, {
            mode,
            volume,
            quiet: true,
          })
        : await chanSpyService.startChanSpy(userExtension, call.channel, {
            mode,
            volume,
            quiet: true,
          });

      if (result.success) {
        setIsSpying(true);
        setCurrentMode(mode);
        setTargetInfo({
          ...call,
          ...result.data,
        });
        setSuccess(`Started monitoring extension ${call.extension || "call"} in ${mode} mode`);
      } else {
        setError(result.message || "Failed to start monitoring");
      }
    } catch (err) {
      setError(err.message || "Failed to start monitoring");
    } finally {
      setIsLoading(false);
      setConfirmDialog({ open: false, call: null });
    }
  };

  // Stop spying
  const handleStopSpy = async () => {
    if (!userExtension) return;

    try {
      setIsLoading(true);
      const result = await chanSpyService.stopChanSpy(userExtension);

      if (result.success) {
        setIsSpying(false);
        setTargetInfo(null);
        setSuccess("Monitoring stopped");
      } else {
        setError(result.message || "Failed to stop monitoring");
      }
    } catch (err) {
      setIsSpying(false);
      setTargetInfo(null);
      console.error("Error stopping spy:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Change mode during active spy
  const handleModeChange = async (newMode) => {
    if (!isSpying || newMode === currentMode) return;

    try {
      await handleStopSpy();
      if (targetInfo) {
        await handleStartSpy(targetInfo, newMode);
      }
    } catch (err) {
      setError("Failed to change mode. Please try again.");
    }
  };

  // Handle spy click
  const handleSpyClick = (call) => {
    if (isSpying) {
      handleStopSpy();
    } else {
      setConfirmDialog({ open: true, call });
    }
  };

  // Compact view for sidebar/panel integration
  if (compact) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            Call Monitoring
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isLoading && <CircularProgress size={16} />}
            <IconButton size="small" onClick={fetchActiveCalls}>
              <Refresh fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Active Spy Status */}
        {isSpying && (
          <Paper
            sx={{
              p: 1.5,
              mb: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Badge color="error" variant="dot">
                  <Headphones fontSize="small" color="primary" />
                </Badge>
                <Typography variant="body2">
                  Monitoring Ext: {targetInfo?.extension || "N/A"}
                </Typography>
              </Box>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<Stop fontSize="small" />}
                onClick={handleStopSpy}
              >
                Stop
              </Button>
            </Box>
            <Box sx={{ mt: 1 }}>
              <ButtonGroup size="small" fullWidth>
                <ModeButton mode="listen" currentMode={currentMode} onClick={handleModeChange} size="small" />
                <ModeButton mode="whisper" currentMode={currentMode} onClick={handleModeChange} size="small" />
                <ModeButton mode="barge" currentMode={currentMode} onClick={handleModeChange} size="small" />
              </ButtonGroup>
            </Box>
          </Paper>
        )}

        {/* Active Calls List */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          Active Calls ({activeCalls.length})
        </Typography>

        {activeCalls.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
            No active calls
          </Typography>
        ) : (
          activeCalls.map((call) => (
            <ActiveCallCard
              key={call.uniqueId || call.channel}
              call={call}
              onSpyClick={handleSpyClick}
              isSpying={isSpying && targetInfo?.channel === call.channel}
              theme={theme}
              compact
            />
          ))
        )}

        {/* Confirm Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog({ open: false, call: null })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Start Monitoring</DialogTitle>
          <DialogContent>
            <Typography variant="body2" gutterBottom>
              Monitor extension <strong>{confirmDialog.call?.extension || "Unknown"}</strong>
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Mode:
              </Typography>
              <ButtonGroup size="small" fullWidth sx={{ mb: 2 }}>
                <ModeButton mode="listen" currentMode={currentMode} onClick={setCurrentMode} size="small" />
                <ModeButton mode="whisper" currentMode={currentMode} onClick={setCurrentMode} size="small" />
                <ModeButton mode="barge" currentMode={currentMode} onClick={setCurrentMode} size="small" />
              </ButtonGroup>

              <Typography variant="caption" color="text.secondary" gutterBottom>
                Volume: {volume > 0 ? `+${volume}` : volume}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
                <VolumeMute fontSize="small" color="action" />
                <Slider
                  value={volume}
                  onChange={(_, value) => setVolume(value)}
                  min={-4}
                  max={4}
                  step={1}
                  marks
                  size="small"
                  valueLabelDisplay="auto"
                />
                <VolumeUp fontSize="small" color="action" />
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              Your phone will ring. Answer to start.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={() => setConfirmDialog({ open: false, call: null })}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => handleStartSpy(confirmDialog.call, currentMode)}
              disabled={isLoading}
            >
              Start
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbars */}
        <Snackbar
          open={!!error}
          autoHideDuration={4000}
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess(null)}
        >
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // Full view
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ color: "white", mb: 0.5 }}>
            Call Monitoring (ChanSpy)
          </Typography>
          <Typography variant="body2" sx={{ color: "white", opacity: 0.8 }}>
            Monitor, whisper, or barge into active calls
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip
            label={`Your Ext: ${userExtension || "Not Set"}`}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
          />
          <IconButton onClick={fetchActiveCalls} sx={{ color: "white" }}>
            <Refresh />
          </IconButton>
          {onClose && (
            <Button variant="outlined" size="small" onClick={onClose} sx={{ color: "white", borderColor: "white" }}>
              Close
            </Button>
          )}
        </Box>
      </Paper>

      {/* Active Spy Control Panel */}
      {isSpying && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            background: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Badge color="error" variant="dot" overlap="circular">
                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 36, height: 36 }}>
                  <Headphones fontSize="small" />
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="subtitle1" fontWeight="medium">
                  Monitoring Active
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Extension: {targetInfo?.extension || "N/A"} | Mode: {chanSpyService.getModeInfo(currentMode).label}
                </Typography>
              </Box>
            </Box>
            <Button variant="contained" color="error" size="small" startIcon={<Stop />} onClick={handleStopSpy}>
              Stop Monitoring
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Mode
              </Typography>
              <ButtonGroup size="small">
                <ModeButton mode="listen" currentMode={currentMode} onClick={handleModeChange} />
                <ModeButton mode="whisper" currentMode={currentMode} onClick={handleModeChange} />
                <ModeButton mode="barge" currentMode={currentMode} onClick={handleModeChange} />
              </ButtonGroup>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Volume: {volume > 0 ? `+${volume}` : volume}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <VolumeMute fontSize="small" color="action" />
                <Slider
                  value={volume}
                  onChange={(_, value) => setVolume(value)}
                  min={-4}
                  max={4}
                  step={1}
                  marks
                  size="small"
                  valueLabelDisplay="auto"
                  sx={{ flex: 1 }}
                />
                <VolumeUp fontSize="small" color="action" />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Mode Legend */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Monitoring Modes
        </Typography>
        <Grid container spacing={2}>
          {["listen", "whisper", "barge"].map((mode) => {
            const info = chanSpyService.getModeInfo(mode);
            return (
              <Grid item xs={12} sm={4} key={mode}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip label={info.label} color={info.color} size="small" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {info.description}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Active Calls */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6">Active Calls ({activeCalls.length})</Typography>
          {isLoading && <CircularProgress size={20} />}
        </Box>

        {activeCalls.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Phone sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
            <Typography color="text.secondary">No active calls to monitor</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {activeCalls.map((call) => (
              <Grid item xs={12} sm={6} md={4} key={call.uniqueId || call.channel}>
                <ActiveCallCard
                  call={call}
                  onSpyClick={handleSpyClick}
                  isSpying={isSpying && targetInfo?.channel === call.channel}
                  theme={theme}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, call: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start Call Monitoring</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Monitor extension <strong>{confirmDialog.call?.extension || "Unknown"}</strong>
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Select Monitoring Mode:
            </Typography>
            <ButtonGroup fullWidth sx={{ mb: 2 }}>
              <ModeButton mode="listen" currentMode={currentMode} onClick={setCurrentMode} />
              <ModeButton mode="whisper" currentMode={currentMode} onClick={setCurrentMode} />
              <ModeButton mode="barge" currentMode={currentMode} onClick={setCurrentMode} />
            </ButtonGroup>

            <Typography variant="subtitle2" gutterBottom>
              Volume Adjustment:
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 2 }}>
              <VolumeMute color="action" />
              <Slider
                value={volume}
                onChange={(_, value) => setVolume(value)}
                min={-4}
                max={4}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
              <VolumeUp color="action" />
            </Box>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            Your phone will ring. Answer it to start monitoring.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, call: null })}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => handleStartSpy(confirmDialog.call, currentMode)}
            disabled={isLoading}
          >
            Start Monitoring
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChanSpy;
