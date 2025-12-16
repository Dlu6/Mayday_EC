import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

/**
 * Reusable Confirmation Dialog Component
 * Replaces native window.confirm with a styled MUI dialog
 *
 * @param {boolean} open - Controls dialog visibility
 * @param {function} onClose - Called when dialog is closed (cancel action)
 * @param {function} onConfirm - Called when confirm button is clicked
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message/content
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} variant - Visual variant: "warning", "error", "info", "success" (default: "warning")
 * @param {boolean} loading - Show loading state on confirm button
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  loading = false,
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case "error":
        return {
          icon: <ErrorIcon sx={{ fontSize: 48 }} />,
          color: "#d32f2f",
          bgColor: "#ffebee",
        };
      case "info":
        return {
          icon: <InfoIcon sx={{ fontSize: 48 }} />,
          color: "#1976d2",
          bgColor: "#e3f2fd",
        };
      case "success":
        return {
          icon: <SuccessIcon sx={{ fontSize: 48 }} />,
          color: "#2e7d32",
          bgColor: "#e8f5e9",
        };
      case "warning":
      default:
        return {
          icon: <WarningIcon sx={{ fontSize: 48 }} />,
          color: "#ed6c02",
          bgColor: "#fff3e0",
        };
    }
  };

  const config = getVariantConfig();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      {/* Header with icon */}
      <Box
        sx={{
          bgcolor: config.bgColor,
          pt: 3,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "grey.500",
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ color: config.color }}>{config.icon}</Box>
      </Box>

      {/* Title */}
      <DialogTitle
        sx={{
          textAlign: "center",
          pt: 2,
          pb: 1,
          fontWeight: 600,
        }}
      >
        {title}
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ textAlign: "center", pb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: "none",
          }}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={variant === "error" ? "error" : "primary"}
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: "none",
            bgcolor: variant === "warning" ? config.color : undefined,
            "&:hover": {
              bgcolor:
                variant === "warning"
                  ? "#c45a02"
                  : variant === "error"
                  ? "#b71c1c"
                  : undefined,
            },
          }}
          disabled={loading}
        >
          {loading ? "Processing..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
