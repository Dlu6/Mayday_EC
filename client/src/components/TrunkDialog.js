import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  FormControl,
  FormHelperText,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { alpha, styled } from "@mui/material/styles";
import { pink } from "@mui/material/colors";
import Switch from "@mui/material/Switch";
import { useSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import {
  createTrunk,
  updateTrunkDetailsAsync,
} from "../features/trunks/trunkSlice.js";

const TrunkDialog = ({ open, handleClose, trunkData, mode }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    if (mode === "edit" && trunkData && trunkData.active !== undefined) {
      return trunkData.active;
    } else {
      return 0;
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    host: "",
    defaultUser: "",
    password: "",
    context: "from-voip-provider",
    codecs: "ulaw,alaw",
    transport: "transport-udp",
    active: 1,
    fromUser: "",
    fromDomain: "",
  });

  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  useEffect(() => {
    if (mode === "edit" && trunkData) {
      const enhancedTrunkData = {
        name: trunkData.name || "",
        host: trunkData.host || trunkData.endpoint?.from_domain || "",
        defaultUser:
          trunkData.defaultUser || trunkData.endpoint?.from_user || "",
        transport: (
          trunkData.transport ||
          trunkData.endpoint?.transport ||
          "transport-udp"
        ).replace("transport-", ""),
        context:
          trunkData.context ||
          trunkData.endpoint?.context ||
          "from-voip-provider",
        active: trunkData.active || (trunkData.endpoint?.active ? 1 : 0),
        enabled: trunkData.enabled || Boolean(trunkData.endpoint?.enabled),
        password: trunkData.password || trunkData.auth?.password || "",
        codecs: trunkData.codecs || trunkData.endpoint?.allow || "ulaw,alaw",
        fromUser: trunkData.fromUser || trunkData.endpoint?.from_user || "",
        fromDomain:
          trunkData.fromDomain || trunkData.endpoint?.from_domain || "",
      };
      setFormData(enhancedTrunkData);
      setEnabled(enhancedTrunkData.active);
    }
  }, [trunkData, mode]);

  const handleInputChange = (event) => {
    if (event.target.name === "enabledSwitch") {
      const isEnabled = event.target.checked;
      setEnabled(isEnabled ? 1 : 0);
      setFormData((prev) => ({
        ...prev,
        enabled: isEnabled,
        active: isEnabled ? 1 : 0,
      }));
    } else {
      const { name, value } = event.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ...(name === "defaultUser" ? { fromUser: value } : {}),
        ...(name === "host" ? { fromDomain: value } : {}),
      }));
    }
  };

  const handleSubmitTrunk = async () => {
    if (
      !formData.name ||
      !formData.host ||
      !formData.defaultUser ||
      !formData.password
    ) {
      enqueueSnackbar("Please fill in all required fields", {
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const trunkPayload = {
        name: formData.name.trim(),
        host: formData.host,
        defaultUser: formData.defaultUser,
        password: formData.password,
        context: formData.context,
        transport: formData.transport,
        codecs: formData.codecs,
        enabled: formData.enabled,
        active: formData.active,
        fromUser: formData.defaultUser,
        fromDomain: formData.host,
      };

      if (mode === "edit") {
        await dispatch(updateTrunkDetailsAsync(trunkPayload)).unwrap();
      } else {
        await dispatch(createTrunk(trunkPayload)).unwrap();
      }

      enqueueSnackbar(
        `Trunk ${mode === "edit" ? "updated" : "created"} successfully`,
        { variant: "success" }
      );
      handleClose();
    } catch (error) {
      console.log(error, "error");
      enqueueSnackbar(error || `Failed to ${mode} trunk`, {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      handleClose();
      enqueueSnackbar("Network configuration deleted successfully.", {
        variant: "success",
      });
    } catch (err) {
      console.error("Network deletion error:", err);
      enqueueSnackbar("Failed to delete network configuration.", {
        variant: "error",
      });
    }
  };

  const label = { inputProps: { "aria-label": "Color switch demo" } };

  const PinkSwitch = styled(Switch)(({ theme }) => ({
    "& .MuiSwitch-switchBase.Mui-checked": {
      color: pink[600],
      "&:hover": {
        backgroundColor: alpha(pink[600], theme.palette.action.hoverOpacity),
      },
    },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      backgroundColor: pink[600],
    },
  }));

  const PinkSwitchContainer = styled("div")({
    paddingTop: "8px",
  });

  return (
    <Dialog
      open={open}
      onClose={!isSubmitting ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{
          backgroundColor: "#1976d2",
          color: "#ffffff",
          marginBottom: "16px",
        }}
      >
        {mode === "edit" ? "Edit Trunk" : "New Trunk"}
        {!isSubmitting && (
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#e3f2fd",
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <TextField
            required
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            name="name"
            // variant="standard"
            value={formData.name || ""}
            onChange={handleInputChange}
            disabled={mode === "edit" && trunkData}
          />
          <FormHelperText>The name of the trunk</FormHelperText>
          <PinkSwitchContainer>
            <FormControlLabel
              control={
                <PinkSwitch
                  {...label}
                  checked={enabled === 1}
                  onChange={handleInputChange}
                  name="enabledSwitch"
                  disabled={isSubmitting}
                />
              }
              label="Active"
            />
          </PinkSwitchContainer>

          <TextField
            required
            margin="dense"
            label="Host"
            type="text"
            fullWidth
            name="host"
            variant="standard"
            value={formData.host || ""}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
          <FormHelperText>The domain or host name</FormHelperText>
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            name="password"
            variant="standard"
            placeholder="Password"
            value={formData.password || ""}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
          <FormHelperText>Authentication password</FormHelperText>
          <TextField
            margin="dense"
            label="Default User"
            type="text"
            fullWidth
            name="defaultUser"
            variant="standard"
            value={formData.defaultUser || ""}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
          {/* <FormHelperText>Authentication username</FormHelperText> */}
        </FormControl>
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent: "space-between",
          padding: "8px 24px",
          alignItems: "center",
        }}
      >
        {mode === "edit" && !isSubmitting && (
          <IconButton
            onClick={() => handleDelete(trunkData.id)}
            color="error"
            aria-label="delete"
            sx={{ position: "absolute", left: 8, bottom: 8 }}
            disabled={isSubmitting}
          >
            <DeleteIcon />
          </IconButton>
        )}
        <div style={{ flex: "1 0 0" }} />
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitTrunk}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {mode === "edit" ? "Updating..." : "Adding..."}
            </>
          ) : mode === "edit" ? (
            "Update Trunk"
          ) : (
            "Add Trunk"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrunkDialog;
