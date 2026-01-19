import React, { useState, useEffect, useRef, useCallback } from "react";
import ContentFrame from "./ContentFrame";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Link,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Slider,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Info as InfoIcon,
  Update,
  Build,
  Code,
  Storage,
  Security,
  Speed,
  BugReport,
  Email as EmailIcon,
  GitHub,
  Mic,
  VolumeUp,
  PlayArrow,
  Stop,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
} from "@mui/icons-material";
import LanguageIcon from "@mui/icons-material/Language";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { ringtoneService, AVAILABLE_RINGTONES } from "../services/ringtoneService";

const PhonebarInfo = ({ open, onClose }) => {
  // You can load these from your package.json or environment variables
  const appInfo = {
    version: "2.0.2",
    buildNumber: "2024.03.14",
    environment: process.env.NODE_ENV,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: window.navigator.platform,
    lastUpdate: "March 14, 2024",
  };

  // ========== Audio Device Settings State ==========
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState("");
  const [selectedOutputDevice, setSelectedOutputDevice] = useState("");
  const [inputVolume, setInputVolume] = useState(100);
  const [outputVolume, setOutputVolume] = useState(100);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState("unknown");

  // ========== Ringtone Settings State ==========
  const [selectedRingtone, setSelectedRingtone] = useState(ringtoneService.getSelectedRingtoneId());
  const [isPreviewingRingtone, setIsPreviewingRingtone] = useState(false);
  const ringtonePreviewRef = useRef(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const testAudioRef = useRef(null);

  // Load saved audio preferences
  useEffect(() => {
    const savedInput = localStorage.getItem("preferredAudioInput");
    const savedOutput = localStorage.getItem("preferredAudioOutput");
    const savedInputVolume = localStorage.getItem("audioInputVolume");
    const savedOutputVolume = localStorage.getItem("audioOutputVolume");

    if (savedInput) setSelectedInputDevice(savedInput);
    if (savedOutput) setSelectedOutputDevice(savedOutput);
    if (savedInputVolume) setInputVolume(parseInt(savedInputVolume, 10));
    if (savedOutputVolume) setOutputVolume(parseInt(savedOutputVolume, 10));
  }, []);

  // Enumerate audio devices
  const refreshDevices = useCallback(async () => {
    try {
      setAudioError(null);

      // Request permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionStatus("granted");
      } catch (permError) {
        if (permError.name === "NotAllowedError") {
          setPermissionStatus("denied");
          setAudioError("Microphone permission denied. Please allow access in your browser/system settings.");
          return;
        }
      }

      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputs = devices.filter((d) => d.kind === "audioinput");
      const outputs = devices.filter((d) => d.kind === "audiooutput");

      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);

      // Set default devices if none selected
      if (!selectedInputDevice && inputs.length > 0) {
        const defaultInput = inputs.find((d) => d.deviceId === "default") || inputs[0];
        setSelectedInputDevice(defaultInput.deviceId);
      }
      if (!selectedOutputDevice && outputs.length > 0) {
        const defaultOutput = outputs.find((d) => d.deviceId === "default") || outputs[0];
        setSelectedOutputDevice(defaultOutput.deviceId);
      }
    } catch (error) {
      console.error("Error enumerating devices:", error);
      setAudioError("Failed to get audio devices: " + error.message);
    }
  }, [selectedInputDevice, selectedOutputDevice]);

  // Initial device enumeration
  useEffect(() => {
    if (open) {
      refreshDevices();

      // Listen for device changes
      navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
      };
    }
  }, [open, refreshDevices]);

  // Save preferences when changed
  const handleInputDeviceChange = (event) => {
    const deviceId = event.target.value;
    setSelectedInputDevice(deviceId);
    localStorage.setItem("preferredAudioInput", deviceId);
  };

  const handleOutputDeviceChange = (event) => {
    const deviceId = event.target.value;
    setSelectedOutputDevice(deviceId);
    localStorage.setItem("preferredAudioOutput", deviceId);
  };

  const handleInputVolumeChange = (event, newValue) => {
    setInputVolume(newValue);
    localStorage.setItem("audioInputVolume", newValue.toString());
  };

  const handleOutputVolumeChange = (event, newValue) => {
    setOutputVolume(newValue);
    localStorage.setItem("audioOutputVolume", newValue.toString());

    // Apply volume to test audio if playing
    if (testAudioRef.current) {
      testAudioRef.current.volume = newValue / 100;
    }
  };

  // Test microphone
  const startMicTest = async () => {
    try {
      setAudioError(null);
      setIsTestingMic(true);

      const constraints = {
        audio: selectedInputDevice
          ? { deviceId: { exact: selectedInputDevice } }
          : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      // Create audio context and analyser
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Start visualizing
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!isTestingMic) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, (average / 128) * 100 * (inputVolume / 100)));

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error("Error testing microphone:", error);
      setAudioError("Failed to test microphone: " + error.message);
      setIsTestingMic(false);
    }
  };

  const stopMicTest = () => {
    setIsTestingMic(false);
    setMicLevel(0);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Test speaker output
  const testSpeakerOutput = async () => {
    try {
      setAudioError(null);
      setIsTestingOutput(true);

      // Create a test tone
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(outputVolume / 100 * 0.3, audioContext.currentTime); // Reduce volume

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Try to set output device if supported
      if (audioContext.setSinkId && selectedOutputDevice) {
        try {
          await audioContext.setSinkId(selectedOutputDevice);
        } catch (e) {
          console.warn("Could not set output device:", e);
        }
      }

      oscillator.start();

      // Play for 1 second
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setIsTestingOutput(false);
      }, 1000);
    } catch (error) {
      console.error("Error testing speaker:", error);
      setAudioError("Failed to test speaker: " + error.message);
      setIsTestingOutput(false);
    }
  };

  // Handle ringtone selection change
  const handleRingtoneChange = (event) => {
    const ringtoneId = event.target.value;
    setSelectedRingtone(ringtoneId);
    ringtoneService.setSelectedRingtone(ringtoneId);
  };

  // Preview ringtone
  const previewRingtone = async () => {
    try {
      setAudioError(null);

      // Stop any existing preview
      if (ringtonePreviewRef.current) {
        ringtonePreviewRef.current.pause();
        ringtonePreviewRef.current.currentTime = 0;
      }

      setIsPreviewingRingtone(true);

      // Create audio element for preview
      const audio = new Audio(ringtoneService.getRingtoneUrl(selectedRingtone));
      ringtonePreviewRef.current = audio;
      audio.volume = outputVolume / 100;
      audio.loop = false;

      // Try to set output device if supported
      if (audio.setSinkId && selectedOutputDevice) {
        try {
          await audio.setSinkId(selectedOutputDevice);
        } catch (e) {
          console.warn("Could not set output device for ringtone preview:", e);
        }
      }

      audio.play();

      // Stop after 3 seconds
      setTimeout(() => {
        if (ringtonePreviewRef.current) {
          ringtonePreviewRef.current.pause();
          ringtonePreviewRef.current.currentTime = 0;
        }
        setIsPreviewingRingtone(false);
      }, 3000);

      // Also stop when audio ends naturally
      audio.onended = () => {
        setIsPreviewingRingtone(false);
      };
    } catch (error) {
      console.error("Error previewing ringtone:", error);
      setAudioError("Failed to preview ringtone: " + error.message);
      setIsPreviewingRingtone(false);
    }
  };

  // Stop ringtone preview
  const stopRingtonePreview = () => {
    if (ringtonePreviewRef.current) {
      ringtonePreviewRef.current.pause();
      ringtonePreviewRef.current.currentTime = 0;
    }
    setIsPreviewingRingtone(false);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopMicTest();
      // Stop ringtone preview on cleanup
      if (ringtonePreviewRef.current) {
        ringtonePreviewRef.current.pause();
        ringtonePreviewRef.current.currentTime = 0;
      }
    };
  }, []);

  const features = [
    "SIP Integration",
    "WhatsApp Integration",
    "Email Support",
    "Facebook Integration",
    "Call History",
    "Campaign Management",
    "Agent Status Monitoring",
    "Real-time Analytics",
  ];

  return (
    <ContentFrame
      open={open}
      onClose={onClose}
      title="About the Appbar"
      headerColor="#2196f3"
    >
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* App Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <InfoIcon color="primary" />
                Application Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Update fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Version" secondary={appInfo.version} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Build fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Build Number"
                    secondary={appInfo.buildNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Code fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Environment"
                    secondary={appInfo.environment}
                  />
                </ListItem>
              </List>
            </Paper>

            {/* System Information */}
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Storage color="primary" />
                System Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Electron Version"
                    secondary={appInfo.electron}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Chrome Version"
                    secondary={appInfo.chrome}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Node Version"
                    secondary={appInfo.node}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Platform"
                    secondary={appInfo.platform}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Audio Device Settings - Full Width */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <VolumeUp color="primary" />
                  Audio Device Settings
                </Typography>
                <IconButton onClick={refreshDevices} size="small" title="Refresh devices">
                  <Refresh />
                </IconButton>
              </Box>

              {audioError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAudioError(null)}>
                  {audioError}
                </Alert>
              )}

              {permissionStatus === "denied" && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Microphone access is denied. Please enable it in your system settings to use audio features.
                </Alert>
              )}

              <Grid container spacing={3}>
                {/* Microphone Settings */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Mic fontSize="small" color="primary" />
                      Microphone (Input)
                    </Typography>

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Select Microphone</InputLabel>
                      <Select
                        value={selectedInputDevice}
                        onChange={handleInputDeviceChange}
                        label="Select Microphone"
                      >
                        {audioInputDevices.map((device) => (
                          <MenuItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                      <Mic fontSize="small" color="action" />
                      <Slider
                        value={inputVolume}
                        onChange={handleInputVolumeChange}
                        aria-label="Input Volume"
                        valueLabelDisplay="auto"
                        min={0}
                        max={100}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 40 }}>
                        {inputVolume}%
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Button
                        variant={isTestingMic ? "contained" : "outlined"}
                        color={isTestingMic ? "error" : "primary"}
                        size="small"
                        startIcon={isTestingMic ? <Stop /> : <PlayArrow />}
                        onClick={isTestingMic ? stopMicTest : startMicTest}
                        disabled={permissionStatus === "denied"}
                      >
                        {isTestingMic ? "Stop Test" : "Test Microphone"}
                      </Button>

                      {isTestingMic && (
                        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              flex: 1,
                              height: 8,
                              backgroundColor: "#e0e0e0",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                width: `${micLevel}%`,
                                height: "100%",
                                backgroundColor: micLevel > 70 ? "#f44336" : micLevel > 40 ? "#ff9800" : "#4caf50",
                                transition: "width 0.1s ease-out",
                              }}
                            />
                          </Box>
                          <CheckCircle fontSize="small" color="success" />
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Speaker Settings */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <VolumeUp fontSize="small" color="primary" />
                      Speaker (Output)
                    </Typography>

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Select Speaker</InputLabel>
                      <Select
                        value={selectedOutputDevice}
                        onChange={handleOutputDeviceChange}
                        label="Select Speaker"
                      >
                        {audioOutputDevices.map((device) => (
                          <MenuItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                      <VolumeUp fontSize="small" color="action" />
                      <Slider
                        value={outputVolume}
                        onChange={handleOutputVolumeChange}
                        aria-label="Output Volume"
                        valueLabelDisplay="auto"
                        min={0}
                        max={100}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 40 }}>
                        {outputVolume}%
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={isTestingOutput ? <CircularProgress size={16} /> : <PlayArrow />}
                      onClick={testSpeakerOutput}
                      disabled={isTestingOutput}
                    >
                      {isTestingOutput ? "Playing..." : "Test Speaker"}
                    </Button>
                  </Box>
                </Grid>

                {/* Ringtone Settings */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <MusicNoteIcon fontSize="small" color="primary" />
                      Ringtone
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Select Ringtone</InputLabel>
                        <Select
                          value={selectedRingtone}
                          onChange={handleRingtoneChange}
                          label="Select Ringtone"
                        >
                          {AVAILABLE_RINGTONES.map((ringtone) => (
                            <MenuItem key={ringtone.id} value={ringtone.id}>
                              {ringtone.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant={isPreviewingRingtone ? "contained" : "outlined"}
                        color={isPreviewingRingtone ? "error" : "primary"}
                        size="small"
                        startIcon={isPreviewingRingtone ? <Stop /> : <PlayArrow />}
                        onClick={isPreviewingRingtone ? stopRingtonePreview : previewRingtone}
                      >
                        {isPreviewingRingtone ? "Stop" : "Preview"}
                      </Button>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      This ringtone will play when you receive incoming calls.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                Audio settings are automatically saved and will be used for all calls.
                Make sure to test your devices before making important calls.
              </Typography>
            </Paper>
          </Grid>

          {/* Features and Support */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Speed color="primary" />
                Features
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {features.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Paper>

            {/* Support Information */}
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Security color="primary" />
                Support & Resources
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <BugReport fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Report Issues"
                    secondary={
                      <Link href="#" target="_blank" underline="hover">
                        Submit a bug report
                      </Link>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Support Email"
                    secondary={
                      <Link href="mailto:sales@mmict.info" underline="hover">
                        sales@mmict.info
                      </Link>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LanguageIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Website"
                    secondary={
                      <Link href="https://mmict.it/" underline="hover">
                        https://mmict.it/
                      </Link>
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <GitHub fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Documentation"
                    secondary={
                      <Link href="#" target="_blank" underline="hover">
                        View documentation
                      </Link>
                    }
                  />
                </ListItem>
              </List>
            </Paper>
            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  mt: 4,
                  color: "text.secondary",
                  fontSize: "0.875rem",
                }}
              >
                <Typography variant="body2">
                  © {new Date().getFullYear()} MM-iCT. All rights reserved.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </ContentFrame>
  );
};

export default PhonebarInfo;
