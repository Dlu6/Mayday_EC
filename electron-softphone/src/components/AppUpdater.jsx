import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
} from "@mui/material";
import {
  SystemUpdateAlt as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  NewReleases as NewReleasesIcon,
} from "@mui/icons-material";
import { updateService } from "../services/updateService";

/**
 * AppUpdater Component
 * Displays update status and provides update controls
 */
const AppUpdater = ({ variant = "icon" }) => {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("");

  useEffect(() => {
    // Subscribe to update status changes
    const unsubscribe = updateService.subscribe((status) => {
      setUpdateStatus(status);
      setIsChecking(false);

      // Auto-open dialog when update is available
      if (status.status === "available") {
        setIsDialogOpen(true);
      }
    });

    // Get current version
    updateService.getAppVersion().then(setCurrentVersion);

    return unsubscribe;
  }, []);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setUpdateStatus({ status: "checking", message: "Checking for updates..." });
    await updateService.checkForUpdates();
  };

  const handleDownload = async () => {
    await updateService.downloadUpdate();
  };

  const handleInstall = async () => {
    await updateService.installUpdate();
  };

  const getStatusIcon = () => {
    if (!updateStatus) return <UpdateIcon />;

    switch (updateStatus.status) {
      case "available":
        return <NewReleasesIcon color="warning" />;
      case "downloaded":
        return <CheckCircleIcon color="success" />;
      case "downloading":
        return <DownloadIcon color="primary" />;
      case "not-available":
        return <CheckCircleIcon color="success" />;
      case "error":
        return <UpdateIcon color="error" />;
      default:
        return <UpdateIcon />;
    }
  };

  const getStatusColor = () => {
    if (!updateStatus) return "default";

    switch (updateStatus.status) {
      case "available":
        return "warning";
      case "downloaded":
        return "success";
      case "error":
        return "error";
      default:
        return "primary";
    }
  };

  // Icon button variant (for use in app bar)
  if (variant === "icon") {
    return (
      <>
        <Tooltip title={updateStatus?.message || "Check for updates"}>
          <IconButton
            onClick={() => setIsDialogOpen(true)}
            size="small"
            sx={{
              color: updateStatus?.status === "available" ? "warning.main" : "inherit",
              animation:
                updateStatus?.status === "available"
                  ? "pulse 2s infinite"
                  : "none",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.1)" },
                "100%": { transform: "scale(1)" },
              },
            }}
          >
            {getStatusIcon()}
          </IconButton>
        </Tooltip>

        <UpdateDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          updateStatus={updateStatus}
          currentVersion={currentVersion}
          isChecking={isChecking}
          onCheck={handleCheckForUpdates}
          onDownload={handleDownload}
          onInstall={handleInstall}
        />
      </>
    );
  }

  // Dialog content variant (for embedding in external Dialog)
  if (variant === "dialog") {
    return (
      <UpdateDialogContent
        updateStatus={updateStatus}
        currentVersion={currentVersion}
        isChecking={isChecking}
        onCheck={handleCheckForUpdates}
        onDownload={handleDownload}
        onInstall={handleInstall}
      />
    );
  }

  // Full button variant
  return (
    <>
      <Button
        variant="outlined"
        startIcon={getStatusIcon()}
        onClick={() => setIsDialogOpen(true)}
        color={getStatusColor()}
        size="small"
      >
        {updateStatus?.status === "available"
          ? "Update Available"
          : "Check Updates"}
      </Button>

      <UpdateDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        updateStatus={updateStatus}
        currentVersion={currentVersion}
        isChecking={isChecking}
        onCheck={handleCheckForUpdates}
        onDownload={handleDownload}
        onInstall={handleInstall}
      />
    </>
  );
};

/**
 * Update Dialog Component
 */
const UpdateDialog = ({
  open,
  onClose,
  updateStatus,
  currentVersion,
  isChecking,
  onCheck,
  onDownload,
  onInstall,
}) => {
  const renderContent = () => {
    if (!updateStatus || updateStatus.status === "checking" || isChecking) {
      return (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <RefreshIcon
            sx={{
              fontSize: 48,
              color: "primary.main",
              animation: "spin 1s linear infinite",
              "@keyframes spin": {
                from: { transform: "rotate(0deg)" },
                to: { transform: "rotate(360deg)" },
              },
            }}
          />
          <Typography sx={{ mt: 2 }}>Checking for updates...</Typography>
        </Box>
      );
    }

    switch (updateStatus.status) {
      case "available":
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              A new version is available!
            </Alert>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Chip
                label={`Current: v${currentVersion}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`New: v${updateStatus.version}`}
                size="small"
                color="primary"
              />
            </Box>
            {updateStatus.releaseNotes && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {typeof updateStatus.releaseNotes === "string"
                  ? updateStatus.releaseNotes
                  : "New features and improvements available."}
              </Typography>
            )}
          </Box>
        );

      case "downloading":
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" gutterBottom>
              Downloading update...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={updateStatus.percent || 0}
              sx={{ height: 8, borderRadius: 1, mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {updateStatus.percent?.toFixed(1)}% complete
              {updateStatus.bytesPerSecond &&
                ` (${(updateStatus.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s)`}
            </Typography>
          </Box>
        );

      case "downloaded":
        return (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: "success.main" }} />
            <Typography sx={{ mt: 2, fontWeight: 500 }}>
              Update Ready to Install
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Version {updateStatus.version} has been downloaded. Restart the
              app to apply the update.
            </Typography>
          </Box>
        );

      case "not-available":
        return (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: "success.main" }} />
            <Typography sx={{ mt: 2, fontWeight: 500 }}>
              You're up to date!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Version {currentVersion} is the latest version.
            </Typography>
          </Box>
        );

      case "error":
        return (
          <Box sx={{ py: 2 }}>
            <Alert severity="error">
              {updateStatus.message || "Failed to check for updates"}
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Please check your internet connection and try again.
            </Typography>
          </Box>
        );

      default:
        return (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <UpdateIcon sx={{ fontSize: 48, color: "text.secondary" }} />
            <Typography sx={{ mt: 2 }}>
              Click "Check for Updates" to get started.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Current version: {currentVersion}
            </Typography>
          </Box>
        );
    }
  };

  const renderActions = () => {
    if (!updateStatus || isChecking) {
      return null;
    }

    switch (updateStatus.status) {
      case "available":
        return (
          <>
            <Button onClick={onClose}>Later</Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={onDownload}
            >
              Download Update
            </Button>
          </>
        );

      case "downloading":
        return (
          <Button disabled>Downloading...</Button>
        );

      case "downloaded":
        return (
          <>
            <Button onClick={onClose}>Later</Button>
            <Button
              variant="contained"
              color="success"
              onClick={onInstall}
            >
              Restart & Install
            </Button>
          </>
        );

      default:
        return (
          <>
            <Button onClick={onClose}>Close</Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={onCheck}
            >
              Check for Updates
            </Button>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <UpdateIcon color="primary" />
          <span>Software Update</span>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>{renderActions()}</DialogActions>
    </Dialog>
  );
};

/**
 * Update Dialog Content Component (without Dialog wrapper)
 * For embedding in external Dialog components
 */
const UpdateDialogContent = ({
  updateStatus,
  currentVersion,
  isChecking,
  onCheck,
  onDownload,
  onInstall,
}) => {
  const renderContent = () => {
    if (!updateStatus || updateStatus.status === "checking" || isChecking) {
      return (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <RefreshIcon
            sx={{
              fontSize: 48,
              color: "primary.main",
              animation: "spin 1s linear infinite",
              "@keyframes spin": {
                from: { transform: "rotate(0deg)" },
                to: { transform: "rotate(360deg)" },
              },
            }}
          />
          <Typography sx={{ mt: 2 }}>Checking for updates...</Typography>
        </Box>
      );
    }

    switch (updateStatus.status) {
      case "available":
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              A new version is available!
            </Alert>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Chip label={`Current: v${currentVersion}`} size="small" variant="outlined" />
              <Chip label={`New: v${updateStatus.version}`} size="small" color="primary" />
            </Box>
          </Box>
        );

      case "downloading":
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" gutterBottom>Downloading update...</Typography>
            <LinearProgress variant="determinate" value={updateStatus.percent || 0} sx={{ height: 8, borderRadius: 1, mb: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {updateStatus.percent?.toFixed(1)}% complete
            </Typography>
          </Box>
        );

      case "downloaded":
        return (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: "success.main" }} />
            <Typography sx={{ mt: 2, fontWeight: 500 }}>Update Ready to Install</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Version {updateStatus.version} has been downloaded. Restart to apply.
            </Typography>
          </Box>
        );

      case "not-available":
        return (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: "success.main" }} />
            <Typography sx={{ mt: 2, fontWeight: 500 }}>You're up to date!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Version {currentVersion} is the latest version.
            </Typography>
          </Box>
        );

      case "error":
        return (
          <Box sx={{ py: 2 }}>
            <Alert severity="error">{updateStatus.message || "Failed to check for updates"}</Alert>
          </Box>
        );

      default:
        return (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <UpdateIcon sx={{ fontSize: 48, color: "text.secondary" }} />
            <Typography sx={{ mt: 2 }}>Click "Check for Updates" to get started.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Current version: {currentVersion}
            </Typography>
          </Box>
        );
    }
  };

  const renderActions = () => {
    switch (updateStatus?.status) {
      case "available":
        return (
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={onDownload} fullWidth>
            Download Update
          </Button>
        );
      case "downloading":
        return <Button disabled fullWidth>Downloading...</Button>;
      case "downloaded":
        return (
          <Button variant="contained" color="success" onClick={onInstall} fullWidth>
            Restart & Install
          </Button>
        );
      default:
        return (
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={onCheck} fullWidth disabled={isChecking}>
            {isChecking ? "Checking..." : "Check for Updates"}
          </Button>
        );
    }
  };

  return (
    <>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <UpdateIcon color="primary" />
        <span>Software Update</span>
      </DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>{renderActions()}</DialogActions>
    </>
  );
};

export default AppUpdater;
