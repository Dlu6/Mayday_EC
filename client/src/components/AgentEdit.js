// AgentEdit.js

import { useEffect, useState } from "react";
import {
  AppBar,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  FormControl,
  FormHelperText,
  Input,
  InputLabel,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  MenuItem,
  Paper,
  Select,
  Switch,
  Stack,
  Tabs,
  Tab,
  TextField,
} from "@mui/material";

import { alpha, styled } from "@mui/material/styles";
import { blue } from "@mui/material/colors";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import apiClient from "../api/apiClient";
// import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import {
  fetchAgentDetailsByExtension,
  updateAgentDetails,
} from "../features/agents/agentsSlice.js";

const AgentEdit = () => {
  const { agentId } = useParams();
  const { state } = useLocation();
  const { extension } = state || {};

  const agentDetails = useSelector((state) => state.agents.currentAgent);
  const loading = useSelector((state) => state.agents.loading);

  const [currentTab, setCurrentTab] = useState("account");

  const [formAgentDetails, setFormAgentDetails] = useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (agentId) {
      dispatch(fetchAgentDetailsByExtension(agentId));
    }
  }, [dispatch, agentId]);

  //Manage form inputs locally before submitting on save
  useEffect(() => {
    if (agentDetails) {
      const endpointTransport =
        agentDetails.ps_endpoint?.transport || "transport-ws";
      const transportArray = endpointTransport
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Resolve allowed codecs from backend (prefer ps_endpoint.allow)
      const allowRaw =
        (agentDetails.ps_endpoint && agentDetails.ps_endpoint.allow) ||
        agentDetails.allow;
      const allowedArray =
        typeof allowRaw === "string"
          ? allowRaw
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : Array.isArray(allowRaw)
          ? allowRaw
          : ["ulaw", "alaw", "opus"]; // audio-only sensible default

      setFormAgentDetails({
        ...agentDetails,
        webrtc: agentDetails.ps_endpoint?.webrtc || agentDetails.webrtc,
        transport: transportArray,
        nat:
          typeof agentDetails.nat === "string"
            ? agentDetails.nat.split(",")
            : agentDetails.nat || [],
        allow: allowedArray,
        context: agentDetails.context || "from-internal",
        // WebRTC defaults
        typology: agentDetails.typology || "webRTC",
        ice_support: agentDetails.ice_support || "yes",
        dtls_enabled: agentDetails.dtls_enabled !== false, // Explicit boolean, default true
        dtls_setup: agentDetails.dtls_setup || "actpass",
        rtcp_mux: agentDetails.rtcp_mux || "yes",
        avpf: agentDetails.avpf || "yes",
        force_avp: agentDetails.force_avp || "no",
        dtls_auto_generate_cert: "no",
        dtls_cert_file:
          agentDetails.dtls_cert_file ||
          "/etc/asterisk/keys/asterisk.pem",
        dtls_private_key:
          agentDetails.dtls_private_key ||
          "/etc/asterisk/keys/asterisk.key",
        dtls_verify: agentDetails.dtls_verify || "fingerprint",
        media_encryption: agentDetails.media_encryption || "dtls",
        wss_port: agentDetails.wss_port || 8089,
        host: agentDetails.host || "dynamic",
        // Other fields
        recordingToUserExtension:
          agentDetails.recordingToUserExtension || "inactive", // Ensure it's a string
        internal: extension,
        chanSpy: agentDetails.chanSpy ?? false,
        phoneBarEnableSettings: agentDetails.phoneBarEnableSettings ?? true,
        phoneBarAutoAnswer: agentDetails.phoneBarAutoAnswer ?? false,
        phoneBarAutoAnswerDelay: agentDetails.phoneBarAutoAnswerDelay ?? 0,
        phoneBarRingInUse: agentDetails.phoneBarRingInUse ?? false,
        phoneBarEnableRecording: agentDetails.phoneBarEnableRecording ?? false,
        phoneBarEnableDtmfTone: agentDetails.phoneBarEnableDtmfTone ?? false,
        phoneBarDnd: agentDetails.phoneBarDnd ?? true,
        phoneBarUnansweredCallBadge:
          agentDetails.phoneBarUnansweredCallBadge ?? true,
        phoneBarEnableJaws: agentDetails.phoneBarEnableJaws ?? false,
        phoneBarRemoteControl: agentDetails.phoneBarRemoteControl ?? false,
        phoneBarRemoteControlPort:
          agentDetails.phoneBarRemoteControlPort ?? 9888,
        phoneBarExpires: agentDetails.phoneBarExpires ?? 120,
        emailAutoanswer: agentDetails.emailAutoanswer ?? false,
        emailAutoanswerDelay: agentDetails.emailAutoanswerDelay ?? 0,
        chatAutoanswer: agentDetails.chatAutoanswer ?? false,
        chatAutoanswerDelay: agentDetails.chatAutoanswerDelay ?? 0,
        smsAutoanswer: agentDetails.smsAutoanswer ?? false,
        smsAutoanswerDelay: agentDetails.smsAutoanswerDelay ?? 0,
        openchannelAutoanswer: agentDetails.openchannelAutoanswer ?? false,
        openchannelAutoanswerDelay:
          agentDetails.openchannelAutoanswerDelay ?? 0,
        whatsappAutoanswer: agentDetails.whatsappAutoanswer ?? false,
        whatsappAutoanswerDelay: agentDetails.whatsappAutoanswerDelay ?? 0,
        chatCapacity: agentDetails.chatCapacity ?? 0,
        mailCapacity: agentDetails.mailCapacity ?? 0,
        smsCapacity: agentDetails.smsCapacity ?? 0,
        openchannelCapacity: agentDetails.openchannelCapacity ?? 0,
        whatsappCapacity: agentDetails.whatsappCapacity ?? 0,
      });
    }
  }, [agentDetails]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormAgentDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  // console.log(agentId, "ID parsed in the Agent Edit Form")
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Placeholder for save function
  const handleAgentDetailsSave = async (e) => {
    e.preventDefault();

    try {
      // Format the data for submission
      const formattedData = {
        userData: {
          fullName: formAgentDetails.fullName,
          email: formAgentDetails.email,
          typology: formAgentDetails.typology, // Determines WebRTC capability
          phone: formAgentDetails.phone,
          mobile: formAgentDetails.mobile,
          context: formAgentDetails.context,
          recordingToUserExtension: formAgentDetails.recordingToUserExtension,
          wss_port: formAgentDetails.wss_port || 8089, // WebSocket Secure port
          ice_support: formAgentDetails.ice_support || "yes",
          rtcp_mux: formAgentDetails.rtcp_mux || "yes",
          dtls_enabled: formAgentDetails.dtls_enabled === true, // Explicitly use boolean
          dtls_setup: formAgentDetails.dtls_setup || "actpass",
          avpf: formAgentDetails.avpf || "yes",
        },
        pjsipData: {
          // Convert string values to integers for boolean fields
          webrtc: formAgentDetails.typology === "webRTC" ? "yes" : "no",
          transport: Array.isArray(formAgentDetails.transport)
            ? formAgentDetails.transport.join(",")
            : formAgentDetails.transport || "",
          nat: formAgentDetails.nat?.join(",") || "",
          // Audio-only allow list, preserve chosen order
          allow: formAgentDetails.allow?.join(",") || "ulaw,alaw,opus",
          // Also pass AOR expiration hints to backend (to map to default/maximum_expiration)
          aor_default_expiration:
            Number(formAgentDetails.phoneBarExpires) || 300,
          aor_maximum_expiration:
            Number(formAgentDetails.phoneBarExpires) >= 120
              ? Number(formAgentDetails.phoneBarExpires) + 60
              : 600,
          // WebRTC-specific settings
          direct_media: "no",
          force_rport: "yes",
          dtls_enabled: formAgentDetails.dtls_enabled === true, // Explicitly use boolean
          dtls_auto_generate_cert:
            formAgentDetails.dtls_auto_generate_cert || "no",
          // Certificate paths when not auto-generating
          dtls_cert_file: "/etc/asterisk/keys/asterisk.pem",
          dtls_private_key: "/etc/asterisk/keys/asterisk.key",
          ice_support: formAgentDetails.ice_support || "yes",
          rewrite_contact: "yes",
          rtcp_mux: formAgentDetails.rtcp_mux || "yes",
          dtls_verify: formAgentDetails.dtls_verify || "fingerprint",
          dtls_setup: formAgentDetails.dtls_setup || "actpass",
          use_avpf: formAgentDetails.avpf || "yes",
          force_avp: formAgentDetails.force_avp || "no",
          media_encryption: formAgentDetails.media_encryption || "sdes",
          media_use_received_transport: "yes",
        },
      };

      const result = await dispatch(
        updateAgentDetails({
          agentId,
          agentDetails: formattedData,
        })
      ).unwrap();

      enqueueSnackbar(result.message, {
        variant: result.success ? "success" : "error",
      });

      // Refresh the data
      if (result.success) {
        dispatch(fetchAgentDetailsByExtension(agentId));
      }
    } catch (error) {
      enqueueSnackbar(error || "Failed to update agent", {
        variant: "error",
      });
    }
  };

  const handleBack = () => {
    navigate(-1); // Navigates back to the previous page
  };

  const handleSwitchChange = (event) => {
    const { name, checked } = event.target;
    setFormAgentDetails((prevDetails) => ({
      ...prevDetails,
      [name]: checked,
    }));
  };

  // const handleInputChange = (event) => {
  //   const target = event.target;
  //   const value = target.type === 'checkbox' ? target.checked : target.value;
  //   const name = target.name;

  //   setFormAgentDetails(prevDetails => ({
  //     ...prevDetails,
  //     [name]: value
  //   }));
  // };

  const handleInputChange = (event) => {
    // Check if event is from a Select with 'multiple'
    if (
      event.target &&
      event.target.value &&
      Array.isArray(event.target.value)
    ) {
      setFormAgentDetails((prevDetails) => ({
        ...prevDetails,
        [event.target.name]: event.target.value,
      }));
    } else {
      // Handle other input changes
      const target = event.target;
      const newValue =
        target.type === "checkbox" ? target.checked : target.value;
      const name = target.name;

      setFormAgentDetails((prevDetails) => ({
        ...prevDetails,
        [name]: newValue,
      }));
    }
  };

  const handleNatChange = (event) => {
    const selectedValues = event.target.value;

    // Convert boolean values to ENUM strings for database
    const natSettings = selectedValues.reduce((acc, value) => {
      acc[value] = "yes";
      return acc;
    }, {});

    setFormAgentDetails((prev) => ({
      ...prev,
      nat: selectedValues,
      force_rport: natSettings.force_rport || "no",
      ice_support: natSettings.ice_support || "no",
      rewrite_contact: natSettings.rewrite_contact || "no",
      rtp_symmetric: natSettings.rtp_symmetric || "no",
    }));
  };

  if (loading) {
    return <div>Fetching Agent Details...</div>; // Or any loading spinner
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* Top Bar */}
      <AppBar
        position="static"
        color="default"
        elevation={1}
        sx={{ marginBottom: 2 }}
      >
        <Toolbar sx={{ minHeight: "64px", paddingY: "8px" }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={handleBack}
          >
            {/* Icon button for back navigation */}
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem" }}>
            #{agentDetails?.username}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleAgentDetailsSave}
          >
            SAVE
          </Button>
        </Toolbar>
      </AppBar>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        aria-label="agent details tabs"
      >
        <Tab label="Account" value="account" />
        <Tab label="Voice" value="voice" />
        <Tab label="Other Channels" value="otherChannels" />
        <Tab label="Phonebar" value="phonebar" />
        <Tab label="Dialplan" value="dialplan" />
        {/* ...other tabs */}
        {/* Tab Content */}
      </Tabs>
      {/* Content Card */}
      <Card variant="outlined" sx={{ boxShadow: 3 }}>
        <CardContent>
          {currentTab === "account" && (
            <AccountTabContent
              formAgentDetails={formAgentDetails}
              handleFormChange={handleFormChange}
              loading={loading}
              agentDetails={agentDetails}
            />
          )}
          {currentTab === "voice" && (
            <VoiceTabContent
              formAgentDetails={formAgentDetails}
              handleFormChange={handleFormChange}
              handleSwitchChange={handleSwitchChange}
              handleInputChange={handleInputChange}
              handleNatChange={handleNatChange}
            />
          )}
          {currentTab === "otherChannels" && (
            <OtherChannelsTabContent
              formAgentDetails={formAgentDetails}
              handleFormChange={handleFormChange}
              handleSwitchChange={handleSwitchChange}
              handleInputChange={handleInputChange}
            />
          )}
          {currentTab === "phonebar" && (
            <PhonebarTabContent
              formAgentDetails={formAgentDetails}
              handleFormChange={handleFormChange}
              handleSwitchChange={handleSwitchChange}
              handleInputChange={handleInputChange}
            />
          )}
          {currentTab === "dialplan" && (
            <DialplanTabContent
              extension={formAgentDetails?.extension}
            />
          )}

          {/* ...other tab contents */}
        </CardContent>
      </Card>
    </Box>
  );
};

const AccountTabContent = ({ formAgentDetails, handleFormChange, loading }) => {
  // Check if agentDetails is not null before rendering
  if (!formAgentDetails) {
    return <Box p={3}>Loading...</Box>; // Or any other placeholder content
  }

  // If agentDetails is loaded, render the form fields with the data
  return (
    <Box p={3}>
      <Typography variant="h6">Personal Info</Typography>
      <TextField
        label="Full Name"
        value={formAgentDetails?.fullName || ""} // Use an empty string as fallback
        onChange={handleFormChange}
        fullWidth
        margin="normal"
        variant="outlined"
        name="fullName"
      />

      <TextField
        label="Username"
        disabled
        value={formAgentDetails?.username || ""} // Use an empty string as fallback
        onChange={handleFormChange}
        fullWidth
        margin="normal"
        variant="outlined"
        name="userName"
        InputProps={{
          readOnly: true,
        }}
      />
      {/* Typology */}
      <FormControl fullWidth margin="normal" sx={{ mt: 3 }}>
        <InputLabel htmlFor="typology">Typology</InputLabel>
        <Select
          id="typology"
          name="typology"
          value={formAgentDetails?.typology || ""}
          onChange={handleFormChange}
          required
          label="Typology"
        >
          <MenuItem value="external">External</MenuItem>
          <MenuItem value="phonebar">Phonebar</MenuItem>
          <MenuItem value="webRTC">WebRTC</MenuItem>
        </Select>
      </FormControl>

      {/* Email */}
      <FormControl fullWidth sx={{ mt: 3 }}>
        <InputLabel htmlFor="email">Email</InputLabel>
        <Input
          id="email"
          name="email"
          type="email"
          value={formAgentDetails.email || ""}
          onChange={handleFormChange}
          required
          disabled={loading}
        />
      </FormControl>
      {/* Phone */}
      <FormControl fullWidth sx={{ mt: 3 }}>
        <InputLabel htmlFor="phone">Phone</InputLabel>
        <Input
          id="phone"
          name="phone"
          value={formAgentDetails.phone || ""}
          onChange={handleFormChange}
          autoComplete="phone"
          required
          // disabled={loading}
        />
      </FormControl>
      {/* Mobile */}
      <FormControl fullWidth sx={{ mt: 3 }}>
        <InputLabel htmlFor="mobile">Mobile</InputLabel>
        <Input
          id="mobile"
          name="mobile"
          value={formAgentDetails.mobile || ""}
          onChange={handleFormChange}
          autoComplete="mobile"
          required
          // disabled={loading}
        />
      </FormControl>
    </Box>
  );
};

const VoiceTabContent = ({
  formAgentDetails,
  handleSwitchChange,
  handleInputChange,
  handleNatChange,
}) => {
  const transportOptions = [
    { value: "transport-ws", label: "WebSocket" },
    { value: "transport-wss", label: "WebSocket Secure" },
    { value: "transport-tls", label: "TLS" },
    { value: "transport-tcp", label: "TCP" },
    { value: "transport-udp", label: "UDP" },
  ];

  const natOptions = [
    { value: "force_rport", label: "Force RPort" },
    { value: "ice_support", label: "ICE Support" },
    { value: "rewrite_contact", label: "Rewrite Contact" },
    { value: "rtp_symmetric", label: "RTP Symmetric" },
  ];

  const types = [
    { value: "friend", label: "Friend" },
    { value: "user", label: "User" },
    { value: "peer", label: "Peer" },
  ];

  // Audio-only codec choices shown to the user
  const allowedCodecsOptions = [
    { value: "ulaw", label: "ulaw" },
    { value: "alaw", label: "alaw" },
    { value: "opus", label: "opus" },
    { value: "g722", label: "g722" },
    { value: "g729", label: "g729" },
    { value: "gsm", label: "gsm" },
  ];

  const PinkSwitch = styled(Switch)(({ theme }) => ({
    "& .MuiSwitch-switchBase.Mui-checked": {
      color: blue[600],
      "&:hover": {
        backgroundColor: alpha(blue[600], theme.palette.action.hoverOpacity),
      },
    },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      backgroundColor: blue[600],
    },
  }));

  const PinkSwitchContainer = styled("div")({
    paddingTop: "8px",
  });

  // Function to normalize transport values
  const normalizeTransportValue = (value) => {
    if (!value || value.length === 0) return ["transport-ws"]; // Default to WebSocket (on-prem)
    if (Array.isArray(value)) {
      return value.map((v) =>
        v.startsWith("transport-") ? v : `transport-${v}`
      );
    }
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((v) => (v.startsWith("transport-") ? v : `transport-${v}`));
  };

  // Function to format display value
  const transportValue = normalizeTransportValue(formAgentDetails.transport);

  // Content for the Voice tab
  return (
    <Box p={3}>
      <Typography variant="h6">General</Typography>
      {/* Voice settings form fields */}
      <TextField
        disabled
        fullWidth
        value={formAgentDetails?.extension || ""}
        onChange={handleInputChange}
        id="internal-disabled"
        name="extension"
        label="Internal Ext"
        variant="filled"
      />
      {/* Transport */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="transport">Transport</InputLabel>
        <Select
          required
          labelId="transport"
          id="transport"
          name="transport"
          multiple
          label="Transport"
          value={transportValue}
          onChange={handleInputChange}
          renderValue={(selected) =>
            selected
              .map((v) => v.replace("transport-", "").toUpperCase())
              .join(", ")
          }
        >
          {transportOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox checked={transportValue.includes(option.value)} />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
        <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
          Set the default transports in order of preference
        </FormHelperText>
      </FormControl>

      {/* WebRTC Section */}
      <Card variant="outlined" sx={{ mt: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            WebRTC Settings
          </Typography>
          <Stack spacing={2}>
            {/* Use typology instead of a separate webrtc field */}
            <FormControl fullWidth variant="standard">
              <InputLabel htmlFor="typology">Typology (WebRTC)</InputLabel>
              <Select
                labelId="typology"
                id="typology"
                name="typology"
                value={formAgentDetails.typology || "webRTC"}
                onChange={handleInputChange}
              >
                <MenuItem value="external">External</MenuItem>
                <MenuItem value="phonebar">Phonebar</MenuItem>
                <MenuItem value="webRTC">WebRTC</MenuItem>
              </Select>
              <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
                Set to WebRTC to enable WebRTC functionality
              </FormHelperText>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={
                    formAgentDetails.ice_support === "yes" ||
                    formAgentDetails.ice_support === true
                  }
                  onChange={handleSwitchChange}
                  name="ice_support"
                />
              }
              label="ICE Support"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formAgentDetails.dtls_enabled === true}
                  onChange={handleSwitchChange}
                  name="dtls_enabled"
                />
              }
              label="DTLS Enable"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    formAgentDetails.dtls_auto_generate_cert === "no" ||
                    formAgentDetails.dtls_auto_generate_cert === false
                  }
                  onChange={handleSwitchChange}
                  name="dtls_auto_generate_cert"
                />
              }
              label="Auto-generate DTLS Certificate"
            />

            {formAgentDetails.dtls_auto_generate_cert !== "no" && (
              <>
                <TextField
                  margin="dense"
                  label="DTLS Certificate Path"
                  type="text"
                  fullWidth
                  name="dtls_cert_file"
                  value={
                    formAgentDetails.dtls_cert_file ||
                    "/etc/asterisk/keys/asterisk.pem"
                  }
                  onChange={handleInputChange}
                  variant="standard"
                />
                <FormHelperText
                  style={{ fontSize: "9px", fontStyle: "italic" }}
                >
                  Path to TLS certificate file (Let&apos;s Encrypt
                  fullchain.pem)
                </FormHelperText>

                <TextField
                  margin="dense"
                  label="DTLS Private Key Path"
                  type="text"
                  fullWidth
                  name="dtls_private_key"
                  value={
                    formAgentDetails.dtls_private_key ||
                    "/etc/asterisk/keys/asterisk.key"
                  }
                  onChange={handleInputChange}
                  variant="standard"
                />
                <FormHelperText
                  style={{ fontSize: "9px", fontStyle: "italic" }}
                >
                  Path to TLS private key file (Let&apos;s Encrypt privkey.pem)
                </FormHelperText>
              </>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={
                    formAgentDetails.rtcp_mux === "yes" ||
                    formAgentDetails.rtcp_mux === true
                  }
                  onChange={handleSwitchChange}
                  name="rtcp_mux"
                />
              }
              label="RTCP Multiplexing"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={
                    formAgentDetails.avpf === "yes" ||
                    formAgentDetails.avpf === true
                  }
                  onChange={handleSwitchChange}
                  name="avpf"
                />
              }
              label="AVPF (RTP with Feedback)"
            />

            <FormControl fullWidth variant="standard">
              <InputLabel htmlFor="dtls_setup">DTLS Setup</InputLabel>
              <Select
                labelId="dtls_setup"
                id="dtls_setup"
                name="dtls_setup"
                value={formAgentDetails.dtls_setup || "actpass"}
                onChange={handleInputChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="passive">Passive</MenuItem>
                <MenuItem value="actpass">ActPass (Default)</MenuItem>
              </Select>
              <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
                DTLS setup behavior (actpass recommended)
              </FormHelperText>
            </FormControl>

            <FormControl fullWidth variant="standard">
              <InputLabel htmlFor="dtls_verify">DTLS Verify</InputLabel>
              <Select
                labelId="dtls_verify"
                id="dtls_verify"
                name="dtls_verify"
                value={formAgentDetails.dtls_verify || "fingerprint"}
                onChange={handleInputChange}
              >
                <MenuItem value="fingerprint">Fingerprint (WebRTC)</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
              <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
                DTLS verify method (use fingerprint for WebRTC)
              </FormHelperText>
            </FormControl>

            <FormControl fullWidth variant="standard">
              <InputLabel htmlFor="media_encryption">
                Media Encryption
              </InputLabel>
              <Select
                labelId="media_encryption"
                id="media_encryption"
                name="media_encryption"
                value={formAgentDetails.media_encryption || "dtls"}
                onChange={handleInputChange}
              >
                <MenuItem value="dtls">DTLS (Recommended for WebRTC)</MenuItem>
                <MenuItem value="sdes">SDES</MenuItem>
                <MenuItem value="no">None</MenuItem>
              </Select>
              <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
                Media encryption method
              </FormHelperText>
            </FormControl>

            <TextField
              margin="dense"
              label="WSS Port"
              type="number"
              fullWidth
              name="wss_port"
              value={formAgentDetails.wss_port || 8089}
              onChange={handleInputChange}
              variant="standard"
            />
            <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
              WebSocket Secure port for SIP communications (default: 8089)
            </FormHelperText>
          </Stack>
        </CardContent>
      </Card>

      {/* Rest of the form fields */}
      {/* Host */}
      <div style={{ mt: 3 }}>
        <TextField
          required
          margin="dense"
          label="Host"
          type="text"
          fullWidth
          name="host"
          variant="standard"
          value={formAgentDetails.host}
          onChange={handleInputChange}
        />
        <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
          How to find the client - IP or host name. If you want the phone to
          register itself, use the keyword dynamic instead of Host IP
        </FormHelperText>
      </div>
      {/* NAT */}
      <FormControl fullWidth margin="dense">
        <InputLabel>NAT Settings</InputLabel>
        <Select
          multiple
          value={formAgentDetails.nat || []}
          onChange={handleNatChange}
          input={<Input />}
          renderValue={(selected) => selected.join(", ")}
        >
          {natOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={formAgentDetails.nat?.includes(option.value)}
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Types */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="type">Type</InputLabel>
        <Select
          labelId="type"
          id="type"
          name="type"
          label="Type"
          value={formAgentDetails.type || ""}
          onChange={handleInputChange}
        >
          {types.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Allowed Codecs */}
      <FormControl fullWidth margin="dense" variant="standard" required>
        <InputLabel htmlFor="allow">Allowed Codecs</InputLabel>
        <Select
          required
          labelId="allow"
          id="allow"
          name="allow"
          multiple
          label="Allowed Codecs"
          value={formAgentDetails.allow || []}
          onChange={handleInputChange}
          renderValue={(selected) => selected.join(", ")}
        >
          {allowedCodecsOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={(formAgentDetails.allow || []).includes(option.value)}
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
        <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
          Allowed Codecs in order of preference
        </FormHelperText>
      </FormControl>
      {/* CallerId */}
      <TextField
        margin="dense"
        label="Caller ID"
        type="text"
        fullWidth
        name="callerId"
        variant="standard"
        value={formAgentDetails.callerId || ""}
        onChange={handleInputChange}
      />

      {/* Context */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="context">Context</InputLabel>

        <Select
          labelId="context-agent"
          id="context-agent"
          name="context"
          label="Context"
          value={formAgentDetails.context || ""}
          onChange={handleInputChange}
        >
          <MenuItem value="from-internal">from-internal</MenuItem>
          <MenuItem value="from-sip">from-sip</MenuItem>
          <MenuItem value="from-voicemail">from-voicemail</MenuItem>
          <MenuItem value="from-voip-provider">from-voip-provider</MenuItem>
        </Select>
      </FormControl>

      {/* CallerGroup */}
      <div style={{ marginTop: "3px" }}>
        <TextField
          margin="dense"
          label="Call Group"
          type="text"
          fullWidth
          name="callGroup"
          variant="standard"
          value={formAgentDetails.callGroup || ""}
          onChange={handleInputChange}
        />
        <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
          The agent&apos;s callgroup
        </FormHelperText>
      </div>

      {/* CallerGroup */}
      <div style={{ marginTop: "3px" }}>
        <TextField
          margin="dense"
          label="Pickup Group"
          type="text"
          fullWidth
          name="pickupGroup"
          variant="standard"
          value={formAgentDetails.pickupGroup || ""}
          onChange={handleInputChange}
        />
        <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
          The groups in which the agent can answer calls
        </FormHelperText>
      </div>

      {/* Chanspy */}
      <PinkSwitchContainer>
        <FormControlLabel
          control={
            <PinkSwitch
              checked={formAgentDetails.chanSpy || false}
              // onChange={handleInputChange}
              onChange={handleSwitchChange}
              name="chanSpy"
            />
          }
          label="ChanSpy"
        />
      </PinkSwitchContainer>

      {/* Recording Format */}
      <FormControl fullWidth margin="dense" variant="standard">
        <InputLabel htmlFor="recordingToUserExtension">
          Recording Format
        </InputLabel>
        <Select
          labelId="recordingToUserExtension"
          id="recordingToUserExtension"
          name="recordingToUserExtension"
          label="Recording Format"
          value={formAgentDetails.recordingToUserExtension || ""}
          onChange={handleInputChange}
        >
          <MenuItem value="wav">wav</MenuItem>
          <MenuItem value="mp3">mp3</MenuItem>
          <MenuItem value="gsm">gsm</MenuItem>
          <MenuItem value="inactive">inactive</MenuItem>
        </Select>
      </FormControl>
      <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
        Record calls to user extension
      </FormHelperText>
    </Box>
  );
};

// OtherChannelsTabContent
const OtherChannelsTabContent = ({
  formAgentDetails,
  handleInputChange,
  handleFormChange,
  handleSwitchChange,
}) => {
  return (
    <>
      {/* Card for Capacity Settings */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Capacity
          </Typography>
          <Box p={3}>
            {/* Chat Capacity */}
            <TextField
              margin="dense"
              type="number"
              fullWidth
              value={formAgentDetails.chatCapacity}
              onChange={handleFormChange}
              name="chatCapacity"
              variant="standard"
              label="Chat Capacity"
            />
            <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
              Maximum number of concurrent channel interactions per agent
              (0=unlimited)
            </FormHelperText>

            {/* Email Capacity */}
            <TextField
              margin="dense"
              type="number"
              fullWidth
              value={formAgentDetails.mailCapacity}
              onChange={handleFormChange}
              name="mailCapacity"
              variant="standard"
              label="Email Capacity"
            />
            <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
              Maximum number of concurrent email channel interactions per agent
              (0=unlimited)
            </FormHelperText>

            {/* SMS Capacity */}
            <TextField
              margin="dense"
              label="SMS Capacity"
              type="number"
              fullWidth
              name="smsCapacity"
              variant="standard"
              value={formAgentDetails.smsCapacity}
              onChange={handleFormChange}
            />
            <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
              Maximum number of concurrent SMS channel interactions per agent
              (0=unlimited)
            </FormHelperText>

            {/* OpenChanneL Capacity */}
            <TextField
              margin="dense"
              type="number"
              fullWidth
              name="openchannelCapacity"
              value={formAgentDetails.openchannelCapacity}
              onChange={handleFormChange}
              variant="standard"
              label="Open Channel Capacity"
            />
            <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
              Maximum number of concurrent Open Channel interactions per agent
              (0=unlimited)
            </FormHelperText>

            {/* Whatsapp Capacity */}
            <TextField
              margin="dense"
              type="number"
              fullWidth
              name="whatsappCapacity"
              value={formAgentDetails.whatsappCapacity}
              onChange={handleFormChange}
              variant="standard"
              label="WhatsApp Channel Capacity"
            />
            <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
              Maximum number of concurrent WhatsApp connector interactions per
              agent (0=unlimited)
            </FormHelperText>
          </Box>
        </CardContent>
      </Card>

      {/* Card for Auto Answer Settings */}
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Auto Answer
          </Typography>
          <Stack spacing={2} p={3}>
            {/* Chat Auto Answer */}
            <FormControlLabel
              control={
                <Switch
                  checked={formAgentDetails.chatAutoanswer}
                  onChange={handleSwitchChange}
                  name="chatAutoanswer"
                />
              }
              label="Chat Auto Answer"
            />
            {formAgentDetails.chatAutoanswer && (
              <TextField
                margin="dense"
                type="number"
                fullWidth
                name="chatAutoanswerDelay"
                value={formAgentDetails.chatAutoanswerDelay}
                onChange={handleInputChange}
                label="Chat Auto Answer Delay [s]"
              />
            )}

            {/* Email Auto Answer */}
            <FormControlLabel
              control={
                <Switch
                  checked={formAgentDetails.emailAutoanswer}
                  onChange={handleSwitchChange}
                  name="emailAutoanswer"
                />
              }
              label="Email Auto Answer"
            />
            {formAgentDetails.emailAutoanswer && (
              <TextField
                margin="dense"
                label="Email Auto Answer Delay [s]"
                name="emailAutoanswerDelay"
                onChange={handleInputChange}
                type="number"
                fullWidth
                value={formAgentDetails.emailAutoanswerDelay}
              />
            )}

            {/* SMS Auto Answer */}
            <FormControlLabel
              control={
                <Switch
                  checked={formAgentDetails.smsAutoanswer}
                  onChange={handleSwitchChange}
                  name="smsAutoanswer"
                />
              }
              label="SMS Auto Answer"
            />
            {formAgentDetails.smsAutoanswer && (
              <TextField
                margin="dense"
                type="number"
                fullWidth
                name="smsAutoanswerDelay"
                value={formAgentDetails.smsAutoanswerDelay}
                onChange={handleInputChange}
                label="SMS Auto Answer Delay [s]"
              />
            )}

            {/* Open Channel Auto Answer */}
            <FormControlLabel
              control={
                <Switch
                  checked={formAgentDetails.openchannelAutoanswer}
                  onChange={handleSwitchChange}
                  name="openchannelAutoanswer"
                />
              }
              label="Open Channel Auto Answer"
            />
            {formAgentDetails.openchannelAutoanswer && (
              <TextField
                margin="dense"
                label="Open Channel Auto Answer Delay [s]"
                type="number"
                fullWidth
                name="openchannelAutoanswerDelay"
                value={formAgentDetails.openchannelAutoanswerDelay}
                onChange={handleInputChange}
              />
            )}

            {/* WhatsApp Channel Auto Answer */}
            <FormControlLabel
              control={
                <Switch
                  checked={formAgentDetails.whatsappAutoanswer}
                  onChange={handleSwitchChange}
                  name="whatsappAutoanswer"
                />
              }
              label="WhatsApp Channel Auto Answer"
            />
            {formAgentDetails.whatsappAutoanswer && (
              <TextField
                margin="dense"
                type="number"
                fullWidth
                name="whatsappAutoanswerDelay"
                value={formAgentDetails.whatsappAutoanswerDelay}
                onChange={handleInputChange}
                label="WhatsApp Channel Auto Answer Delay [s]"
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
};
const PhonebarTabContent = ({
  formAgentDetails,
  handleSwitchChange,
  handleInputChange,
}) => {
  return (
    <Stack spacing={2} p={3}>
      <Typography variant="h6">Phonebar Settings</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarEnableSettings}
            onChange={handleSwitchChange}
            name="phoneBarEnableSettings"
          />
        }
        label="Enable Settings"
      />
      {/* Auto Answer */}
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarAutoAnswer || false}
            onChange={handleSwitchChange}
            name="phoneBarAutoAnswer"
          />
        }
        label="Auto Answer"
      />
      {formAgentDetails.phoneBarAutoAnswer && (
        <TextField
          label="Auto Answer Delay [s]"
          type="number"
          fullWidth
          name="phoneBarAutoAnswerDelay"
          value={formAgentDetails.phoneBarAutoAnswerDelay}
          onChange={handleInputChange}
          margin="dense"
          variant="outlined"
        />
      )}

      {/* Ring In Use */}
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarRingInUse || false}
            onChange={handleSwitchChange}
            name="phoneBarRingInUse"
          />
        }
        label="Ring In Use"
      />

      {/* Enable Recording */}
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarEnableRecording || false}
            onChange={handleSwitchChange}
            name="phoneBarEnableRecording"
          />
        }
        label="Enable Recording"
      />

      {/* Enable Dtmf */}
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarEnableDtmfTone || false}
            onChange={handleSwitchChange}
            name="phoneBarEnableDtmfTone"
          />
        }
        label="Enable Dtmf Mode"
      />
      {/* Don't disturb */}
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarDnd}
            onChange={handleSwitchChange}
            name="phoneBarDnd"
          />
        }
        label="Do Not Disturb During Pause"
      />

      {/* Show Unanswered Badge */}
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarUnansweredCallBadge}
            onChange={handleSwitchChange}
            name="phoneBarUnansweredCallBadge"
          />
        }
        label="Show Unanswered Call Badge"
      />

      {/* Enable Jaws Integration */}
      <FormControlLabel
        control={
          <Switch
            checked={formAgentDetails.phoneBarEnableJaws || false}
            onChange={handleSwitchChange}
            name="phoneBarEnableJaws"
          />
        }
        label="Enable Jaws Integration"
      />

      {/* Card for Auto Answer Settings */}
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Remote Control
          </Typography>
          <Stack spacing={2} p={3}>
            {/* Remote Control */}
            <FormControlLabel
              control={
                <Switch
                  checked={formAgentDetails.phoneBarRemoteControl}
                  onChange={handleSwitchChange}
                  name="phoneBarRemoteControl"
                />
              }
              label="Remote Control"
            />
            {formAgentDetails.phoneBarRemoteControl && (
              <TextField
                label="Remote Control Port"
                type="number"
                fullWidth
                value={formAgentDetails.phoneBarRemoteControlPort}
                name="phoneBarRemoteControlPort"
                onChange={handleInputChange}
                margin="dense"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* SIP */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SIP
          </Typography>
          <Stack spacing={2}>
            {/* SIP Expires */}
            <TextField
              required
              margin="dense"
              label="Sip Expires [sec]"
              type="number"
              fullWidth
              name="phoneBarExpires"
              variant="standard"
              value={formAgentDetails.phoneBarExpires}
              onChange={handleInputChange}
            />
            <FormHelperText style={{ fontSize: "9px", fontStyle: "italic" }}>
              Default: 160
            </FormHelperText>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

// Dialplan Tab Content Component
const DialplanTabContent = ({ extension }) => {
  const [dialplanEntries, setDialplanEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch dialplan entries on mount
  useEffect(() => {
    if (extension) {
      fetchDialplan();
    }
  }, [extension]);

  const fetchDialplan = async () => {
    if (!extension) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/users/agents/${extension}/dialplan`);
      if (response.data.success) {
        setDialplanEntries(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching dialplan:", error);
      enqueueSnackbar("Failed to fetch dialplan entries", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!extension) return;
    
    setRegenerating(true);
    try {
      const response = await apiClient.post(`/users/agents/${extension}/dialplan/regenerate`);
      if (response.data.success) {
        setDialplanEntries(response.data.data || []);
        enqueueSnackbar(response.data.message, { variant: "success" });
      }
    } catch (error) {
      console.error("Error regenerating dialplan:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Failed to regenerate dialplan",
        { variant: "error" }
      );
    } finally {
      setRegenerating(false);
    }
  };

  // Helper to determine if an entry is system-generated
  const getEntryType = (entry) => {
    if (entry.type === "system") return "System";
    if (entry.appdata?.includes("ODBC_AGENT_PAUSED")) return "Pause Check";
    if (entry.app === "GotoIf" && entry.appdata?.includes("agent-unavailable")) return "Pause Check";
    return "Generated";
  };

  // Helper to get chip color based on type
  const getChipColor = (type) => {
    switch (type) {
      case "System":
        return "primary";
      case "Pause Check":
        return "warning";
      default:
        return "success";
    }
  };

  // Helper to get description for common dialplan entries
  const getDescription = (entry) => {
    if (entry.app === "Set") {
      if (entry.appdata?.includes("CALLERID")) return "Set Caller ID";
      if (entry.appdata?.includes("CHANNEL(language)")) return "Set Channel Language";
      if (entry.appdata?.includes("CDR(accountcode)")) return "Set CDR Account Code";
      if (entry.appdata?.includes("CALL_TIMEOUT")) return "Set Call Timeout";
      if (entry.appdata?.includes("AGENT_PAUSED")) return "Check Agent Pause Status";
      return "Set Variable";
    }
    if (entry.app === "GotoIf") {
      if (entry.appdata?.includes("agent-unavailable")) return "Redirect if Agent Paused";
      return "Conditional Jump";
    }
    if (entry.app === "Dial") return "Dial Extension";
    if (entry.app === "Hangup") return "Hangup Call";
    if (entry.app === "NoOp") return "No Operation (Logging)";
    return entry.app;
  };

  if (!extension) {
    return (
      <Box p={3}>
        <Typography color="textSecondary">
          No extension found for this agent.
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Generated Extensions for {extension}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={regenerating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
          onClick={handleRegenerate}
          disabled={regenerating || loading}
        >
          {regenerating ? "Regenerating..." : "Regenerate Dialplan"}
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : dialplanEntries.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography color="textSecondary" gutterBottom>
            No dialplan entries found for this extension.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            Generate Dialplan
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Priority</TableCell>
                <TableCell>Application</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dialplanEntries.map((entry, index) => {
                const entryType = getEntryType(entry);
                return (
                  <TableRow key={entry.id || index}>
                    <TableCell>{entry.priority}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {entry.app}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          maxWidth: 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={entry.appdata}
                      >
                        {entry.appdata || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{getDescription(entry)}</TableCell>
                    <TableCell>
                      <Chip
                        label={entryType}
                        color={getChipColor(entryType)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box mt={2}>
        <Typography variant="caption" color="textSecondary">
          The dialplan defines how incoming calls to this extension are handled.
          Click &quot;Regenerate Dialplan&quot; to update with the latest configuration including pause status checks.
        </Typography>
      </Box>
    </Box>
  );
};

export default AgentEdit;
