/**
 * ChanSpy Component - Call Monitoring/Supervision for Supervisors
 * 
 * ============================================================================
 * OVERVIEW
 * ============================================================================
 * ChanSpy (Channel Spy) is an Asterisk feature that allows supervisors to 
 * monitor live calls in real-time. This component provides a UI for:
 * - Viewing all active calls that can be monitored
 * - Starting/stopping monitoring sessions
 * - Switching between monitoring modes
 * 
 * ============================================================================
 * LICENSE REQUIREMENT
 * ============================================================================
 * This feature requires the 'chanspy' license feature to be enabled.
 * Available in: Enterprise and Professional license types.
 * 
 * ============================================================================
 * HOW CHANSPY WORKS (Technical Flow)
 * ============================================================================
 * 1. Supervisor sees list of active calls (fetched via /api/ami/chanspy/channels)
 * 2. Supervisor clicks "Monitor" on a call and selects mode
 * 3. Server sends AMI "Originate" action to supervisor's phone with ChanSpy app
 * 4. Supervisor's phone rings - they MUST answer to start listening
 * 5. Once answered, supervisor hears the call based on selected mode:
 *    - LISTEN: Silent monitoring (hear both parties, cannot speak)
 *    - WHISPER: Speak to agent only (caller cannot hear supervisor)
 *    - BARGE: Speak to both parties (3-way conversation)
 * 6. Supervisor hangs up or clicks "Stop" to end the monitoring session
 * 
 * ============================================================================
 * MONITORING MODES
 * ============================================================================
 * | Mode    | Supervisor Hears | Supervisor Can Speak To | Use Case           |
 * |---------|------------------|-------------------------|---------------------|
 * | Listen  | Both parties     | Nobody                  | QA, Training review |
 * | Whisper | Both parties     | Agent only              | Real-time coaching  |
 * | Barge   | Both parties     | Both parties            | Escalation, Help    |
 * 
 * ============================================================================
 * ASTERISK CHANSPY OPTIONS USED
 * ============================================================================
 * - q: Quiet mode (don't play beep to spied channel)
 * - w: Enable whisper mode (speak to spied channel only)
 * - B: Enable barge mode (speak to both channels)
 * - S: Stop when spied channel hangs up
 * - v(n): Volume adjustment (-4 to +4)
 * - g(group): Only spy on channels in specified group
 * 
 * ============================================================================
 * API ENDPOINTS USED
 * ============================================================================
 * GET  /api/ami/chanspy/channels         - Get list of active calls
 * POST /api/ami/chanspy/start            - Start spy on specific channel
 * POST /api/ami/chanspy/start-by-extension - Start spy by extension (preferred)
 * POST /api/ami/chanspy/stop             - Stop active spy session
 * POST /api/ami/chanspy/switch-mode      - Switch mode during session
 * 
 * ============================================================================
 * WEBSOCKET EVENTS
 * ============================================================================
 * The component listens to these WebSocket events for real-time updates:
 * - callStats: General call statistics update
 * - call:new: New call started
 * - call:end: Call ended
 * 
 * @requires chanspy license feature (Enterprise/Professional)
 * @see server/services/amiService.js - Server-side ChanSpy implementation
 * @see server/routes/amiRoutes.js - API endpoint definitions
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
  Badge,
  Divider,
  Slider,
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
import chanSpyService from "../services/chanSpyService";
import { connectWebSocket } from "../services/websocketService";
import useAuth from "../hooks/useAuth";

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
const ModeButton = ({ mode, currentMode, onClick, disabled }) => {
  const modeInfo = chanSpyService.getModeInfo(mode);
  const isActive = currentMode === mode;

  const getIcon = () => {
    switch (mode) {
      case "listen":
        return <Headphones />;
      case "whisper":
        return <RecordVoiceOver />;
      case "barge":
        return <Phone />;
      default:
        return <Headphones />;
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
        sx={{ minWidth: 120 }}
      >
        {modeInfo.label}
      </Button>
    </Tooltip>
  );
};

// Active Call Card for spy selection
const ActiveCallCard = ({ call, onSpyClick, isSpying, theme }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Calculate initial duration
    const startSeconds = parseDuration(call.duration);
    setDuration(startSeconds);

    // Update duration every second
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.duration]);

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
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.2),
              color: theme.palette.success.main,
            }}
          >
            <PhoneInTalk />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Ext: {call.extension || "Unknown"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {call.callerIdNum} → {call.connectedLineNum}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <AccessTime fontSize="small" color="action" />
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

// Spy Control Panel
const SpyControlPanel = ({
  isSpying,
  currentMode,
  onModeChange,
  onStop,
  targetInfo,
  volume,
  onVolumeChange,
  theme,
}) => {
  if (!isSpying) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha(
          theme.palette.primary.main,
          0.1
        )}, ${alpha(theme.palette.primary.dark, 0.05)})`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Badge color="error" variant="dot" overlap="circular">
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <Headphones />
            </Avatar>
          </Badge>
          <Box>
            <Typography variant="h6">
              Monitoring Active
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Extension: {targetInfo?.extension || targetInfo?.targetExtension || "Unknown"} | 
              Mode: {chanSpyService.getModeInfo(currentMode).label}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="error"
          startIcon={<Stop />}
          onClick={onStop}
        >
          Stop Monitoring
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>
            Monitoring Mode
          </Typography>
          <ButtonGroup variant="outlined" size="small">
            <ModeButton
              mode="listen"
              currentMode={currentMode}
              onClick={onModeChange}
              disabled={false}
            />
            <ModeButton
              mode="whisper"
              currentMode={currentMode}
              onClick={onModeChange}
              disabled={false}
            />
            <ModeButton
              mode="barge"
              currentMode={currentMode}
              onClick={onModeChange}
              disabled={false}
            />
          </ButtonGroup>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>
            Volume: {volume > 0 ? `+${volume}` : volume}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <VolumeMute color="action" />
            <Slider
              value={volume}
              onChange={(_, value) => onVolumeChange(value)}
              min={-4}
              max={4}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
            <VolumeUp color="action" />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Main ChanSpy Component
const ChanSpy = () => {
  const theme = useTheme();
  const { user } = useAuth();
  
  // Get user extension from auth context
  const userExtension = user?.extension || user?.voip_extension || localStorage.getItem("extension");
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeCalls, setActiveCalls] = useState([]);
  const [isSpying, setIsSpying] = useState(false);
  const [currentMode, setCurrentMode] = useState("listen");
  const [volume, setVolume] = useState(0);
  const [targetInfo, setTargetInfo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, call: null });

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

    // Set up polling for active calls
    const interval = setInterval(fetchActiveCalls, 10000);

    return () => clearInterval(interval);
  }, [fetchActiveCalls]);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = connectWebSocket();
    if (ws) {
      const handleCallUpdate = () => {
        fetchActiveCalls();
      };

      ws.on("callStats", handleCallUpdate);
      ws.on("call:new", handleCallUpdate);
      ws.on("call:end", handleCallUpdate);

      return () => {
        ws.off("callStats", handleCallUpdate);
        ws.off("call:new", handleCallUpdate);
        ws.off("call:end", handleCallUpdate);
      };
    }
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
      setError(err.response?.data?.message || err.message || "Failed to start monitoring");
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
      // Even if stop fails, reset the UI state
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
      // For now, we need to restart the spy with new mode
      // Future: implement DTMF-based mode switching
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
            Call Monitoring (ChanSpy)
          </Typography>
          <Typography variant="body2" sx={{ color: "white", opacity: 0.8 }}>
            Monitor, whisper, or barge into active calls
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip
            label={`Your Ext: ${userExtension || "Not Set"}`}
            color="default"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={fetchActiveCalls} sx={{ color: "white" }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Spy Control Panel */}
      <SpyControlPanel
        isSpying={isSpying}
        currentMode={currentMode}
        onModeChange={handleModeChange}
        onStop={handleStopSpy}
        targetInfo={targetInfo}
        volume={volume}
        onVolumeChange={setVolume}
        theme={theme}
      />

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
                  <Chip
                    label={info.label}
                    color={info.color}
                    size="small"
                    variant="outlined"
                  />
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
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h6">
            Active Calls ({activeCalls.length})
          </Typography>
          {isLoading && <CircularProgress size={24} />}
        </Box>

        {activeCalls.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Phone sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
            <Typography color="text.secondary">
              No active calls to monitor
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active calls will appear here when agents are on calls
            </Typography>
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
            You are about to monitor the call on extension{" "}
            <strong>{confirmDialog.call?.extension || "Unknown"}</strong>.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Select Monitoring Mode:
            </Typography>
            <ButtonGroup fullWidth sx={{ mb: 2 }}>
              <ModeButton
                mode="listen"
                currentMode={currentMode}
                onClick={setCurrentMode}
                disabled={false}
              />
              <ModeButton
                mode="whisper"
                currentMode={currentMode}
                onClick={setCurrentMode}
                disabled={false}
              />
              <ModeButton
                mode="barge"
                currentMode={currentMode}
                onClick={setCurrentMode}
                disabled={false}
              />
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
          <Button onClick={() => setConfirmDialog({ open: false, call: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrow />}
            onClick={() => handleStartSpy(confirmDialog.call, currentMode)}
            disabled={isLoading}
          >
            Start Monitoring
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChanSpy;
