//electron-softphone/src/components/Appbar.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  InputBase,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Select,
  MenuItem,
  Tooltip,
  Switch,
  DialogContent,
  TextField,
  Grid,
  InputAdornment,
  keyframes,
  CircularProgress,
  ListItemAvatar,
  Avatar,
  ListItem,
  Chip,
  Alert,
  Paper,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dialpad,
  PauseCircle,
  PlayArrow,
  AccountCircle,
  PowerSettingsNew,
  History,
  Assessment,
  Settings,
  Group,
  // Campaign,
  SupportAgent,
  Circle,
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  PauseCircleOutline as HoldIcon,
  PlayCircleOutline as UnholdIcon,
  WhatsApp as WhatsAppIcon,
  Dashboard,
  // Email as EmailIcon,
  // Facebook as FacebookIcon,
  Info as InfoIcon,
  Phone,
  Backspace,
  SwapCalls,
  CallMerge,
  CallMade,
  CallReceived,
  Person,
  PersonAdd,
  Search,
  StarBorder,
  Timeline,
  BarChart,
  SystemUpdateAlt,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
// import { io } from "socket.io-client";
// import DialPad from "./DialPad";
import { dtmfService } from "../services/dtmfService";
import { sipCallService, sipService } from "../services/sipService";
import { storageService } from "@/services/storageService";
import { useAuthState } from "../hooks/useAuthState";
import moment from "moment/moment";
import CallHistory from "./CallHistory";
import Reports from "./ReportsElectron";
// import Contacts from "./Contacts";
// import Campaigns from "./Campaigns";
import AgentStatus from "./AgentStatus";
import DashboardView from "./DashboardView";
// import EmailView from "./EmailView";
// import FacebookView from "./FacebookView";
import PhonebarInfo from "./PhonebarInfo";
import AgentDirectory from "./AgentDirectory";
import TransferHistory from "./TransferHistory";
import { useCallState } from "../hooks/useCallState";
import { useNotification } from "../contexts/NotificationContext";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { callMonitoringService } from "../services/callMonitoringServiceElectron";
import connectionManager from "../services/connectionManager";
import WhatsAppElectronComponent from "./WhatsAppElectronComponent";
import FeatureGate from "./FeatureGate";
import transferHistoryService from "../services/transferHistoryService";
import { agentService } from "../services/agentService";
import { pauseService } from "../services/pauseService";
import websocketService from "../services/websocketService";
// SessionAnalytics and Clients removed - datatool_server not used in this project
import ConfirmDialog from "./ConfirmDialog";
import { useNavigate } from "react-router-dom";
import CallPopup from "./CallPopup";
import AppUpdater from "./AppUpdater";
// datatoolApi removed - not used in this project
import { useStickyAppbar } from "../hooks/useStickyAppbar";
import APPBAR_CONFIG from "../config/appbarConfig";
import serverConfig from "../config/serverConfig";
import useLicense, { clearLicenseCache } from "../hooks/useLicense";
import { MENU_FEATURE_MAP, FEATURE_DISPLAY_NAMES } from "../utils/licenseFeatures";
import LockIcon from "@mui/icons-material/Lock";

// Debug connection manager import - removed excessive logging

const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.9);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
`;

const ringingPulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const ringingGlow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(94, 255, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 15px rgba(132, 255, 0, 0.8), 0 0 25px rgba(255, 152, 0, 0.4);
  }
  100% {
    box-shadow: 0 0 5px rgba(0, 255, 13, 0.5);
  }
`;

const Appbar = ({ onLogout, onToggleCollapse, isCollapsed }) => {
  const [registeredAgent, setRegisteredAgent] = useState(null);

  // Initialize hooks early
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // CRITICAL: Initialize centralized auth guard
  const {
    isAuthenticated: isAuthValid,
    checkAuth,
    guardedCallback,
    guardedAsync,
  } = useAuthGuard();

  // Use centralized auth state management
  const {
    user,
    mongoUser,
    isAuthenticated,
    isLoading,
    canInitServices,
    logout: authLogout,
  } = useAuthState();

  // Windows Sticky Appbar functionality
  const {
    isEnabled: isStickyAppbarEnabled,
    isLoading: isStickyAppbarLoading,
    isAvailable: isStickyAppbarAvailable,
    isNativeAvailable: isStickyAppbarNative,
    toggle: toggleStickyAppbar,
    error: stickyAppbarError,
  } = useStickyAppbar(); // Uses global APPBAR_CONFIG

  // License management for feature-based menu filtering
  const {
    checkMenuItem,
    filterMenuItems,
    isLicensed,
    licenseInfo,
    checkFeature,
    FEATURE_KEYS,
  } = useLicense();

  // Restore sticky appbar after successful authentication
  useEffect(() => {
    const restoreStickyAppbar = async () => {
      // Import the service directly to access restoreAfterAuth
      const { stickyAppbarService } = await import('../services/stickyAppbarService');

      if (stickyAppbarService.isAvailable() && stickyAppbarService.shouldRestoreAfterAuth()) {
        console.log('[Appbar] Restoring sticky appbar after authentication');
        // Small delay to ensure the window is fully loaded
        setTimeout(async () => {
          await stickyAppbarService.restoreAfterAuth();
        }, 500);
      }
    };

    // Only run when authenticated
    if (isAuthenticated && !isLoading) {
      restoreStickyAppbar();
    }
  }, [isAuthenticated, isLoading]);

  // Handle authentication state changes
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      return;
    }

    if (!isLoading && !isAuthenticated) {
      showNotification({
        message: "Session expired. Please log in again.",
        severity: "warning",
        duration: 3000,
      });
      storageService.clear();
      navigate("/");
    }
  }, [isAuthenticated, isLoading, showNotification, navigate]);

  const {
    callState,
    setCallState,
    answerCall,
    endCall,
    toggleMute,
    holdCall,
    unholdCall,
    CALL_STATES,
    handleReconnection,
  } = useCallState(sipService, sipCallService);

  // Then, other state declarations
  const [sipStatus, setSipStatus] = useState({
    registered: false,
    state: "NOT_READY",
    lastRegistration: null,
    amiStatus: null,
  });

  // State for audio devices
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // UI Control State
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [miniDrawerOpen, setMiniDrawerOpen] = useState(true);
  const [dialerState, setDialerState] = useState({ phoneNumber: "" });
  const [callFeedback, setCallFeedback] = useState(null);

  // Add state for WhatsApp dialog
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  // Add new state for agent directory

  // Add states for each section
  const [activeSection, setActiveSection] = useState("dashboard");

  // Add state for WhatsApp initial chat
  const [whatsAppInitialChat, setWhatsAppInitialChat] = useState(null);

  // Add this after the Incoming Call Dialog and before the Section components
  const [isDialpadOpen, setIsDialpadOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState("");

  // Add state to track the currently pressed key
  const [activeKey, setActiveKey] = useState(null);

  // Add this near your other state declarations
  const [registrationState, setRegistrationState] = useState("Unregistered");

  // Presence control for pauses
  const [presence, setPresence] = useState("READY");
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReasons, setPauseReasons] = useState([]);
  const [pauseReasonsLoading, setPauseReasonsLoading] = useState(false);
  const [selectedPauseReason, setSelectedPauseReason] = useState(null);
  const [currentPauseReason, setCurrentPauseReason] = useState(null);
  const [pauseStartTime, setPauseStartTime] = useState(null);

  // Add this with other state declarations
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [maxReconnectionAttempts] = useState(5);
  const [reconnectionTimeout, setReconnectionTimeout] = useState(null);
  const [connectionHealth, setConnectionHealth] = useState(100);

  // Auto-answer state - tracks the current phonebar auto-answer setting
  const [autoAnswerEnabled, setAutoAnswerEnabled] = useState(
    () => storageService.getUserData()?.user?.phoneBarAutoAnswer || false
  );
  const [autoAnswerDelay, setAutoAnswerDelay] = useState(
    () => storageService.getUserData()?.user?.phoneBarAutoAnswerDelay || 0
  );

  // Listen for real-time auto-answer setting updates via websocket
  useEffect(() => {
    const handleSettingsUpdate = (settings) => {
      console.log("[Appbar] Received user settings update:", settings);
      if (settings?.phoneBarAutoAnswer !== undefined) {
        setAutoAnswerEnabled(settings.phoneBarAutoAnswer);
      }
      if (settings?.phoneBarAutoAnswerDelay !== undefined) {
        setAutoAnswerDelay(settings.phoneBarAutoAnswerDelay);
      }
    };

    websocketService.on("user:settings_updated", handleSettingsUpdate);

    return () => {
      websocketService.off("user:settings_updated", handleSettingsUpdate);
    };
  }, []);

  // Client lookup removed - datatool_server not used in this project

  // Registration status (align with DashboardView): prefer contactUri, fall back to AMI flags
  const isRegistered = useMemo(() => {
    try {
      if (!registeredAgent) return false;
      const ext = registeredAgent.extension || "";
      const contactUri = registeredAgent.contactUri || "";
      const isOfflineUri =
        contactUri === `sip:${ext}@offline` ||
        /@offline$/i.test(String(contactUri));
      const isExpired =
        !!registeredAgent.expirationTime &&
        registeredAgent.expirationTime <= Math.floor(Date.now() / 1000);
      const contactOk = Boolean(contactUri && !isOfflineUri && !isExpired);
      const amiOk =
        registeredAgent.isRegistered === true ||
        registeredAgent.status === "Registered" ||
        registeredAgent.online === true;
      return contactOk || amiOk;
    } catch (_) {
      return false;
    }
  }, [registeredAgent]);

  // Add new state for transfer dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [availableAgents, setAvailableAgents] = useState([]);
  const [availableAgentsLoading, setAvailableAgentsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferFilter, setTransferFilter] = useState("all"); // all, available, onCall
  const [transferSearchQuery, setTransferSearchQuery] = useState("");
  const [transferType, setTransferType] = useState("blind"); // blind, attended
  const [isAttendedTransfer, setIsAttendedTransfer] = useState(false);
  const [consultationCall, setConsultationCall] = useState(null);

  // Add refs for cleanup
  const transferTimeoutRef = useRef(null);
  const transferEventHandlersRef = useRef({
    success: null,
    failed: null,
    progress: null,
  });

  // Add debounce timer for registration state changes to prevent racing conditions
  const registrationDebounceRef = useRef(null);

  // ========== Function Definitions ==========

  // Logout Handler - MOVED UP
  const handleLogout = async (force = false) => {
    // Prevent multiple logout attempts
    if (isLoggingOut) {
      return;
    }

    // Only show confirmation dialog for manual logout, not forced logout
    // force = true is used for automatic logout when registration is lost
    if (!force) {
      setLogoutDialogOpen(true);
      return;
    }

    performLogout();
  };

  // Perform the actual logout
  const performLogout = async () => {
    setLogoutDialogOpen(false);
    setIsLoggingOut(true);

    // CRITICAL: Set global logout flag immediately to prevent any further service calls
    window.isLoggingOut = true;
    window.isAuthenticating = false; // Clear authentication flag during logout
    window.logoutTimestamp = Date.now();

    // Block all non-essential API calls immediately
    window.apiCallsBlocked = true;

    // Show logout notification
    showNotification({
      message: "Logging out... Please wait",
      severity: "info",
      duration: null, // Don't auto-hide
    });

    try {
      // Step 1: Set logout flag first to prevent all state updates
      // Don't clear UI state immediately to avoid flickering
      // The logout flag will prevent all handlers from updating state

      // Step 2: Disconnect all services first to prevent reconnection loops

      // CRITICAL: Disconnect call monitoring service and clear all its state
      try {
        // Use the enhanced forceReset method for complete cleanup
        if (
          callMonitoringService &&
          typeof callMonitoringService.forceReset === "function"
        ) {
          callMonitoringService.forceReset();
        } else {
          // Fallback to regular disconnect
          callMonitoringService.disconnect();
        }

        // Clear any remaining call monitoring state
        if (window.dashboardAgentsList) {
          delete window.dashboardAgentsList;
        }
        if (window.handleDirectCall) {
          delete window.handleDirectCall;
        }
      } catch (error) {
        console.warn("Call monitoring disconnect failed:", error);
      }

      // CRITICAL: Force reset connection manager to prevent reconnection loops
      if (connectionManager) {
        try {
          // Stop health monitoring if running
          if (connectionManager._healthMonitoringCleanup) {
            try {
              connectionManager._healthMonitoringCleanup();
            } catch (cleanupError) {
              console.warn(
                "⚠️ Error stopping health monitoring:",
                cleanupError
              );
            }
          }

          // Force reset connection manager state
          if (typeof connectionManager.forceReset === "function") {
            connectionManager.forceReset();
          } else if (typeof connectionManager.resetState === "function") {
            connectionManager.resetState();
          }
        } catch (error) {
          console.warn("Connection manager force reset failed:", error);
        }
      }

      // Disconnect SIP service with timeout
      const sipDisconnectPromise = sipService.disconnect();
      const sipTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SIP disconnect timeout")), 5000)
      );
      await Promise.race([sipDisconnectPromise, sipTimeout]);

      // Step 3: Logout from agent service with timeout
      const agentLogoutPromise = agentService.logout();
      const agentTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Agent logout timeout")), 5000)
      );
      await Promise.race([agentLogoutPromise, agentTimeout]);

      // Step 3.5: Notify backend of logout to update ps_contacts table
      try {
        const userData = storageService.getUserData();
        const token = storageService.getAuthToken();

        if (userData?.user?.extension && token) {
          const logoutPromise = fetch(
            `${serverConfig.apiUrl}/api/users/agent-logout`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: token,
              },
            }
          );

          const logoutTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Backend logout timeout")), 3000)
          );

          await Promise.race([logoutPromise, logoutTimeout]);
        }
      } catch (backendError) {
        console.warn(
          "⚠️ Backend logout notification failed:",
          backendError.message
        );
        // Continue with logout even if backend notification fails
      }

      // Step 4: Clear all event listeners and timers

      // Clear SIP service event listeners
      sipService.events.removeAllListeners();

      // Clear agent service event listeners
      try {
        agentService.removeAllListeners();
      } catch (error) {
        console.warn("Agent service event cleanup failed:", error);
      }

      // Clear connection manager event listeners
      if (connectionManager) {
        try {
          // Remove specific event listeners using the off method with stored handlers
          if (connectionManager._eventHandlers) {
            connectionManager.off(
              "connection:stateChanged",
              connectionManager._eventHandlers.stateChanged
            );
            connectionManager.off(
              "connection:reconnected",
              connectionManager._eventHandlers.reconnected
            );
            connectionManager.off(
              "connection:maxAttemptsReached",
              connectionManager._eventHandlers.maxAttemptsReached
            );
            connectionManager.off(
              "connection:allHealthy",
              connectionManager._eventHandlers.allHealthy
            );
            connectionManager.off(
              "connection:partiallyHealthy",
              connectionManager._eventHandlers.partiallyHealthy
            );

            // Clear the stored handlers
            delete connectionManager._eventHandlers;
          }

          // Reset the event listener registration flag
          connectionManager._eventListenersRegistered = false;
          // Reset the call monitoring service setup flag
          connectionManager._callMonitoringServiceSet = false;
        } catch (error) {
          console.warn("Connection manager event cleanup failed:", error);
        }
      }

      // Clear all custom event listeners
      window.removeEventListener("websocket:event", () => { });
      window.removeEventListener("sip:event", () => { });
      window.removeEventListener("ami:event", () => { });
      window.removeEventListener("websocket:connected", () => { });
      window.removeEventListener("websocket:disconnected", () => { });
      window.removeEventListener("websocket:connection_error", () => { });
      window.removeEventListener("websocket:reconnected", () => { });
      window.removeEventListener("websocket:reconnect_attempt", () => { });
      window.removeEventListener("websocket:reconnect_error", () => { });
      window.removeEventListener("websocket:reconnect_failed", () => { });
      window.removeEventListener("connected", () => { });
      window.removeEventListener("disconnected", () => { });
      window.removeEventListener("connection_error", () => { });
      window.removeEventListener("reconnected", () => { });
      window.removeEventListener("reconnect_failed", () => { });

      // Clear any remaining timers
      if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
        setReconnectionTimeout(null);
      }

      // Clear registration debounce timer
      if (registrationDebounceRef.current) {
        clearTimeout(registrationDebounceRef.current);
        registrationDebounceRef.current = null;
      }

      // Clear transfer timeout
      if (transferTimeoutRef.current) {
        clearTimeout(transferTimeoutRef.current);
        transferTimeoutRef.current = null;
      }

      // CRITICAL: Clear ALL remaining timers and intervals that might be running
      try {
        // Clear any remaining setInterval calls
        const highestIntervalId = window.setInterval(() => { }, 0);
        for (let i = 1; i <= highestIntervalId; i++) {
          try {
            clearInterval(i);
          } catch (error) {
            // Ignore errors for non-existent intervals
          }
        }

        // Clear any remaining setTimeout calls (except the one we're about to set)
        const highestTimeoutId = window.setTimeout(() => { }, 0);
        for (let i = 1; i <= highestTimeoutId; i++) {
          try {
            clearTimeout(i);
          } catch (error) {
            // Ignore errors for non-existent timeouts
          }
        }
      } catch (error) {
        console.warn("⚠️ Error clearing remaining timers:", error);
      }

      // Step 5: Use centralized logout (backend WS will broadcast availability)
      await authLogout();

      // Step 6: Clear all local state and prevent further operations

      // Clear all React state to prevent further operations
      setRegisteredAgent(null);
      setCallState({
        state: "idle",
        direction: null,
        remoteIdentity: null,
        duration: 0,
        muted: false,
        onHold: false,
        uniqueId: null,
      });
      setReconnectionAttempts(0);
      setConnectionHealth(0);
      setActiveSection(null);
      setMenuOpen(false);
      setTransferDialogOpen(false);
      setConsultationCall(null);
      setIsAttendedTransfer(false);
      setAvailableAgents([]);
      setCallFeedback(null);

      // CRITICAL: Force close any open sections that might be making API calls

      // Force close DashboardView if open
      if (activeSection === "dashboard") {
        setActiveSection(null);
      }

      // Force close any other sections that might be making API calls
      const apiCallingSections = [
        "callHistory",
        "reports",
        "sessionAnalytics",
        "agentStatus",
      ];
      apiCallingSections.forEach((section) => {
        if (activeSection === section) {
          setActiveSection(null);
        }
      });

      // Clear storage
      storageService.clear();

      // Clear license cache
      clearLicenseCache();

      // Clear localStorage items that might persist
      // Note: We preserve "rememberMe" and encrypted credentials for the Remember Me functionality
      try {
        localStorage.removeItem("authToken");
        localStorage.removeItem("mongoToken");
        localStorage.removeItem("host");
        localStorage.removeItem("email");
        // localStorage.removeItem("rememberMe"); // Keep this for Remember Me functionality
        localStorage.removeItem("useRemoteUrl");
        // Note: encryptedCredentials are also preserved for Remember Me functionality
      } catch (error) {
        console.warn("LocalStorage cleanup failed:", error);
      }

      // Clear sessionStorage
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn("SessionStorage cleanup failed:", error);
      }

      // Step 6.5: Small delay to ensure all cleanup is complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // CRITICAL: Restore original fetch and XHR functions
      try {
        // Restore original fetch if we stored it
        if (window._originalFetch) {
          window.fetch = window._originalFetch;
          delete window._originalFetch;
        }

        // Restore original XMLHttpRequest if we stored it
        if (window._originalXHROpen) {
          XMLHttpRequest.prototype.open = window._originalXHROpen;
          delete window._originalXHROpen;
        }
      } catch (error) {
        console.warn("⚠️ Error restoring API functions:", error);
      }

      // Step 7: Clear global variables and prevent reconnection

      // Clear any global variables that might cause reconnection attempts
      if (window.dashboardAgentsList) {
        delete window.dashboardAgentsList;
      }
      if (window.handleDirectCall) {
        delete window.handleDirectCall;
      }

      // Set a global flag to prevent any further service initialization
      window.isLoggingOut = true;
      window.isAuthenticating = false; // Clear authentication flag during logout
      window.logoutTimestamp = Date.now();

      // CRITICAL: Set additional flags to prevent any remaining operations
      window.isDisconnecting = true;
      window.isCleaningUp = true;
      window.logoutInProgress = true;

      // GRACEFUL: Set a flag to prevent components from making API calls
      window.apiCallsBlocked = true;

      // CRITICAL: Intercept and block all remaining API calls
      try {
        // Store original fetch
        window._originalFetch = window.fetch;

        // Override fetch to block all calls during logout, but allow during authentication
        window.fetch = function (...args) {
          if (
            window.isLoggingOut ||
            window.isDisconnecting ||
            window.isCleaningUp
          ) {
            // CRITICAL: Allow API calls during authentication
            if (window.isAuthenticating) {
              return window._originalFetch.apply(this, args);
            }

            // GRACEFUL: Return empty response instead of throwing error

            // Return a mock response that won't crash the application
            return Promise.resolve({
              ok: false,
              status: 0,
              statusText: "Blocked during logout",
              json: async () => ({
                success: false,
                data: null,
                message: "Service unavailable during logout",
              }),
              text: async () => "Service unavailable during logout",
              headers: new Headers(),
            });
          }
          return window._originalFetch.apply(this, args);
        };

        // Store original XMLHttpRequest
        window._originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
          if (
            window.isLoggingOut ||
            window.isDisconnecting ||
            window.isCleaningUp
          ) {
            // CRITICAL: Allow XHR calls during authentication
            if (window.isAuthenticating) {
              return window._originalXHROpen.call(this, method, url, ...rest);
            }

            // GRACEFUL: Override XHR methods to prevent errors

            // Override send method to prevent actual requests
            this.send = function () {
              // Simulate a successful but empty response
              setTimeout(() => {
                if (this.onreadystatechange) {
                  this.readyState = 4;
                  this.status = 0;
                  this.statusText = "Blocked during logout";
                  this.responseText = "Service unavailable during logout";
                  this.response = "Service unavailable during logout";
                  this.onreadystatechange();
                }
              }, 10);
            };

            // Override addEventListener to prevent actual event handling
            this.addEventListener = function (type, listener) {
              // Only allow readystatechange events
              if (type === "readystatechange") {
                this._blockedListeners = this._blockedListeners || [];
                this._blockedListeners.push(listener);
              }
            };

            // Override removeEventListener
            this.removeEventListener = function (type, listener) {
              if (this._blockedListeners) {
                const index = this._blockedListeners.indexOf(listener);
                if (index > -1) {
                  this._blockedListeners.splice(index, 1);
                }
              }
            };

            // Return without calling original open to prevent actual connection
            return;
          }
          return window._originalXHROpen.call(this, method, url, ...rest);
        };
      } catch (error) {
        console.warn("⚠️ Error setting up API interceptor:", error);
      }

      // CRITICAL: Clear any remaining event listeners that might trigger operations
      try {
        // Remove all custom events that might trigger reconnection
        const customEvents = [
          "websocket:event",
          "sip:event",
          "ami:event",
          "websocket:connected",
          "websocket:disconnected",
          "websocket:connection_error",
          "websocket:reconnected",
          "websocket:reconnect_attempt",
          "websocket:reconnect_error",
          "websocket:reconnect_failed",
          "connected",
          "disconnected",
          "connection_error",
          "reconnected",
          "reconnect_failed",
          "call:event",
          "registration:state",
          "registered",
          "unregistered",
        ];

        customEvents.forEach((eventName) => {
          try {
            window.removeEventListener(eventName, () => { });
          } catch (error) {
            // Ignore errors for non-existent listeners
          }
        });

        console.log("✅ All custom event listeners cleared");
      } catch (error) {
        console.warn("⚠️ Error clearing custom event listeners:", error);
      }

      // Clear any remaining service references
      if (window.callMonitoringService) {
        delete window.callMonitoringService;
      }
      if (window.connectionManager) {
        delete window.connectionManager;
      }

      // CRITICAL: Clear any remaining AMI service references
      if (window.amiService) {
        try {
          if (typeof window.amiService.disconnect === "function") {
            window.amiService.disconnect();
          }
          delete window.amiService;
        } catch (error) {
          console.warn("⚠️ Error clearing AMI service:", error);
        }
      }

      // CRITICAL: Clear any remaining WebSocket connections
      if (window.websocketService) {
        try {
          if (typeof window.websocketService.disconnect === "function") {
            window.websocketService.disconnect();
          }
          delete window.websocketService;
        } catch (error) {
          console.warn("⚠️ Error clearing WebSocket service:", error);
        }
      }

      // CRITICAL: Clear any remaining SIP service references
      if (window.sipService) {
        try {
          if (typeof window.sipService.disconnect === "function") {
            window.sipService.disconnect();
          }
          delete window.sipService;
        } catch (error) {
          console.warn("⚠️ Error clearing SIP service:", error);
        }
      }

      // CRITICAL: Clear any remaining agent service references
      if (window.agentService) {
        try {
          if (typeof window.agentService.logout === "function") {
            window.agentService.logout();
          }
          delete window.agentService;
        } catch (error) {
          console.warn("⚠️ Error clearing agent service:", error);
        }
      }

      // CRITICAL: Final cleanup verification

      // Verify all critical services are disconnected
      const verificationChecks = [
        {
          name: "Call Monitoring Service",
          service: window.callMonitoringService,
          check: "disconnect",
        },
        {
          name: "Connection Manager",
          service: window.connectionManager,
          check: "forceReset",
        },
        {
          name: "AMI Service",
          service: window.amiService,
          check: "disconnect",
        },
        {
          name: "WebSocket Service",
          service: window.websocketService,
          check: "disconnect",
        },
        {
          name: "SIP Service",
          service: window.sipService,
          check: "disconnect",
        },
        {
          name: "Agent Service",
          service: window.agentService,
          check: "logout",
        },
      ];

      verificationChecks.forEach(({ name, service, check }) => {
        if (service) {
          console.warn(`⚠️ ${name} still exists in window object`);
          try {
            if (typeof service[check] === "function") {
              service[check]();
            }
          } catch (error) {
            console.warn(`⚠️ Error calling ${check} on ${name}:`, error);
          }
        }
      });

      // Verify global flags are set
      const requiredFlags = [
        "isLoggingOut",
        "isAuthenticating",
        "isDisconnecting",
        "isCleaningUp",
        "logoutInProgress",
      ];
      requiredFlags.forEach((flag) => {
        if (window[flag] === undefined) {
          console.warn(`⚠️ Global flag ${flag} not set`);
        }
      });

      // CRITICAL: Force cleanup of any remaining service instances
      try {
        // Force cleanup of call history service
        if (window.callHistoryService) {
          delete window.callHistoryService;
        }

        // Force cleanup of any remaining API instances
        if (window.API) {
          delete window.API;
        }

        // Force cleanup of any remaining socket.io instances
        if (window.io) {
          delete window.io;
        }

        // Force cleanup of any remaining service references
        const serviceKeys = Object.keys(window).filter(
          (key) =>
            key.includes("Service") ||
            key.includes("Manager") ||
            key.includes("API") ||
            key.includes("socket") ||
            key.includes("websocket")
        );

        serviceKeys.forEach((key) => {
          if (window[key] && typeof window[key] === "object") {
            try {
              if (typeof window[key].disconnect === "function") {
                window[key].disconnect();
              }
              if (typeof window[key].cleanup === "function") {
                window[key].cleanup();
              }
              if (typeof window[key].destroy === "function") {
                window[key].destroy();
              }
              delete window[key];
            } catch (error) {
              console.warn(`⚠️ Error cleaning up service ${key}:`, error);
              delete window[key];
            }
          }
        });
      } catch (error) {
        console.warn("⚠️ Error during force service cleanup:", error);
      }

      // Step 8: Navigate to login
      navigate("/", { replace: true });

      // Step 9: Call onLogout callback if provided
      if (onLogout) {
        onLogout();
      }

      // Show success notification
      showNotification({
        message: "Logged out successfully",
        severity: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Logout process failed:", error);

      // Force cleanup even if some steps failed
      try {
        // Force disconnect all services
        try {
          callMonitoringService.disconnect();

          // Clear call monitoring state
          if (window.dashboardAgentsList) {
            delete window.dashboardAgentsList;
          }
          if (window.handleDirectCall) {
            delete window.handleDirectCall;
          }
        } catch (error) {
          console.warn("Forced call monitoring disconnect failed:", error);
        }

        try {
          await sipService.disconnect();
        } catch (sipError) {
          console.warn("Forced SIP disconnect failed:", sipError);
        }

        // Clear storage
        storageService.clear();

        // Clear all event listeners
        try {
          sipService.events.removeAllListeners();

          if (
            agentService &&
            typeof agentService.removeAllListeners === "function"
          ) {
            agentService.removeAllListeners();
          }

          if (connectionManager) {
            try {
              // Remove specific event listeners using the off method with stored handlers
              if (connectionManager._eventHandlers) {
                connectionManager.off(
                  "connection:stateChanged",
                  connectionManager._eventHandlers.stateChanged
                );
                connectionManager.off(
                  "connection:reconnected",
                  connectionManager._eventHandlers.reconnected
                );
                connectionManager.off(
                  "connection:maxAttemptsReached",
                  connectionManager._eventHandlers.maxAttemptsReached
                );
                connectionManager.off(
                  "connection:allHealthy",
                  connectionManager._eventHandlers.allHealthy
                );
                connectionManager.off(
                  "connection:partiallyHealthy",
                  connectionManager._eventHandlers.partiallyHealthy
                );

                // Clear the stored handlers
                delete connectionManager._eventHandlers;
              }

              // Reset the event listener registration flag
              connectionManager._eventListenersRegistered = false;
              // Reset the call monitoring service setup flag
              connectionManager._callMonitoringServiceSet = false;
            } catch (error) {
              console.warn("Connection manager forced cleanup failed:", error);
            }
          }

          // Clear custom event listeners
          window.removeEventListener("websocket:event", () => { });
          window.removeEventListener("sip:event", () => { });
          window.removeEventListener("ami:event", () => { });
          window.removeEventListener("websocket:connected", () => { });
          window.removeEventListener("websocket:disconnected", () => { });
          window.removeEventListener("websocket:connection_error", () => { });
          window.removeEventListener("websocket:reconnected", () => { });
          window.removeEventListener("websocket:reconnect_attempt", () => { });
          window.removeEventListener("websocket:reconnect_error", () => { });
          window.removeEventListener("websocket:reconnect_failed", () => { });
          window.removeEventListener("connected", () => { });
          window.removeEventListener("disconnected", () => { });
          window.removeEventListener("connection_error", () => { });
          window.removeEventListener("reconnected", () => { });
          window.removeEventListener("reconnect_failed", () => { });
        } catch (error) {
          console.warn("Event listener cleanup failed:", error);
        }

        // Clear timers
        if (reconnectionTimeout) {
          clearTimeout(reconnectionTimeout);
        }
        if (registrationDebounceRef.current) {
          clearTimeout(registrationDebounceRef.current);
        }
        if (transferTimeoutRef.current) {
          clearTimeout(transferTimeoutRef.current);
        }

        // Clear global variables
        if (window.dashboardAgentsList) {
          delete window.dashboardAgentsList;
        }
        if (window.handleDirectCall) {
          delete window.handleDirectCall;
        }
        window.isLoggingOut = true;
        window.isAuthenticating = false; // Clear authentication flag during logout
        window.logoutTimestamp = Date.now();

        // Navigate to login
        navigate("/", { replace: true });

        if (onLogout) {
          onLogout();
        }
      } catch (cleanupError) {
        console.error("Forced cleanup also failed:", cleanupError);
        // Last resort - just navigate
        navigate("/", { replace: true });
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Check if SIP service is actually connected
  const checkSipConnection = guardedCallback(() => {
    const isConnected =
      sipService.isConnected &&
      sipService.state?.userAgent &&
      sipService.state?.registerer;

    return isConnected;
  }, "SIP Connection Check");

  // AMI verification removed; rely on SIP registration events + agent details fetch
  const initialExtensionCheckDone = useRef(false);
  // Ref to store fetchRegisteredAgentDetails to prevent useEffect re-runs on UI-only changes (like dock toggle)
  const fetchRegisteredAgentDetailsRef = useRef(null);

  // Fetch agent details by extension when SIP is registered
  const fetchRegisteredAgentDetails = useCallback(
    guardedAsync(async (extension) => {
      if (!extension) return;

      try {
        const agentDetails = await agentService.getAgentDetailsByExtension(
          extension
        );

        // CRITICAL: Validate agentDetails structure to prevent React crashes
        if (!agentDetails || typeof agentDetails !== "object") {
          console.warn(
            "⚠️ Invalid agentDetails structure in fetchRegisteredAgentDetails:",
            agentDetails
          );
          setRegisteredAgent(null);
          return;
        }

        // Check registration based on contactUri first (the actual proof of registration)
        // AMI status is secondary for monitoring/updates
        const hasValidContactUri =
          agentDetails &&
          agentDetails.contactUri &&
          agentDetails.contactUri !== `sip:${extension}@offline` &&
          agentDetails.contactUri !== "sip:${extension}@offline";

        // Also check expiration if available
        const isNotExpired =
          !agentDetails?.expirationTime ||
          agentDetails.expirationTime > Math.floor(Date.now() / 1000);

        // Primary check: valid contactUri + not expired = registered
        const isAgentRegistered =
          (hasValidContactUri && isNotExpired) ||
          (agentDetails &&
            (agentDetails.isRegistered === true || // Fallback to AMI status
              agentDetails.status === "Registered" || // Agent registered status
              agentDetails.online === true)); // Online flag

        // Debug: Log when contactUri indicates registered but AMI might not
        if (hasValidContactUri && isNotExpired && !agentDetails.isRegistered) {
          console.log(
            "🔍 ContactUri indicates registered but AMI disagrees (fetchRegisteredAgentDetails):",
            {
              extension,
              contactUri: agentDetails.contactUri,
              amiStatus: agentDetails.status,
              isRegistered: agentDetails.isRegistered,
              expirationTime: agentDetails.expirationTime,
            }
          );
        }

        if (isAgentRegistered) {
          // CRITICAL: Ensure amiStatus is safe before setting state
          const safeAmiStatus = (() => {
            if (
              agentDetails.amiStatus &&
              typeof agentDetails.amiStatus === "string"
            ) {
              return agentDetails.amiStatus;
            }
            if (
              agentDetails.amiStatus &&
              typeof agentDetails.amiStatus === "object"
            ) {
              // If amiStatus is an object, extract useful info or fallback
              if (agentDetails.amiStatus.status)
                return agentDetails.amiStatus.status;
              if (agentDetails.amiStatus.amiStatus)
                return agentDetails.amiStatus.amiStatus;
            }
            return agentDetails.status || "Registered";
          })();

          setRegisteredAgent(agentDetails);
        } else {
          setRegisteredAgent(null);

          // If no valid contactUri, rely on reconnection flow instead of forcing logout
          if (!hasValidContactUri && agentDetails) {
            console.warn(
              "❌ No valid contactUri - will rely on reconnection, not auto-logout"
            );
            showNotification({
              message: "Registration lost. Attempting to reconnect...",
              severity: "warning",
              duration: 4000,
            });
            // Do not set window.isLoggingOut or force logout here
          }

          // If AMI is not connected, this indicates server issues
          if (agentDetails && agentDetails.amiConnected === false) {
            console.warn("⚠️ AMI not connected - server may be down");
          } else {
            // CRITICAL: Ensure amiStatus is safe before setting state
            const safeAmiStatus = (() => {
              if (
                agentDetails?.amiStatus &&
                typeof agentDetails.amiStatus === "string"
              ) {
                return agentDetails.amiStatus;
              }
              if (
                agentDetails?.amiStatus &&
                typeof agentDetails.amiStatus === "object"
              ) {
                // If amiStatus is an object, extract useful info or fallback
                if (agentDetails.amiStatus.status)
                  return agentDetails.amiStatus.status;
                if (agentDetails.amiStatus.amiStatus)
                  return agentDetails.amiStatus.amiStatus;
              }
              return agentDetails?.status || "Offline";
            })();

            // AMI is connected but agent not registered - nothing further for UI
          }
        }
      } catch (error) {
        console.error("Failed to fetch agent details:", error);
        setRegisteredAgent(null);

        // If it's a network error, immediately clear registration status
        if (
          error.message.includes("Network Error") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("ERR_CONNECTION_REFUSED") ||
          error.message.includes("ERR_EMPTY_RESPONSE")
        ) {
          console.warn("Network error detected - clearing registration status");
          // Also clear the registered agent since we can't verify status
          setRegisteredAgent(null);
        }
      }
    }, "Fetch Agent Details"),
    []
  );

  // Keep ref in sync with the callback (prevents useEffect re-runs on UI-only changes)
  fetchRegisteredAgentDetailsRef.current = fetchRegisteredAgentDetails;

  // ========== Memoized Values ==========

  // Registration Time Display
  const registrationTime = useMemo(() => {
    if (!registeredAgent?.lastRegistration) return null;
    try {
      const registrationMoment = moment(registeredAgent.lastRegistration);
      return registrationMoment.format("LTS");
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  }, [registeredAgent?.lastRegistration]);

  // Status Color Mapping
  const getStatusColor = useCallback(
    (status) =>
    ({
      registered: "#0ca",
      unregistered: "#999",
      error: "#f44",
      READY: "#0ca",
      NOT_READY: "#f44",
      BUSY: "#f90",
      BREAK: "#fc0",
      "On Call": "#f44",
      Ringing: "#f90",
    }[status] || "#999"),
    []
  );

  // ========== Call State Management ==========

  // Unified call state handler
  const handleCallStateChange = useCallback((newState) => {
    setCallState((prev) => ({
      ...prev,
      ...newState,
      muted: prev.muted, // Preserve mute state
    }));
  }, []);

  // Add this before the useEffect
  const registrationHandlers = {
    registered: (data) => {
      // no local SIP status; rely on contactUri fetch
    },
    unregistered: () => { },
    registration_failed: (error) => {
      setCallFeedback(`Registration failed: ${error.cause}`);
      setTimeout(() => setCallFeedback(null), 3000);
    },
  };

  // Then in your existing useEffect
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      console.log("Logout in progress, skipping SIP initialization");
      return;
    }

    // Don't initialize if user is not authenticated or if logout is in progress
    if (!canInitServices()) {
      return;
    }

    // CRITICAL: Use auth guard for the entire SIP initialization
    if (!checkAuth("SIP initialization")) {
      return;
    }

    const initializeSIPConnection = async () => {
      const userData = storageService.getUserData();
      const token = storageService.getAuthToken();

      // userData contains { user, mongoUser, tokens }
      // We need the SIP data from the user object
      if (!userData?.user?.pjsip || !token) {
        console.error("Missing configuration");
        setCallFeedback("Missing phone system configuration");
        return;
      }

      // CRITICAL: Add small delay to ensure tokens are fully propagated
      // This prevents race conditions where services try to connect before tokens are ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        // Check if SIP is already initialized and connected
        if (sipService.isConnected && sipService.state?.registerer) {
          // Check current registration state
          const currentState = sipService.state.registerer.state;
          const isRegistered = sipService.state.registerer.registered;

          if (isRegistered === true || currentState === "Registered") {
            setSipStatus((prev) => ({
              ...prev,
              state: currentState || "Registered",
              registered: true,
              lastRegistration: new Date().toISOString(),
            }));

            // Fetch agent details immediately
            const extension = userData.user.extension;
            if (extension) {
              fetchRegisteredAgentDetails(extension);
            }
          }
          return;
        }

        // Initialize SIP service
        await sipService.initialize({
          extension: userData.user.extension,
          // Single source of truth: Phonebar setting
          registerExpires: Number(userData.user?.phoneBarExpires) || undefined,
          pjsip: {
            server: userData.user.pjsip.server,
            password: userData.user.pjsip.password,
            ice_servers: userData.user.pjsip.ice_servers,
          },
        });

        // Check registration state after initialization
        if (sipService.state?.registerer) {
          const currentState = sipService.state.registerer.state;
          const isRegistered = sipService.state.registerer.registered;

          if (isRegistered === true || currentState === "Registered") {
            setSipStatus((prev) => ({
              ...prev,
              state: currentState || "Registered",
              registered: true,
              lastRegistration: new Date().toISOString(),
            }));

            // Fetch agent details immediately
            const extension = userData.user.extension;
            if (extension) {
              fetchRegisteredAgentDetails(extension);
            }
          }
        }
      } catch (error) {
        console.error("SIP initialization failed:", error);
        setCallFeedback(`Failed to initialize phone system: ${error.message}`);
      }
    };

    const wsHandlers = {
      "ws:connected": () => {
        setCallFeedback(null);
        // Rely on SIP internal reconnection; no forced re-register here
      },
      "ws:disconnected": () => {
        setCallFeedback("Connection lost - attempting to reconnect...");
      },
      "ws:failed": () => {
        setCallFeedback("Connection failed - please refresh the page");
      },
      "ws:error": (error) => {
        if (error === null) {
          // Clear error state when connection is restored
          setCallFeedback(null);
        }
      },
    };

    // Initialize connection
    initializeSIPConnection();

    // Register all handlers
    Object.entries({ ...registrationHandlers, ...wsHandlers }).forEach(
      ([event, handler]) => {
        sipService.events.on(event, handler);
      }
    );

    return () => {
      Object.entries({ ...registrationHandlers, ...wsHandlers }).forEach(
        ([event, handler]) => {
          sipService.events.off(event, handler);
        }
      );
    };
  }, []);

  // ========== Audio Device Management ==========
  // REVIEW Effect to handle audio devices
  // Audio Device Management
  useEffect(() => {
    async function getAudioDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput"
        );
        setAudioDevices(audioInputs);

        // Prefer Bluetooth device if available
        const bluetoothDevice = audioInputs.find((device) =>
          device.label.toLowerCase().includes("bluetooth")
        );
        if (bluetoothDevice) {
          setSelectedDevice(bluetoothDevice.deviceId);
        } else if (audioInputs.length > 0) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error("Error getting audio devices:", error);
      }
    }

    navigator.mediaDevices.addEventListener("devicechange", getAudioDevices);
    getAudioDevices();

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        getAudioDevices
      );
    };
  }, []);

  // ========== User Interaction Handlers ==========
  // Call Control Functions
  const handleMakeCall = guardedAsync(async () => {
    console.log("📞 handleMakeCall called with:", {
      dialNumber,
      dialerStatePhoneNumber: dialerState.phoneNumber,
      sipStatusRegistered: sipStatus.registered,
      username: user?.username,
    });

    // Check if system is in a valid state for making calls
    if (!isRegistered || !user?.username) {
      console.warn("❌ Cannot make call - system not ready:", {
        registered: isRegistered,
        username: user?.username,
      });
      showNotification({
        message:
          "Phone system not ready. Please wait for reconnection or log in again.",
        severity: "warning",
        duration: 4000,
      });
      return;
    }

    const numberToCall = dialNumber || dialerState.phoneNumber;
    console.log("📞 Number to call:", numberToCall);

    if (!numberToCall) {
      console.warn("❌ No number to call");
      // setCallFeedback("No number entered");
      setTimeout(() => setCallFeedback(null), 3000);
      return;
    }

    try {
      console.log(
        "📞 Attempting to make call via sipCallService to:",
        numberToCall
      );

      // Set call state with remote identity BEFORE making the call
      setCallState((prev) => ({
        ...prev,
        state: "ringing",
        direction: "outbound",
        remoteIdentity: numberToCall,
      }));

      await sipCallService.makeCall(numberToCall, {
        mediaConstraints: {
          audio: {
            deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        },
      });

      console.log("✅ Call initiated successfully to:", numberToCall);

      // Clear both number inputs
      setDialNumber("");
      setDialerState((prev) => ({ ...prev, phoneNumber: "" }));
      setIsDialpadOpen(false);
    } catch (error) {
      console.error("❌ Error initiating call:", error);
      setCallFeedback(`Call failed: ${error.message}`);
      setTimeout(() => setCallFeedback(null), 3000);
    }
  }, "Make Call");

  // End call handler
  const handleEndCall = guardedAsync(async () => {
    try {
      await endCall();
    } catch (error) {
      setCallFeedback(`Failed to end call: ${error.message}`);
      setTimeout(() => setCallFeedback(null), 3000);
    }
  }, "End Call");

  //Mute call handler
  const handleToggleMute = useCallback(async () => {
    // CRITICAL: Ensure authentication is ready before toggling mute
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      await toggleMute();
    } catch (error) {
      setCallFeedback(`Failed to toggle mute: ${error.message}`);
      setTimeout(() => setCallFeedback(null), 3000);
    }
  }, [toggleMute]);

  // Hold/Unhold call handler
  const handleToggleHold = useCallback(async () => {
    // CRITICAL: Ensure authentication is ready before toggling hold
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      if (callState.onHold) {
        await unholdCall();
        showNotification({
          message: "Call retrieved from hold",
          severity: "success",
          duration: 2000,
        });
      } else {
        await holdCall();
        showNotification({
          message: "Call placed on hold",
          severity: "info",
          duration: 2000,
        });
      }
    } catch (error) {
      setCallFeedback(
        `Failed to ${callState.onHold ? "unhold" : "hold"} call: ${error.message
        }`
      );
      setTimeout(() => setCallFeedback(null), 3000);
    }
  }, [callState.onHold, holdCall, unholdCall, showNotification]);

  //<<<<<<<< NOT IN USE >>>>>>>>\\
  // Call Control Handlers
  const handleCall = useCallback(() => {
    if (!isRegistered) {
      setCallFeedback("Cannot place call: Not registered");
      return;
    }

    if (callState.state !== "idle") {
      sipService.hangupCall();
    } else if (dialerState.phoneNumber) {
      const callOptions = {
        extraHeaders: [`X-Caller-Extension: 1001`],
        mediaConstraints: {
          audio: {
            deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        },
      };

      sipService.makeCall(dialerState.phoneNumber, callOptions);
      setDialerState((prev) => ({ ...prev, phoneNumber: "" }));
    }
  }, [callState.state, dialerState.phoneNumber, isRegistered, selectedDevice]);

  // Call Control Functions
  const handleAnswer = guardedAsync(async () => {
    try {
      await answerCall({
        mediaConstraints: {
          audio: {
            deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        },
      });
      // Clients section removed - datatool_server not used in this project
    } catch (error) {
      setCallFeedback(`Failed to answer call: ${error.message}`);
      setTimeout(() => setCallFeedback(null), 3000);
    }
  }, "Answer Call");

  // Dialer input Handlers
  const handleDialerInput = useCallback(
    (value) => {
      // CRITICAL: Ensure authentication is ready before dialer input
      const token = storageService.getAuthToken();
      if (!token) {
        showNotification({
          message: "Authentication not ready. Please try again.",
          severity: "warning",
          duration: 3000,
        });
        return;
      }

      if (/^[0-9*#]*$/.test(value)) {
        dtmfService.playTone("delete");
        if (value.length > dialerState.phoneNumber.length) {
          const lastChar = value[value.length - 1];
          dtmfService.playTone(lastChar);
        }
        setDialerState((prev) => ({ ...prev, phoneNumber: value }));
      }
    },
    [dialerState.phoneNumber, showNotification]
  );

  // Call Action Button Component
  const CallActionButton = useCallback(() => {
    const isIncomingCall =
      callState.state === "ringing" && callState.direction === "incoming";

    return (
      <IconButton
        color="inherit"
        size="small"
        onClick={
          isIncomingCall
            ? handleAnswer
            : callState.state === "idle"
              ? handleMakeCall
              : handleEndCall
        }
        disabled={
          !isRegistered ||
          !user?.username ||
          (callState.state === "idle" && !dialerState.phoneNumber)
        }
        data-testid="call-button"
        aria-label={
          isIncomingCall
            ? "Answer Call"
            : callState.state === "idle"
              ? "Make Call"
              : "End Call"
        }
        sx={{
          "&:hover": {
            backgroundColor: isIncomingCall
              ? "rgba(76, 175, 80, 0.08)"
              : undefined,
          },
        }}
      >
        {isIncomingCall ? (
          <CallIcon
            sx={{
              color: "#4caf50",
              animation: "pulse 1s infinite",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.1)" },
                "100%": { transform: "scale(1)" },
              },
              boxShadow: "0 0 0 2px #0ca",
              borderRadius: "50%",
              padding: "4px",
            }}
          />
        ) : callState.state === "idle" ? (
          <CallIcon sx={{ color: isRegistered ? "#0ca" : "#666" }} />
        ) : (
          <CallEndIcon sx={{ color: "error.main" }} />
        )}
      </IconButton>
    );
  }, [
    callState.state,
    callState.direction,
    sipStatus.registered,
    dialerState.phoneNumber,
    handleAnswer,
    handleMakeCall,
    handleEndCall,
  ]);

  const handleDialpadInput = useCallback(
    (num) => {
      // CRITICAL: Ensure authentication is ready before dialpad input
      const token = storageService.getAuthToken();
      if (!token) {
        showNotification({
          message: "Authentication not ready. Please try again.",
          severity: "warning",
          duration: 3000,
        });
        return;
      }

      dtmfService.playTone(num);
      setDialNumber((prev) => prev + num);
    },
    [showNotification]
  );

  const handleDialpadDelete = useCallback(() => {
    // CRITICAL: Ensure authentication is ready before dialpad delete
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    dtmfService.playTone("delete");
    setDialNumber((prev) => prev.slice(0, -1));
  }, [showNotification]);

  // UI Control Handlers
  const handleKeyDown = useCallback(
    (e) => {
      // CRITICAL: Ensure authentication is ready before key handling
      const token = storageService.getAuthToken();
      if (!token) {
        return; // Silently ignore if not authenticated
      }

      if (isDialpadOpen) {
        // Set active key for visual feedback
        if (/^[0-9*#]$/.test(e.key)) {
          setActiveKey(e.key);
          setTimeout(() => setActiveKey(null), 200); // Reset after 200ms
        }

        if (e.key === "Enter") {
          e.preventDefault();
          handleMakeCall();
        } else if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          handleDialpadDelete();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsDialpadOpen(false);
        }
        return;
      }

      // Handle regular phone input keyboard events
      if (e.key === "Enter" && callState.state === "idle") {
        handleMakeCall();
      } else if (e.key === "Enter" && callState.state !== "idle") {
        handleEndCall();
      }
      if (e.key === "Escape") setAnchorEl(null);
    },
    [
      handleMakeCall,
      handleEndCall,
      callState.state,
      isDialpadOpen,
      handleDialpadDelete,
    ]
  );

  const handleDialpadToggle = useCallback(
    (event) => {
      // CRITICAL: Ensure authentication is ready before dialpad toggle
      const token = storageService.getAuthToken();
      if (!token) {
        showNotification({
          message: "Authentication not ready. Please try again.",
          severity: "warning",
          duration: 3000,
        });
        return;
      }

      setAnchorEl((prev) => (prev ? null : event.currentTarget));
    },
    [showNotification]
  );

  const handleDialpadClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleReject = async () => {
    // CRITICAL: Ensure authentication is ready before rejecting call
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      await endCall();
    } catch (error) {
      setCallFeedback(`Failed to reject call: ${error.message}`);
      setTimeout(() => setCallFeedback(null), 3000);
    }
  };

  // Status Management - Load pause reasons
  const loadPauseReasons = useCallback(async () => {
    if (pauseReasonsLoading || pauseReasons.length > 0) return;

    setPauseReasonsLoading(true);
    try {
      const reasons = await pauseService.getPauseReasons();
      setPauseReasons(reasons || []);
    } catch (error) {
      console.error("Failed to load pause reasons:", error);
    } finally {
      setPauseReasonsLoading(false);
    }
  }, [pauseReasonsLoading, pauseReasons.length]);

  // Open pause dialog with reasons
  const handleOpenPauseDialog = useCallback(async () => {
    await loadPauseReasons();
    setPauseDialogOpen(true);
  }, [loadPauseReasons]);

  // Handle pause with selected reason
  const handlePauseWithReason = guardedCallback(
    async (reasonCode) => {
      try {
        const extension = user?.extension;
        if (!extension) {
          showNotification({
            message: "No extension found - please re-authenticate",
            severity: "error",
            duration: 3000,
          });
          return;
        }

        console.log(`Pausing agent ${extension} with reason: ${reasonCode}`);

        const result = await pauseService.pauseAgent(extension, reasonCode);

        // Update local state
        setPresence("BREAK");
        setCurrentPauseReason(result.pauseReason);
        setPauseStartTime(new Date());
        setPauseDialogOpen(false);
        setSelectedPauseReason(null);

        showNotification({
          message: `Agent is now on ${result.pauseReason?.label || "break"} - not available for calls`,
          severity: "warning",
          duration: 3000,
        });
      } catch (error) {
        console.error("Error pausing agent:", error);
        showNotification({
          message: `Failed to pause: ${error.message}`,
          severity: "error",
          duration: 3000,
        });
      }
    },
    [user?.extension, showNotification],
    "Pause Agent"
  );

  // Handle unpause (resume work)
  const handleUnpause = guardedCallback(
    async () => {
      try {
        const extension = user?.extension;
        if (!extension) {
          showNotification({
            message: "No extension found - please re-authenticate",
            severity: "error",
            duration: 3000,
          });
          return;
        }

        console.log(`Unpausing agent ${extension}`);

        const result = await pauseService.unpauseAgent(extension);

        // Update local state
        setPresence("READY");
        setCurrentPauseReason(null);
        setPauseStartTime(null);

        const durationFormatted = pauseService.formatPauseDuration(result.pauseDuration || 0);
        showNotification({
          message: `Agent is now ready to receive calls (was paused for ${durationFormatted})`,
          severity: "success",
          duration: 3000,
        });
      } catch (error) {
        console.error("Error unpausing agent:", error);
        showNotification({
          message: `Failed to resume: ${error.message}`,
          severity: "error",
          duration: 3000,
        });
      }
    },
    [user?.extension, showNotification],
    "Unpause Agent"
  );

  // Legacy presence change handler (for backward compatibility)
  const handlePresenceChange = guardedCallback(
    async (newState) => {
      if (newState === "BREAK") {
        // Open pause dialog to select reason
        handleOpenPauseDialog();
      } else {
        // Unpause
        handleUnpause();
      }
    },
    [handleOpenPauseDialog, handleUnpause],
    "Change Presence"
  );

  // Menu Handling
  const menuItems = [
    {
      icon: <Dashboard />,
      text: "Dashboard",
      action: () => setActiveSection("dashboard"),
      id: "dashboard",
    },
    {
      icon: <History />,
      text: "Call History",
      action: () => setActiveSection("callHistory"),
      id: "callHistory",
    },
    {
      icon: <PersonAdd />,
      text: "Agent Directory",
      action: () => setActiveSection("agentDirectory"),
      id: "agentDirectory",
    },
    {
      icon: <CallMerge />,
      text: "Transfer History",
      action: () => setActiveSection("transferHistory"),
      id: "transferHistory",
    },
    // {
    //   icon: <EmailIcon />,
    //   text: "Email",
    //   action: () => setActiveSection("email"),
    //   id: "email",
    // },
    // {
    //   icon: <FacebookIcon />,
    //   text: "Facebook",
    //   action: () => setActiveSection("facebook"),
    //   id: "facebook",
    // },
    {
      icon: <BarChart />,
      text: "Reports",
      action: () => setActiveSection("reports"),
      id: "reports",
    },
    // {
    //   icon: <Group />,
    //   text: "Contacts",
    //   action: () => setActiveSection("contacts"),
    //   id: "contacts",
    // },
    {
      icon: <SupportAgent />,
      text: "Agent Status",
      action: () => setActiveSection("agentStatus"),
      id: "agentStatus",
    },
    {
      icon: <WhatsAppIcon />,
      text: "WhatsApp",
      action: () => setActiveSection("whatsapp"),
      id: "whatsapp",
    },
    // {
    //   icon: <Campaign />,
    //   text: "Campaigns",
    //   action: () => setActiveSection("campaigns"),
    //   id: "campaigns",
    // },
    {
      icon: <InfoIcon />,
      text: "Info",
      action: () => setActiveSection("info"),
      id: "info",
    },
    {
      icon: <SystemUpdateAlt color="primary" />,
      text: "Check for Updates",
      action: () => setActiveSection("updates"),
      id: "updates",
    },
    {
      icon: isLoggingOut ? (
        <CircularProgress size={20} color="error" />
      ) : (
        <PowerSettingsNew
          fontSize="medium"
          color="error"
          sx={{
            color: "error",
          }}
        />
      ),
      text: isLoggingOut ? "Logging out..." : "Logout",
      action: handleLogout,
      disabled: isLoggingOut,
      id: "logout",
    },
  ];

  // Filter menu items based on license features
  // Items without a required feature are always shown
  // Items with a required feature are shown only if the feature is enabled
  const filteredMenuItems = useMemo(() => {
    return menuItems.map((item) => {
      const requiredFeature = MENU_FEATURE_MAP[item.id];

      // No feature requirement means always accessible
      if (!requiredFeature) {
        return { ...item, isLocked: false };
      }

      // Check if feature is enabled in license
      const hasAccess = checkMenuItem(item.id);

      return {
        ...item,
        isLocked: !hasAccess,
        lockedReason: hasAccess ? null : `${FEATURE_DISPLAY_NAMES[requiredFeature] || requiredFeature} requires a license upgrade`,
      };
    });
  }, [menuItems, checkMenuItem]);

  const handleMenuClick = useCallback(
    (action, item) => {
      // CRITICAL: Ensure authentication is ready before menu action
      const token = storageService.getAuthToken();
      if (!token) {
        showNotification({
          message: "Authentication not ready. Please try again.",
          severity: "warning",
          duration: 3000,
        });
        return;
      }

      // Check if feature is locked
      if (item?.isLocked) {
        showNotification({
          message: item.lockedReason || "This feature requires a license upgrade.",
          severity: "warning",
          duration: 4000,
        });
        return;
      }

      action();
      setMenuOpen(false);
    },
    [showNotification]
  );

  // Duration Display Component
  const CallDuration = useCallback(() => {
    if (callState.state !== CALL_STATES.ESTABLISHED) return null;

    const minutes = Math.floor(callState.duration / 60);
    const seconds = callState.duration % 60;

    return (
      // Timer
      <Typography
        variant="caption"
        sx={{
          ml: 1,
          color: "#0ca",
          fontSize: "13px",
          fontFamily: "monospace",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
          padding: "2px 4px",
          fontWeight: "medium",
          minWidth: "45px", // Prevent layout shift
        }}
      >
        {`${minutes}:${seconds.toString().padStart(2, "0")}`}
      </Typography>
    );
  }, [callState.duration, callState.state]);

  // Consultation Duration Display Component
  const ConsultationDuration = useCallback(() => {
    if (!isAttendedTransfer || !consultationCall) return null;

    // Calculate consultation duration from when it was created
    const consultationStartTime = consultationCall.startTime || Date.now();
    const duration = Math.floor((Date.now() - consultationStartTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return (
      <Typography
        variant="caption"
        sx={{
          ml: 1,
          color: "#4caf50",
          fontSize: "13px",
          fontFamily: "monospace",
          backgroundColor: "rgba(76, 175, 80, 0.2)",
          borderRadius: "4px",
          padding: "2px 4px",
          fontWeight: "medium",
          minWidth: "45px",
        }}
      >
        {`${minutes}:${seconds.toString().padStart(2, "0")}`}
      </Typography>
    );
  }, [isAttendedTransfer, consultationCall]);

  // Handler to close any active section
  const handleCloseSection = useCallback(() => {
    // CRITICAL: Ensure authentication is ready before closing section
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    setActiveSection(null);
    setMenuOpen(false);
  }, []);

  // Handler to close agent directory
  const handleCloseAgentDirectory = useCallback(() => {
    // CRITICAL: Ensure authentication is ready before closing agent directory
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    setActiveSection(null);
  }, []);

  // Handler to close transfer history
  const handleCloseTransferHistory = useCallback(() => {
    // CRITICAL: Ensure authentication is ready before closing transfer history
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    setActiveSection(null);
  }, []);

  // Handler for transfer from agent directory
  const handleTransferFromDirectory = useCallback(
    (extension) => {
      // CRITICAL: Ensure authentication is ready before transfer from directory
      const token = storageService.getAuthToken();
      if (!token) {
        showNotification({
          message: "Authentication not ready. Please try again.",
          severity: "warning",
          duration: 3000,
        });
        return;
      }

      setTransferTarget(extension);
      setActiveSection(null);
      setTransferDialogOpen(true);
    },
    [showNotification]
  );

  const handleWhatsAppChat = (contact) => {
    // CRITICAL: Ensure authentication is ready before WhatsApp chat
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    setActiveSection("whatsapp");
    setWhatsAppInitialChat(contact);
  };

  // Add this effect to propagate the collapse state
  useEffect(() => {
    // CRITICAL: Ensure authentication is ready before collapse state change
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    // Notify parent component about collapse state change
    if (onToggleCollapse) {
      onToggleCollapse(isCollapsed);
    }
  }, [isCollapsed, onToggleCollapse]);

  // Update the switch handler to only use onToggleCollapse
  const handleSwitchChange = (e) => {
    // CRITICAL: Ensure authentication is ready before switch change
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    // console.log("Appbar: Switch toggled to:", e.target.checked);
    // onToggleCollapse(e.target.checked); // Only call the prop function
  };

  // Add a handler for closing the dialpad
  const handleCloseDialpad = useCallback(() => {
    // CRITICAL: Ensure authentication is ready before closing dialpad
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    setIsDialpadOpen(false);
    setDialNumber(""); // Clear the dialpad input
    setActiveKey(null); // Reset any active key highlighting
  }, []);

  // Add this useEffect after your other useEffects
  useEffect(() => {
    const handleCallFailed = (error) => {
      // Auth check handled by parent components/effects
      console.error("Call failed with error:", error);

      // Handle specific error codes
      let message = error.error;
      if (error.statusCode === 603) {
        message =
          "Call was declined by the extension. This usually means the extension is busy, unavailable, or has rejected the call.";
      } else if (error.statusCode === 488) {
        message =
          "Call failed: Codec negotiation error. The extension may not be configured properly or may be using incompatible codecs.";
      } else if (error.statusCode === 486) {
        message = "The extension is busy. Please try again later.";
      } else if (error.statusCode === 480) {
        message = "The extension is temporarily unavailable.";
      } else if (error.statusCode === 404) {
        message = "Extension not found. Please check the number.";
      }

      showNotification({
        message: message,
        severity: "error",
        duration: 8000,
      });
      handleCloseDialpad();
    };

    sipService.events.on("call:failed", handleCallFailed);

    // Handle media failure events
    const handleMediaFailure = (data) => {
      console.error("Media failure detected:", data);
      showNotification({
        message:
          "Call failed: Media negotiation error. Please check your network settings.",
        severity: "error",
        duration: 8000,
      });
    };

    const handleIceFailure = (data) => {
      console.error("ICE failure detected:", data);
      showNotification({
        message:
          "Call failed: Network connectivity issue. Please check firewall/NAT settings.",
        severity: "error",
        duration: 8000,
      });
    };

    sipService.events.on("call:mediaFailure", handleMediaFailure);
    sipService.events.on("call:iceFailure", handleIceFailure);

    return () => {
      sipService.events.off("call:failed", handleCallFailed);
      sipService.events.off("call:mediaFailure", handleMediaFailure);
      sipService.events.off("call:iceFailure", handleIceFailure);
    };
  }, [showNotification]);

  // Add this effect to handle external phone number updates from DashboardView
  useEffect(() => {
    const handleExternalPhoneUpdate = (event) => {
      if (event.detail && event.detail.value) {
        console.log("📞 External phone update received:", event.detail.value);
        // Update the dialer state when DashboardView sets a phone number
        setDialerState((prev) => ({
          ...prev,
          phoneNumber: event.detail.value,
        }));
        setDialNumber(event.detail.value);
      }
    };

    // Listen for custom events from DashboardView
    document.addEventListener("react:input", handleExternalPhoneUpdate);

    return () => {
      document.removeEventListener("react:input", handleExternalPhoneUpdate);
    };
  }, []);

  useEffect(() => {
    const handleConnectionStateChange = async (isConnected) => {
      // Prevent connection state changes during logout
      if (isLoggingOut || !canInitServices()) {
        console.log(
          "Ignoring connection state change during logout:",
          isConnected
        );
        return;
      }

      // Auth check handled by parent useEffect

      if (!isConnected) {
        console.log("Connection state changed to disconnected");
        // Don't automatically trigger reconnection here
        // Let the registration state handler manage reconnection
        showNotification({
          message: "Phone system disconnected. Checking registration status...",
          severity: "warning",
          duration: 3000,
        });
      } else {
        console.log("Connection state changed to connected");
        showNotification({
          message: "Phone system connection restored",
          severity: "success",
          duration: 3000,
        });
      }
    };

    sipService.events.on(
      "connection_state_changed",
      handleConnectionStateChange
    );
    return () => {
      sipService.events.off(
        "connection_state_changed",
        handleConnectionStateChange
      );
    };
  }, [showNotification, handleReconnection, isLoggingOut, canInitServices]);

  // Add this useEffect to handle registration state changes
  useEffect(() => {
    if (!sipService || !agentService) return;

    const handleRegistrationState = (newState) => {
      if (isLoggingOut || !canInitServices()) {
        console.log(
          "Ignoring registration state update during logout:",
          newState
        );
        return;
      }

      if (registrationDebounceRef.current) {
        clearTimeout(registrationDebounceRef.current);
      }

      registrationDebounceRef.current = setTimeout(() => {
        console.log("🔄 Registration state update:", newState);

        setRegistrationState(newState);

        if (newState === "Registered") {
          const extension = sipService.state?.lastConfig?.extension;
          if (extension) {
            agentService.registerExtension(extension);
            // Use ref to prevent useEffect re-runs on UI-only changes (like dock toggle)
            fetchRegisteredAgentDetailsRef.current?.(extension);
          }
        } else {
          setRegisteredAgent(null);
        }

        if (newState === "Unregistered" || newState === "Registration Failed") {
          // Rely on SIP internal reconnection only; do not trigger custom loops here
          setRegisteredAgent(null);
          showNotification({
            message: "Registration lost. Waiting for automatic recovery...",
            severity: "warning",
            duration: 3000,
          });
          return;
        }
      }, 300);
    };

    const handleAmiStatus = (status) => {
      if (isLoggingOut || !canInitServices()) {
        console.log("Ignoring AMI status update during logout:", status);
        return;
      }

      if (!status) return;
      // keep as info only; no local status updates needed
    };

    // Subscribe to events
    sipService.events.on("registration:state", handleRegistrationState);
    agentService.on("status:update", handleAmiStatus);

    // Initial status check (only once) — register extension, no AMI verify
    const extension = sipService.state?.lastConfig?.extension;
    if (
      extension &&
      !isLoggingOut &&
      canInitServices() &&
      !initialExtensionCheckDone.current
    ) {
      // Auth check handled by parent useEffect

      console.log("Initial extension check:", extension);
      agentService.registerExtension(extension);

      // Mark as done to prevent multiple executions
      initialExtensionCheckDone.current = true;
    }

    return () => {
      sipService.events.off("registration:state", handleRegistrationState);
      agentService.off("status:update", handleAmiStatus);

      if (registrationDebounceRef.current) {
        clearTimeout(registrationDebounceRef.current);
      }
    };
  }, [
    sipService,
    agentService,
    showNotification,
    reconnectionAttempts,
    maxReconnectionAttempts,
    isLoggingOut,
    canInitServices,
    // fetchRegisteredAgentDetails removed - using ref to prevent re-runs on UI-only changes (dock toggle)
  ]);

  // Listen for pause/unpause events to sync Appbar presence state
  useEffect(() => {
    if (!agentService || isLoggingOut) return;

    // Ensure websocket is connected so we can receive agent:paused / agent:unpaused
    (async () => {
      try {
        await agentService.connect();
      } catch (_) { }
    })();

    const getCurrentExtension = () => sipService?.state?.lastConfig?.extension;

    const syncPauseFromServer = async () => {
      try {
        const ext = getCurrentExtension();
        if (!ext) return;
        const result = await agentService.getPauseStatus(ext);
        const isPaused = !!result?.data?.isPaused;

        if (isPaused) {
          setPresence("BREAK");
          setCurrentPauseReason(result?.data?.pauseReason || null);
          setPauseStartTime(
            result?.data?.pauseStartTime ? new Date(result.data.pauseStartTime) : null
          );
        } else {
          setPresence("READY");
          setCurrentPauseReason(null);
          setPauseStartTime(null);
        }
      } catch (_) { }
    };

    // Handle agent paused event (including auto-pause from server)
    const handleAgentPaused = (data) => {
      // Only update if this is for the current agent
      const currentExtension = getCurrentExtension();
      if (data.extension && currentExtension && String(data.extension) === String(currentExtension)) {
        // console.log("[Appbar] Received agent:paused event for self:", data);
        setPresence("BREAK");
        setCurrentPauseReason(data.pauseReason || null);
        setPauseStartTime(data.startTime ? new Date(data.startTime) : new Date());
      }
    };

    // Handle agent unpaused event (including auto-unpause from server)
    const handleAgentUnpaused = (data) => {
      // Only update if this is for the current agent
      const currentExtension = getCurrentExtension();
      if (data.extension && currentExtension && String(data.extension) === String(currentExtension)) {
        // console.log("[Appbar] Received agent:unpaused event for self:", data);
        setPresence("READY");
        setCurrentPauseReason(null);
        setPauseStartTime(null);

        // Show notification for auto-unpause
        if (data.autoUnpaused) {
          showNotification({
            message: "Pause duration expired - you are now available for calls",
            severity: "info",
            duration: 5000,
          });
        }
      }
    };

    agentService.on("agent:paused", handleAgentPaused);
    agentService.on("agent:unpaused", handleAgentUnpaused);

    // Fetch current pause status on load
    syncPauseFromServer();

    const onWsConnect = () => syncPauseFromServer();
    const onWsReconnect = () => syncPauseFromServer();

    agentService.on("ws:connect", onWsConnect);
    agentService.on("ws:reconnect", onWsReconnect);

    return () => {
      agentService.off("agent:paused", handleAgentPaused);
      agentService.off("agent:unpaused", handleAgentUnpaused);

      agentService.off("ws:connect", onWsConnect);
      agentService.off("ws:reconnect", onWsReconnect);
    };
  }, [agentService, sipService, isLoggingOut, showNotification]);

  useEffect(() => {
    if (isLoggingOut) return;
    if (presence !== "BREAK") return;
    if (!pauseStartTime || !currentPauseReason?.maxDurationMinutes) return;

    const startMs = new Date(pauseStartTime).getTime();
    const maxMs = Number(currentPauseReason.maxDurationMinutes) * 60 * 1000;
    if (!Number.isFinite(maxMs) || maxMs <= 0) return;

    const remainingMs = startMs + maxMs - Date.now();
    if (remainingMs <= 0) return;

    const timeout = setTimeout(async () => {
      try {
        const ext = sipService?.state?.lastConfig?.extension;
        if (!ext) return;
        const result = await agentService.getPauseStatus(ext);
        const isPaused = !!result?.data?.isPaused;
        if (!isPaused) {
          setPresence("READY");
          setCurrentPauseReason(null);
          setPauseStartTime(null);
        }
      } catch (_) { }
    }, remainingMs + 2000);

    return () => clearTimeout(timeout);
  }, [presence, pauseStartTime, currentPauseReason, sipService, agentService, isLoggingOut]);

  useEffect(() => {
    const handleCallEvent = (event) => {
      // Prevent call event processing during logout
      if (isLoggingOut || !canInitServices()) {
        console.log("Ignoring call event during logout:", event);
        return;
      }

      // Auth check handled by parent useEffect

      // Forward call events using the monitoring service
      callMonitoringService.handleSipCallEvent(event);
    };

    sipService.events.on("call:event", handleCallEvent);

    return () => {
      sipService.events.off("call:event", handleCallEvent);
    };
  }, [isLoggingOut, canInitServices]);

  // Add this function to handle setting the phone number
  const handleSetDialNumber = useCallback((number) => {
    // CRITICAL: Ensure authentication is ready before setting dial number
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    setDialerState((prev) => ({ ...prev, phoneNumber: number }));
  }, []);

  // Add this effect to fetch available agents (backend WS first, minimal polling fallback)
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      console.log("Logout in progress, skipping available agents setup");
      return;
    }

    if (!transferDialogOpen || isLoggingOut || !canInitServices()) return;

    let interval = null;
    const userData = storageService.getUserData();
    const currentExtension = String(userData?.user?.extension || "");

    const normalizeStatus = (raw) => {
      const s = (raw || "").toString().toLowerCase();
      if (s.includes("oncall") || s.includes("on_call") || s.includes("busy"))
        return "On Call";
      if (
        s.includes("available") ||
        s.includes("ready") ||
        s.includes("registered")
      )
        return "Registered";
      if (s.includes("paused") || s.includes("break")) return "Paused";
      return "Offline";
    };

    const upsert = (list, agent) => {
      const idx = list.findIndex(
        (a) => String(a.extension) === String(agent.extension)
      );
      if (idx >= 0) list[idx] = { ...list[idx], ...agent };
      else list.push(agent);
      return list;
    };

    const seedFromAPI = async () => {
      setAvailableAgentsLoading(true);
      try {
        const token = storageService.getAuthToken();
        if (!token) return false;
        const resp = await fetch(`${serverConfig.apiUrl}/api/ami/extensions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await resp.json();
        if (result?.success && Array.isArray(result.data)) {
          const formatted = result.data.map((ext) => ({
            extension: String(ext.extension),
            name: `Agent ${ext.extension}`,
            status: normalizeStatus(ext.status || ext.amiStatus),
            activeCallCount: 0,
          }));
          setAvailableAgents(
            formatted.filter((a) => a.extension !== currentExtension)
          );
          return true;
        }
      } catch (_) {
      } finally {
        setAvailableAgentsLoading(false);
      }
      return false;
    };

    const seedFromLocal = () => {
      const stats = callMonitoringService.getStats();
      let list = stats?.activeAgentsList || window.dashboardAgentsList || [];
      const onlineAgents = list
        .map((a) => ({
          extension: String(a.extension || ""),
          name: a.name || `Agent ${a.extension}`,
          status: normalizeStatus(a.status),
          activeCallCount: a.activeCallCount || 0,
        }))
        .filter((a) => a.extension && a.extension !== currentExtension);
      setAvailableAgents(onlineAgents);
    };

    // Connect WS (non-fatal if already connected)
    (async () => {
      try {
        await agentService.connect();
      } catch (_) { }
      // Seed list quickly from local snapshot, then refresh via API
      seedFromLocal();
      await seedFromAPI();
    })();

    const onExt = (payload) => {
      const ext = String(payload?.extension || "");
      if (!ext || ext === currentExtension) return;
      const status = normalizeStatus(
        payload?.status || payload?.deviceState || payload?.presence
      );
      setAvailableAgents((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        return upsert(next, {
          extension: ext,
          name: payload?.name || `Agent ${ext}`,
          status,
        });
      });
    };

    agentService.on("extension:status", onExt);
    agentService.on("statusChange", onExt);

    // Minimal polling fallback (10s) in case WS snapshot misses someone
    interval = setInterval(() => {
      seedFromAPI();
    }, 10000);

    return () => {
      try {
        agentService.off("extension:status", onExt);
      } catch (_) { }
      try {
        agentService.off("statusChange", onExt);
      } catch (_) { }
      if (interval) clearInterval(interval);
    };
  }, [transferDialogOpen, isLoggingOut, canInitServices]);

  // Filter agents based on search and status
  const filteredAvailableAgents = useMemo(() => {
    return availableAgents.filter((agent) => {
      // Apply status filter
      if (transferFilter === "available" && agent.status !== "Registered")
        return false;
      if (transferFilter === "onCall" && agent.status !== "On Call")
        return false;

      // Apply search filter
      if (transferSearchQuery) {
        const query = transferSearchQuery.toLowerCase();
        return (
          agent.name?.toLowerCase().includes(query) ||
          agent.extension?.includes(query)
        );
      }

      return true;
    });
  }, [availableAgents, transferFilter, transferSearchQuery]);

  // Add transfer dialog handlers
  const handleOpenTransferDialog = () => {
    // Check if system is in a valid state for transfers
    if (!isRegistered || !user?.username) {
      showNotification({
        message:
          "Phone system not ready. Please wait for reconnection or log in again.",
        severity: "warning",
        duration: 4000,
      });
      return;
    }

    // CRITICAL: Ensure authentication is ready before opening transfer dialog
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    if (callState.state !== CALL_STATES.ESTABLISHED) {
      showNotification({
        message: "You must be in an active call to transfer",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    setTransferDialogOpen(true);
  };

  const handleCloseTransferDialog = () => {
    setTransferDialogOpen(false);
    setTransferTarget("");
    setIsTransferring(false);
    setIsAttendedTransfer(false);
    setConsultationCall(null);
    setTransferType("blind");
  };

  const handleTransferCall = async () => {
    if (!transferTarget) {
      showNotification({
        message: "Please select an agent to transfer to",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    // CRITICAL: Ensure authentication is ready before transfer
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      setIsTransferring(true);

      // Check transfer state before proceeding
      const transferState = sipCallService.getTransferState();
      console.log("Transfer state check:", transferState);

      if (!transferState.canTransfer) {
        throw new Error(
          "Call is not in a state that allows transfers. Please ensure the call is connected."
        );
      }

      // Log current session info for debugging
      console.log("Current call state for transfer:", {
        callState,
        transferTarget,
        transferType,
        sessionInfo: transferState.currentSession,
      });

      // Record transfer attempt
      transferHistoryService.addTransfer({
        targetExtension: transferTarget,
        transferType,
        status: "initiated",
        callId: callState.uniqueId || "unknown",
      });

      if (transferType === "blind") {
        // For blind transfer, just transfer directly
        console.log("Initiating blind transfer to:", transferTarget);
        await sipCallService.transferCall(transferTarget, "blind");
      } else {
        // For attended transfer, first put the call on hold, then start consultation
        if (!callState.onHold) {
          await holdCall();
          showNotification({
            message: "Call placed on hold for consultation",
            severity: "info",
            duration: 2000,
          });
        }

        setIsAttendedTransfer(true);
        console.log("Initiating attended transfer to:", transferTarget);
        const consultation = await sipCallService.attendedTransfer(
          transferTarget
        );
        setConsultationCall(consultation);

        showNotification({
          message: `Consultation call established with ${transferTarget}. Speak with them, then click "Complete Transfer" when ready.`,
          severity: "info",
          duration: 10000,
        });

        // Don't close dialog yet - wait for completion
        return;
      }

      // Create event handlers with proper cleanup (no hooks inside handler)
      const transferSuccessHandler = () => {
        // Record successful transfer
        transferHistoryService.addTransfer({
          targetExtension: transferTarget,
          status: "completed",
          callId: callState.uniqueId || "unknown",
        });

        showNotification({
          message: `Call transferred to extension ${transferTarget}`,
          severity: "success",
          duration: 3000,
        });

        // Clean up event handlers and timeout
        cleanupTransferHandlers();
        handleCloseTransferDialog();
      };

      const transferFailedHandler = (data) => {
        // Record failed transfer
        transferHistoryService.addTransfer({
          targetExtension: transferTarget,
          status: "failed",
          callId: callState.uniqueId || "unknown",
          error: data.error,
          statusCode: data.statusCode,
          reasonPhrase: data.reasonPhrase,
        });

        showNotification({
          message: `Transfer failed: ${data.error}`,
          severity: "error",
          duration: 5000,
        });

        // Clean up event handlers and timeout
        cleanupTransferHandlers();
        setIsTransferring(false);
      };

      const transferProgressHandler = (data) => {
        showNotification({
          message: `Transfer in progress to ${transferTarget}...`,
          severity: "info",
          duration: 2000,
        });
      };

      // Store handlers in ref for cleanup
      transferEventHandlersRef.current = {
        success: transferSuccessHandler,
        failed: transferFailedHandler,
        progress: transferProgressHandler,
      };

      // Register event handlers
      sipService.events.on("call:transfer_accepted", transferSuccessHandler);
      sipService.events.on("call:transfer_failed", transferFailedHandler);
      sipService.events.on("call:transfer_progress", transferProgressHandler);

      // Set a timeout to clean up if we don't get a response
      transferTimeoutRef.current = setTimeout(() => {
        try {
          // Clean up event handlers
          cleanupTransferHandlers();

          // If still transferring, assume it worked but we didn't get confirmation
          if (isTransferring) {
            // Record transfer as completed (assumed)
            transferHistoryService.addTransfer({
              targetExtension: transferTarget,
              status: "completed",
              callId: callState.uniqueId || "unknown",
              note: "Assumed completion (no confirmation received)",
            });

            showNotification({
              message: `Call transfer initiated to ${transferTarget}`,
              severity: "info",
              duration: 3000,
            });
            handleCloseTransferDialog();
          }
        } catch (error) {
          console.error("Error in transfer timeout handler:", error);
          // Ensure we clean up even if there's an error
          cleanupTransferHandlers();
          setIsTransferring(false);
        }
      }, 5000);
    } catch (error) {
      console.error("Error transferring call:", error);

      // Record failed transfer
      transferHistoryService.addTransfer({
        targetExtension: transferTarget,
        status: "failed",
        callId: callState.uniqueId || "unknown",
        error: error.message,
      });

      showNotification({
        message: `Transfer failed: ${error.message}`,
        severity: "error",
        duration: 5000,
      });
      setIsTransferring(false);
    }
  };

  // Helper function to clean up transfer handlers and timeout
  const cleanupTransferHandlers = useCallback(() => {
    // Clear timeout
    if (transferTimeoutRef.current) {
      clearTimeout(transferTimeoutRef.current);
      transferTimeoutRef.current = null;
    }

    // Remove event handlers
    if (transferEventHandlersRef.current.success) {
      sipService.events.off(
        "call:transfer_accepted",
        transferEventHandlersRef.current.success
      );
    }
    if (transferEventHandlersRef.current.failed) {
      sipService.events.off(
        "call:transfer_failed",
        transferEventHandlersRef.current.failed
      );
    }
    if (transferEventHandlersRef.current.progress) {
      sipService.events.off(
        "call:transfer_progress",
        transferEventHandlersRef.current.progress
      );
    }

    // Clear handlers ref
    transferEventHandlersRef.current = {
      success: null,
      failed: null,
      progress: null,
    };
  }, []);

  // Handle completing attended transfer
  const handleCompleteAttendedTransfer = async () => {
    // CRITICAL: Ensure authentication is ready before completing transfer
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      await sipCallService.completeAttendedTransfer();

      // Record successful transfer
      transferHistoryService.addTransfer({
        targetExtension: transferTarget,
        transferType: "attended",
        status: "completed",
        callId: callState.uniqueId || "unknown",
      });

      showNotification({
        message: `Attended transfer completed to ${transferTarget}`,
        severity: "success",
        duration: 3000,
      });

      // Reset states
      setIsAttendedTransfer(false);
      setConsultationCall(null);
      handleCloseTransferDialog();
    } catch (error) {
      console.error("Error completing attended transfer:", error);
      showNotification({
        message: `Failed to complete transfer: ${error.message}`,
        severity: "error",
        duration: 5000,
      });
    }
  };

  // Handle canceling attended transfer
  const handleCancelAttendedTransfer = async () => {
    // CRITICAL: Ensure authentication is ready before canceling transfer
    const token = storageService.getAuthToken();
    if (!token) {
      showNotification({
        message: "Authentication not ready. Please try again.",
        severity: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      await sipCallService.cancelAttendedTransfer();

      // Record cancelled transfer
      transferHistoryService.addTransfer({
        targetExtension: transferTarget,
        transferType: "attended",
        status: "cancelled",
        callId: callState.uniqueId || "unknown",
      });

      showNotification({
        message: "Attended transfer cancelled - returning to original call",
        severity: "info",
        duration: 3000,
      });

      // Reset states
      setIsAttendedTransfer(false);
      setConsultationCall(null);
      handleCloseTransferDialog();
    } catch (error) {
      console.error("Error canceling attended transfer:", error);
      showNotification({
        message: `Failed to cancel transfer: ${error.message}`,
        severity: "error",
        duration: 5000,
      });
    }
  };

  // Cleanup reconnection timeout on unmount
  useEffect(() => {
    return () => {
      // CRITICAL: Ensure authentication is ready before cleanup
      const token = storageService.getAuthToken();
      if (!token) {
        return; // Silently ignore if not authenticated
      }

      if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
      }
      // Clean up transfer handlers and timeout
      cleanupTransferHandlers();
    };
  }, [reconnectionTimeout, cleanupTransferHandlers]);

  // Handle manual reconnection trigger
  useEffect(() => {
    // Don't trigger reconnection if we're logging out
    if (isLoggingOut || !canInitServices()) {
      return;
    }

    // CRITICAL: Ensure authentication is ready before manual reconnection trigger
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    if (
      reconnectionAttempts === 0 &&
      !sipStatus.registered &&
      !sipService.state?.isInitializing
    ) {
      // Manual reconnection triggered
      // This will be handled by the registration state handler
    }
  }, [
    reconnectionAttempts,
    sipStatus.registered,
    isLoggingOut,
    canInitServices,
  ]);

  // INTEGRATED: Connection Manager handles all reconnection logic
  // The system now relies entirely on:
  // 1. WebSocket events from backend (real-time)
  // 2. AMI events (real-time)
  // 3. SIP events (real-time)
  // 4. Centralized connection management with production-grade reconnection

  // Connection Manager Integration
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      console.log("Logout in progress, skipping connection manager setup");
      return;
    }

    // Wait for connection manager to be available and ready
    if (!connectionManager) {
      // Connection Manager not available yet
      return;
    }

    // CRITICAL: Prevent duplicate event listener registration
    if (connectionManager._eventListenersRegistered) {
      console.log(
        "🔐 Connection Manager: Event listeners already registered, skipping setup"
      );
      return;
    }

    // Wait for connection manager to be ready with retry
    // CRITICAL: Track retry attempts to prevent infinite loops
    let authRetryCount = 0;
    const MAX_AUTH_RETRIES = 10; // Max 10 seconds of waiting for auth

    const waitForReady = () => {
      if (connectionManager.isReady()) {
        initializeConnectionManager();
      } else {
        // Connection Manager not ready yet, retrying...
        setTimeout(waitForReady, 1000);
      }
    };

    const initializeConnectionManager = () => {
      // Initializing Connection Manager...
      // Auth check is handled by parent useEffect

      // CRITICAL: Add delay to ensure authentication is fully propagated
      // This prevents WebSocket connections from being established before tokens are ready
      setTimeout(() => {
        // CRITICAL: Stop retrying if auth redirect is already in progress
        if (window._authRedirectInProgress || window.isLoggingOut) {
          // console.log("🔐 Connection Manager: Auth redirect in progress, stopping retries");
          return;
        }

        const token = storageService.getAuthToken();
        if (!token) {
          authRetryCount++;

          // CRITICAL: Check if we've exceeded max retries - redirect to login
          if (authRetryCount >= MAX_AUTH_RETRIES) {
            // Prevent multiple redirects
            if (window._authRedirectInProgress) {
              return;
            }
            window._authRedirectInProgress = true;

            console.error(
              "❌ Connection Manager: Auth token not available after max retries. Session expired - redirecting to login."
            );
            // Set global flags to stop all services
            window.isLoggingOut = true;
            window.apiCallsBlocked = true;

            // Clear any stale state and redirect to login
            storageService.clear();
            showNotification({
              message: "Session expired. Please log in again.",
              severity: "warning",
              duration: 3000,
            });
            setTimeout(() => {
              window._authRedirectInProgress = false;
              window.isLoggingOut = false;
              window.apiCallsBlocked = false;
              navigate("/", { replace: true });
            }, 500);
            return;
          }

          // console.warn(`🔐 Connection Manager: No auth token, retry ${authRetryCount}/${MAX_AUTH_RETRIES}`);
          // Retry after another delay
          setTimeout(initializeConnectionManager, 1000);
          return;
        }

        // Reset retry count on success
        authRetryCount = 0;

        // console.log("🔐 Connection Manager: Auth token confirmed, setting up services");

        // Set up bidirectional references to avoid circular dependencies
        callMonitoringService.setConnectionManager(connectionManager);
        connectionManager.setCallMonitoringService(callMonitoringService);
      }, 1000); // 1 second delay to ensure auth propagation

      // Initialize connection health
      try {
        if (
          connectionManager &&
          typeof connectionManager.getConnectionStatus === "function"
        ) {
          const status = connectionManager.getConnectionStatus();
          setConnectionHealth(status.overallHealth);
        } else {
          // Fallback: Set default connection health
          setConnectionHealth(100); // Assume good connection initially
        }
      } catch (error) {
        console.warn("🔌 Could not get initial connection status:", error);
        setConnectionHealth(100); // Set to 100% as fallback
      }

      // Listen for connection manager events
      const handleConnectionStateChanged = ({ type, connected, health }) => {
        // Connection state changed

        // Update connection health
        try {
          if (
            connectionManager &&
            typeof connectionManager.getConnectionStatus === "function"
          ) {
            const status = connectionManager.getConnectionStatus();
            setConnectionHealth(status.overallHealth);
          } else {
            // Fallback: Keep current health or set to default
            setConnectionHealth((prev) => prev || 100);
          }
        } catch (error) {
          console.warn("🔌 Could not get connection status:", error);
          // Keep current health or set to default
          setConnectionHealth((prev) => prev || 100);
        }

        if (type === "websocket" && !connected) {
          // Do not alter registration snapshot on WS hiccups; rely on contactUri refresh
        }
      };

      const handleConnectionReconnected = () => {
        // Connection restored via Connection Manager

        // CRITICAL: Ensure authentication is ready before reconnection verification
        const token = storageService.getAuthToken();
        if (!token) {
          console.warn(
            "⚠️ Authentication not ready, delaying reconnection verification"
          );
          return;
        }

        // Refresh agent details after reconnection
        if (user?.extension) {
          fetchRegisteredAgentDetailsRef.current?.(user.extension);
        }

        showNotification({
          message: "Connection restored",
          severity: "success",
          duration: 3000,
        });
      };

      const handleMaxAttemptsReached = () => {
        console.error("❌ Max reconnection attempts reached");
        showNotification({
          message: "Connection lost - please refresh the page",
          severity: "error",
          duration: null,
        });
      };

      const handleAllHealthy = () => {
        // All connections healthy
      };

      const handlePartiallyHealthy = ({ healthy, total }) => {
        // Partially healthy connections
      };

      // CRITICAL: Store handler references for proper cleanup
      connectionManager._eventHandlers = {
        stateChanged: handleConnectionStateChanged,
        reconnected: handleConnectionReconnected,
        maxAttemptsReached: handleMaxAttemptsReached,
        allHealthy: handleAllHealthy,
        partiallyHealthy: handlePartiallyHealthy,
      };

      // Bind event listeners
      connectionManager.on(
        "connection:stateChanged",
        handleConnectionStateChanged
      );
      connectionManager.on(
        "connection:reconnected",
        handleConnectionReconnected
      );
      connectionManager.on(
        "connection:maxAttemptsReached",
        handleMaxAttemptsReached
      );
      connectionManager.on("connection:allHealthy", handleAllHealthy);
      connectionManager.on(
        "connection:partiallyHealthy",
        handlePartiallyHealthy
      );

      // Cleanup on unmount
      return () => {
        if (connectionManager) {
          connectionManager.off(
            "connection:stateChanged",
            handleConnectionStateChanged
          );
          connectionManager.off(
            "connection:reconnected",
            handleConnectionReconnected
          );
          connectionManager.off(
            "connection:maxAttemptsReached",
            handleMaxAttemptsReached
          );
          connectionManager.off("connection:allHealthy", handleAllHealthy);
          connectionManager.off(
            "connection:partiallyHealthy",
            handlePartiallyHealthy
          );
        }
      };
    };

    // Start waiting for ready state
    waitForReady();

    // Initialize connection manager with call monitoring service
    // CRITICAL: Ensure authentication is ready before setting up call monitoring
    const token = storageService.getAuthToken();
    if (token) {
      // CRITICAL: Prevent duplicate setup
      if (!connectionManager._callMonitoringServiceSet) {
        console.log("🔐 Setting up call monitoring service with auth token");
        callMonitoringService.setConnectionManager(connectionManager);
        connectionManager._callMonitoringServiceSet = true;
      } else {
        console.log("🔐 Call monitoring service already set up, skipping");
      }
    } else {
      console.warn(
        "🔐 No auth token available for call monitoring service setup"
      );
    }

    // Connection health is initialized inside initializeConnectionManager to prevent duplicates

    // CRITICAL: Prevent duplicate event listener registration
    if (connectionManager._eventListenersRegistered) {
      console.log(
        "🔐 Connection Manager: Event listeners already registered, skipping duplicate registration"
      );
      return;
    }

    // Mark that event listeners are registered to prevent duplicates
    connectionManager._eventListenersRegistered = true;
    console.log(
      "✅ Connection Manager event listeners registered successfully"
    );

    // Cleanup on unmount
    return () => {
      if (connectionManager && connectionManager._eventListenersRegistered) {
        console.log("🔌 Cleaning up Connection Manager event listeners");

        // Remove specific event listeners using the off method with stored handlers
        try {
          if (connectionManager._eventHandlers) {
            connectionManager.off(
              "connection:stateChanged",
              connectionManager._eventHandlers.stateChanged
            );
            connectionManager.off(
              "connection:reconnected",
              connectionManager._eventHandlers.reconnected
            );
            connectionManager.off(
              "connection:maxAttemptsReached",
              connectionManager._eventHandlers.maxAttemptsReached
            );
            connectionManager.off(
              "connection:allHealthy",
              connectionManager._eventHandlers.allHealthy
            );
            connectionManager.off(
              "connection:partiallyHealthy",
              connectionManager._eventHandlers.partiallyHealthy
            );

            // Clear the stored handlers
            delete connectionManager._eventHandlers;
          }
        } catch (error) {
          console.warn("🔌 Could not remove specific event listeners:", error);
        }

        // Reset the flag
        connectionManager._eventListenersRegistered = false;

        console.log("✅ Connection Manager event listeners cleaned up");
      }
    };
  }, [user?.extension]);

  // Cleanup connection manager on unmount
  useEffect(() => {
    return () => {
      // Don't destroy the connection manager as it's a singleton
      // Just log that the component is unmounting
      // Appbar component unmounting - connection manager remains active
    };
  }, []);

  // Periodic connection health update
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      console.log("Logout in progress, skipping connection health update");
      return;
    }

    if (!connectionManager) {
      return;
    }

    const healthUpdateInterval = setInterval(() => {
      try {
        // CRITICAL: Ensure authentication is ready before updating connection health
        const token = storageService.getAuthToken();
        if (!token) {
          return; // Silently ignore if not authenticated
        }

        if (
          connectionManager &&
          typeof connectionManager.getConnectionStatus === "function"
        ) {
          const status = connectionManager.getConnectionStatus();
          setConnectionHealth(status.overallHealth);
        } else {
          // Fallback: Keep current health or set to default
          setConnectionHealth((prev) => prev || 100);
        }
      } catch (error) {
        console.warn("🔌 Could not update connection health:", error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(healthUpdateInterval);
  }, []);

  // SMART SESSION HEALING: Attempt to recover stuck sessions without full logout
  const attemptSessionHealing = async () => {
    if (window.isLoggingOut || window.apiCallsBlocked) {
      console.log("🔒 Session healing blocked - logout in progress");
      return;
    }

    // Never heal while a call is active
    if (callState.state && callState.state !== CALL_STATES.IDLE) {
      console.log("🔒 Session healing deferred - call in progress");
      return;
    }

    const token = storageService.getAuthToken();
    if (!token) {
      console.log("🔐 No auth token available for session healing");
      return;
    }

    try {
      console.log("🏥 Starting targeted session healing...");

      // Show user notification about healing attempt
      showNotification({
        message: "Detected connection issue - attempting to heal session...",
        severity: "info",
        duration: 3000,
      });

      // Step 0: Fast status refresh via connection manager (bounded time)
      try {
        if (
          connectionManager &&
          typeof connectionManager.refreshStatus === "function"
        ) {
          await Promise.race([
            connectionManager.refreshStatus(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("refresh timeout")), 1000)
            ),
          ]);
        }
      } catch (_) { }

      // Lightweight healing: only refresh agent details; no re-register, no restarts
      if (user?.extension) {
        console.log("🔄 Refreshing agent details...");
        try {
          await Promise.race([
            fetchRegisteredAgentDetailsRef.current?.(user.extension),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("agent refresh timeout")), 1500)
            ),
          ]);
        } catch (refreshError) {
          console.warn("⚠️ Agent details refresh failed:", refreshError);
        }
      }

      // Final verification (short)
      setTimeout(async () => {
        if (user?.extension) {
          try {
            await fetchRegisteredAgentDetailsRef.current?.(user.extension);
            console.log(
              "✅ Session healing completed (agent details refreshed)"
            );
            showNotification({
              message: "Session restored successfully!",
              severity: "success",
              duration: 3000,
            });
          } catch (_) {
            console.warn(
              "⚠️ Session healing incomplete - user may need to refresh"
            );

            // SMART FALLBACK: Show refresh suggestion with manual healing option
            showNotification({
              message:
                "Session healing incomplete - click to attempt manual healing",
              severity: "warning",
              duration: 10000,
              action: {
                label: "Try Again",
                onClick: () => {
                  // Reset healing flag to allow another attempt
                  window.sessionHealingAttempted = false;
                  attemptSessionHealing();
                },
              },
            });

            // After multiple failed attempts, suggest refresh
            if (!window.healingFailureCount) {
              window.healingFailureCount = 1;
            } else {
              window.healingFailureCount++;

              if (window.healingFailureCount >= 3) {
                showNotification({
                  message:
                    "Multiple healing attempts failed - please refresh the page",
                  severity: "error",
                  duration: 15000,
                  action: {
                    label: "Refresh Now",
                    onClick: () => {
                      window.location.reload();
                    },
                  },
                });
              }
            }
          }
        }
      }, 2000);
    } catch (error) {
      console.error("❌ Session healing failed:", error);
      showNotification({
        message: "Session healing failed - please refresh the page",
        severity: "error",
        duration: 5000,
      });
    }
  };

  // Add direct call handler
  const handleDirectCall = (extension) => {
    if (!extension || isLoggingOut || !canInitServices()) return;

    // CRITICAL: Ensure authentication is ready before direct call
    const token = storageService.getAuthToken();
    if (!token) {
      console.warn("⚠️ Authentication not ready, ignoring direct call");
      return;
    }

    console.log("📞 handleDirectCall called with extension:", extension);

    // Set the dialer state and initiate call
    setDialerState({ phoneNumber: extension });
    setDialNumber(extension);

    // If not in a call, make the call directly
    if (callState.state === CALL_STATES.IDLE) {
      // Add a small delay to ensure state is updated before calling
      setTimeout(() => {
        console.log("📞 Calling handleMakeCall after state update");
        handleMakeCall();
      }, 100);
    } else {
      // Otherwise, show notification that they need to end current call first
      showNotification({
        message: "Please end your current call before making a new one",
        severity: "warning",
        duration: 3000,
      });
    }
  };

  // CRITICAL: Real-time event handlers with 100% reliability
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      console.log("Logout in progress, skipping real-time event handler setup");
      return;
    }

    if (!isLoggingOut && canInitServices()) {
      // CRITICAL: Ensure authentication is ready before setting up real-time handlers
      const token = storageService.getAuthToken();
      if (!token) {
        console.warn(
          "⚠️ Authentication not ready, delaying real-time handler setup"
        );
        // Retry after a short delay
        const retryTimer = setTimeout(() => {
          if (storageService.getAuthToken()) {
            // Re-run this effect
            window.location.reload();
          }
        }, 2000);
        return () => clearTimeout(retryTimer);
      }

      // Disabled custom healing monitor; rely on SIP + backend
      return () => { };

      // Expose direct call function
      window.handleDirectCall = handleDirectCall;

      // Expose dialer state update function for DashboardView
      window.updateDialerState = (extension) => {
        console.log("📞 updateDialerState called with:", extension);
        setDialerState((prev) => ({ ...prev, phoneNumber: extension }));
        setDialNumber(extension);
      };

      // Set up real-time event handlers
      const setupRealTimeHandlers = () => {
        // WebSocket event handlers
        const handleWebSocketEvent = (eventType, data) => {
          // WebSocket event received

          // CRITICAL: Ensure authentication is ready before processing WebSocket events
          const token = storageService.getAuthToken();
          if (!token) {
            console.warn(
              "⚠️ Authentication not ready, ignoring WebSocket event"
            );
            return;
          }

          switch (eventType) {
            case "agent:status":
              if (data.extension === user?.extension) {
                // Real-time agent status update received
                setSipStatus((prev) => ({
                  ...prev,
                  registered: data.status !== "Offline",
                  amiStatus: data.status,
                  lastRegistration: data.timestamp,
                }));

                if (data.status === "Offline") {
                  setRegisteredAgent(null);
                }
              }
              break;

            case "extension:availability_changed":
              if (data.extension === user?.extension) {
                // Real-time availability change received
                // Refresh agent details instead of AMI verification
                fetchRegisteredAgentDetailsRef.current?.(user.extension);
              }
              break;

            case "call:stats":
              // Real-time call statistics updates
              break;

            default:
              // Unhandled WebSocket event
              break;
          }
        };

        // SIP event handlers
        const handleSipEvent = (eventType, data) => {
          // SIP event received

          // CRITICAL: Ensure authentication is ready before processing SIP events
          const token = storageService.getAuthToken();
          if (!token) {
            console.warn("⚠️ Authentication not ready, ignoring SIP event");
            return;
          }

          switch (eventType) {
            case "registration:state":
              // Handle SIP registration state changes
              if (data === "Registered") {
                // SIP registration confirmed — fetch agent details
                if (user?.extension) {
                  setSipStatus((prev) => ({
                    ...prev,
                    registered: true,
                    state: "Registered",
                    lastRegistration: new Date().toISOString(),
                  }));
                  fetchRegisteredAgentDetailsRef.current?.(user.extension);
                }
              }
              break;

            case "call:event":
              // Handle real-time call events
              break;

            default:
              // Unhandled SIP event
              break;
          }
        };

        // AMI event handlers (via WebSocket)
        const handleAmiEvent = (eventType, data) => {
          // AMI event received

          // CRITICAL: Ensure authentication is ready before processing AMI events
          const token = storageService.getAuthToken();
          if (!token) {
            console.warn("⚠️ Authentication not ready, ignoring AMI event");
            return;
          }

          if (data.extension === user?.extension) {
            // Real-time AMI event for current user

            // Update status immediately based on AMI event
            setSipStatus((prev) => ({
              ...prev,
              amiStatus: data.status,
              registered: data.status !== "Offline",
            }));

            if (data.status === "Offline") {
              setRegisteredAgent(null);
            }
          }
        };

        // CRITICAL: Only register event handlers when authentication is fully ready
        const token = storageService.getAuthToken();
        if (token) {
          console.log("🔐 Setting up real-time event handlers with auth token");

          // Register all event handlers
          window.addEventListener("websocket:event", (e) =>
            handleWebSocketEvent(e.detail.type, e.detail.data)
          );
          window.addEventListener("sip:event", (e) =>
            handleSipEvent(e.detail.type, e.detail.data)
          );
          window.addEventListener("ami:event", (e) =>
            handleAmiEvent(e.detail.type, e.detail.data)
          );
        } else {
          console.warn(
            "🔐 No auth token available for real-time event handler setup"
          );
        }

        return () => {
          // Cleanup event listeners
          // CRITICAL: Only remove listeners if they were actually added
          const token = storageService.getAuthToken();
          if (token) {
            window.removeEventListener("websocket:event", handleWebSocketEvent);
            window.removeEventListener("sip:event", handleSipEvent);
            window.removeEventListener("ami:event", handleAmiEvent);
          }
        };
      };

      // Set up real-time handlers
      const cleanup = setupRealTimeHandlers();

      return () => {
        cleanup();
        delete window.handleDirectCall;
        delete window.updateDialerState;
      };
    }
  }, [
    isLoggingOut,
    canInitServices,
    user?.extension,
    // fetchRegisteredAgentDetails removed - using ref to prevent re-runs on UI-only changes (dock toggle)
  ]);

  // CRITICAL: Connection health monitoring and heartbeat
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      console.log("Logout in progress, skipping heartbeat monitoring");
      return;
    }

    if (isLoggingOut || !canInitServices()) return;

    // CRITICAL: Ensure authentication is ready before starting heartbeat monitoring
    const token = storageService.getAuthToken();
    if (!token) {
      console.warn(
        "⚠️ Authentication not ready, delaying heartbeat monitoring"
      );
      return;
    }

    let heartbeatInterval = null;
    let lastHeartbeat = Date.now();
    const heartbeatTimeout = 30000; // 30 seconds

    const checkConnectionHealth = async () => {
      try {
        // Check if WebSocket is still alive
        const isWebSocketAlive = callMonitoringService.isConnected();

        if (!isWebSocketAlive) {
          // WebSocket connection lost - triggering reconnection
          // Trigger reconnection
          window.dispatchEvent(new CustomEvent("websocket:disconnected"));
          return;
        }

        // Check if we have recent updates; refresh agent details if stale
        const timeSinceLastUpdate = Date.now() - lastHeartbeat;
        if (timeSinceLastUpdate > heartbeatTimeout) {
          if (user?.extension) {
            try {
              await fetchRegisteredAgentDetailsRef.current?.(user.extension);
              lastHeartbeat = Date.now();
            } catch (_) { }
          }
        }
      } catch (error) {
        console.error("❌ Connection health check failed:", error);
        // Trigger reconnection on health check failure
        window.dispatchEvent(new CustomEvent("websocket:disconnected"));
      }
    };

    // Set up heartbeat monitoring
    heartbeatInterval = setInterval(checkConnectionHealth, 10000); // Every 10 seconds

    // Update heartbeat timestamp on any real-time event
    const updateHeartbeat = () => {
      // CRITICAL: Ensure authentication is ready before updating heartbeat
      const token = storageService.getAuthToken();
      if (!token) {
        return; // Silently ignore if not authenticated
      }
      lastHeartbeat = Date.now();
    };

    window.addEventListener("websocket:event", updateHeartbeat);
    window.addEventListener("sip:event", updateHeartbeat);
    window.addEventListener("ami:event", updateHeartbeat);

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      window.removeEventListener("websocket:event", updateHeartbeat);
      window.removeEventListener("sip:event", updateHeartbeat);
      window.removeEventListener("ami:event", updateHeartbeat);
    };
  }, [isLoggingOut, canInitServices, user?.extension]);

  // Enhanced transfer status events from sipService
  useEffect(() => {
    const onManagedStarted = ({ transferId, targetExtension }) => {
      setIsAttendedTransfer(true);
      setConsultationCall({
        transferId,
        targetExtension,
        startTime: Date.now(),
      });
      showNotification({
        message: `Consultation started with ${targetExtension}${transferId ? ` (ID: ${transferId})` : ""
          }`,
        severity: "info",
        duration: 4000,
      });
    };

    const onManagedCompleted = ({ transferId }) => {
      showNotification({
        message: `Transfer completed${transferId ? ` (ID: ${transferId})` : ""
          }`,
        severity: "success",
        duration: 3000,
      });
      setIsAttendedTransfer(false);
      setConsultationCall(null);
      setTransferDialogOpen(false);
    };

    const onManagedCancelled = ({ transferId }) => {
      showNotification({
        message: `Transfer cancelled${transferId ? ` (ID: ${transferId})` : ""
          }`,
        severity: "info",
        duration: 3000,
      });
      setIsAttendedTransfer(false);
      setConsultationCall(null);
      setTransferDialogOpen(false);
    };

    sipService.events.on("transfer:managed_started", onManagedStarted);
    sipService.events.on("transfer:managed_completed", onManagedCompleted);
    sipService.events.on("transfer:managed_cancelled", onManagedCancelled);

    return () => {
      sipService.events.off("transfer:managed_started", onManagedStarted);
      sipService.events.off("transfer:managed_completed", onManagedCompleted);
      sipService.events.off("transfer:managed_cancelled", onManagedCancelled);
    };
  }, [showNotification]);

  // Effect to update consultation duration timer
  useEffect(() => {
    // CRITICAL: Prevent this effect from running during logout
    if (window.isLoggingOut) {
      console.log("Logout in progress, skipping consultation duration timer");
      return;
    }

    if (!isAttendedTransfer || !consultationCall || isLoggingOut) return;

    // CRITICAL: Ensure authentication is ready before consultation duration timer
    const token = storageService.getAuthToken();
    if (!token) {
      return; // Silently ignore if not authenticated
    }

    const interval = setInterval(() => {
      // Force re-render to update consultation duration
      setConsultationCall((prev) => (prev ? { ...prev } : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAttendedTransfer, consultationCall, isLoggingOut]);

  // ========== Component Rendering ==========

  return (
    <>
      {/* Main AppBar */}
      <AppBar
        position="fixed"
        data-testid="appbar"
        sx={{
          backgroundColor: "#2c3338",
          top: 0,
          height: `${APPBAR_CONFIG.toolbarHeight}px`,
          ml: (isCollapsed || isStickyAppbarEnabled) ? 0 : miniDrawerOpen ? "60px" : 0,
          width: (isCollapsed || isStickyAppbarEnabled)
            ? "100%"
            : miniDrawerOpen
              ? `calc(100% - 60px)`
              : "100%",
          transition: (isCollapsed || isStickyAppbarEnabled) ? "none" : "all 0.3s ease",
          // Add bottom border when in sticky mode to visually separate from other apps
          borderBottom: isStickyAppbarEnabled ? `${APPBAR_CONFIG.bottomPadding}px solid #1a1d20` : "none",
          // Prevent content overflow and flickering in docked mode
          overflow: "hidden",
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${APPBAR_CONFIG.toolbarHeight - 4}px !important`,
            height: `${APPBAR_CONFIG.toolbarHeight - 4}px`,
            maxHeight: `${APPBAR_CONFIG.toolbarHeight - 4}px`,
            paddingLeft: "8px",
            paddingRight: "8px",
            overflow: "hidden",
          }}
        >
          {/* Left Section: Core Status & Navigation */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {/* Logout Button - Only visible when docked (isCollapsed) OR in sticky mode */}
            {(isCollapsed || isStickyAppbarEnabled) && (
              <Tooltip title={isLoggingOut ? "Logging out..." : "Logout"}>
                <IconButton
                  onClick={() => {
                    // When docked, temporarily expand window to show dialog
                    if (window.require) {
                      const { ipcRenderer } = window.require('electron');
                      // Request to temporarily show logout dialog in expanded mode
                      ipcRenderer.send('show-logout-dialog');
                    }
                    handleLogout();
                  }}
                  disabled={isLoggingOut}
                  sx={{
                    color: isLoggingOut ? "#999" : "#ff5252",
                    p: 0.5,
                    "&:hover": { backgroundColor: "rgba(255,82,82,0.2)" },
                  }}
                >
                  {isLoggingOut ? (
                    <CircularProgress size={20} color="error" />
                  ) : (
                    <PowerSettingsNew fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {/* Incoming Call Answer/Reject Buttons - Only visible in sticky mode when ringing */}
            {(isCollapsed || isStickyAppbarEnabled) &&
              callState.state === "ringing" &&
              callState.direction === "inbound" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
                  {/* Caller ID display */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#fff",
                      fontSize: "0.7rem",
                      maxWidth: "80px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      mr: 0.5,
                    }}
                  >
                    {callState.remoteIdentity || callState.callerid || "Incoming"}
                  </Typography>
                  {/* Animated Answer Button */}
                  <IconButton
                    onClick={handleAnswer}
                    size="small"
                    sx={{
                      backgroundColor: "#4caf50",
                      color: "#fff",
                      p: 0.5,
                      animation: "dockedPulse 1.2s infinite",
                      "@keyframes dockedPulse": {
                        "0%": {
                          transform: "scale(1)",
                          boxShadow: "0 0 0 0 rgba(76, 175, 80, 0.9)",
                        },
                        "50%": {
                          transform: "scale(1.15)",
                          boxShadow: "0 0 8px 4px rgba(76, 175, 80, 0.4)",
                        },
                        "100%": {
                          transform: "scale(1)",
                          boxShadow: "0 0 0 0 rgba(76, 175, 80, 0)",
                        },
                      },
                      "&:hover": {
                        backgroundColor: "#2e7d32",
                        animation: "none",
                        transform: "scale(1.2)",
                      },
                    }}
                  >
                    <CallIcon fontSize="small" />
                  </IconButton>
                  {/* Reject Button */}
                  <IconButton
                    onClick={handleReject}
                    size="small"
                    sx={{
                      backgroundColor: "#f44336",
                      color: "#fff",
                      p: 0.5,
                      "&:hover": {
                        backgroundColor: "#d32f2f",
                        transform: "scale(1.1)",
                      },
                    }}
                  >
                    <CallEndIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}

            {/* Hamburger Menu - Hidden when docked OR in sticky mode */}
            {!isCollapsed && !isStickyAppbarEnabled && (
              <IconButton
                onClick={() => setMenuOpen(true)}
                sx={{
                  color: "#fff",
                  p: 0.5,
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* AMI/SIP indicators hidden in simplified UI */}

            {/* Force Reload Button - Hidden when docked OR in sticky mode */}
            {!isCollapsed && !isStickyAppbarEnabled && (
              <Tooltip title="Reconnect Phone System (Ctrl+Shift+R)">
                <IconButton
                  size="small"
                  onClick={async () => {
                    // SIP Reconnection + WebSocket refresh to heal stale connections
                    try {
                      showNotification({
                        message: "Reconnecting phone system...",
                        severity: "info",
                        duration: 3000,
                      });

                      console.log("🔄 Force Reload: Starting SIP reconnection...");
                      await sipService.reconnect();
                      console.log("✅ Force Reload: SIP reconnection completed");

                      // Also refresh WebSocket connection if available
                      if (callMonitoringService?.reinitialize) {
                        console.log("🔄 Force Reload: Reinitializing WebSocket...");
                        await callMonitoringService.reinitialize();
                        console.log("✅ Force Reload: WebSocket reinitialized");
                      }

                      showNotification({
                        message: "Phone system reconnected successfully",
                        severity: "success",
                        duration: 3000,
                      });
                    } catch (error) {
                      console.error("❌ Force Reload: SIP reconnection failed:", error);
                      showNotification({
                        message: `Reconnection failed: ${error.message}. Reloading app...`,
                        severity: "warning",
                        duration: 3000,
                      });
                      // Fallback to full page reload if SIP reconnect fails
                      setTimeout(() => {
                        if (window.require) {
                          const { ipcRenderer } = window.require('electron');
                          ipcRenderer.send('force-reload');
                        } else {
                          window.location.reload();
                        }
                      }, 1500);
                    }
                  }}
                  sx={{
                    ml: 1,
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.1)",
                      color: "#0ca",
                    },
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Windows Sticky Appbar Toggle - Only show in Electron on Windows, hidden when docked */}
            {!isCollapsed && isStickyAppbarAvailable && (
              <Tooltip
                title={
                  isStickyAppbarEnabled
                    ? "Disable Sticky Mode (restore normal window)"
                    : isStickyAppbarNative
                      ? "Enable Sticky Mode (dock to top, reserve screen space)"
                      : "Enable Sticky Mode (dock to top, always on top)"
                }
              >
                <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
                  <Switch
                    size="small"
                    checked={isStickyAppbarEnabled}
                    onChange={() => {
                      if (!isStickyAppbarLoading) {
                        toggleStickyAppbar();
                      }
                    }}
                    disabled={isStickyAppbarLoading}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: isStickyAppbarNative ? "#ff6b35" : "#ffa500",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: isStickyAppbarNative ? "#ff6b35" : "#ffa500",
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: isStickyAppbarEnabled
                        ? isStickyAppbarNative
                          ? "#ff6b35"
                          : "#ffa500"
                        : "rgba(255,255,255,0.6)",
                      fontSize: "0.65rem",
                      fontWeight: isStickyAppbarEnabled ? 600 : 400,
                      ml: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isStickyAppbarLoading
                      ? "..."
                      : isStickyAppbarEnabled
                        ? "STICKY"
                        : "Dock"}
                  </Typography>
                </Box>
              </Tooltip>
            )}

            {/* Center Section: Call Interface */}
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: 2 }}
            >
              {/* Phone Number Input */}
              <InputBase
                value={dialerState.phoneNumber}
                onChange={(e) => handleDialerInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter number to call..."
                data-testid="phone-input"
                name="phoneNumber"
                id="appbar-phone-input"
                sx={{
                  backgroundColor: "#fff",
                  color: "#000",
                  borderRadius: 1,
                  height: "32px",
                  width: "220px",
                  padding: "0 12px",
                  "& input": {
                    height: "32px",
                    padding: 0,
                    fontSize: "14px",
                    color: "#000",
                  },
                  "&:focus-within": {
                    boxShadow: "0 0 0 2px #00b894",
                  },
                }}
                inputProps={{
                  pattern: "[0-9*#]*",
                  inputMode: "numeric",
                  "data-phone-input": "true",
                }}
              />

              {/* Call Action Button */}
              <CallActionButton />

              {/* Dialpad Toggle */}
              <IconButton
                onClick={handleDialpadToggle}
                sx={{
                  color: "#fff",
                  p: 0.5,
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                <Dialpad />
              </IconButton>
            </Box>

            {/* Center Section - Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Right Section: Call Controls & Status */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {/* Call Duration & Consultation */}
              <CallDuration />
              <ConsultationDuration />

              {/* Call Control Buttons */}
              {callState.state !== "idle" && (
                <>
                  <IconButton
                    color="inherit"
                    size="small"
                    onClick={handleToggleMute}
                    sx={{
                      color: callState.muted ? "error.main" : "inherit",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                      },
                    }}
                  >
                    {callState.muted ? <MicOffIcon /> : <MicIcon />}
                  </IconButton>

                  <Tooltip
                    title={callState.onHold ? "Unhold Call" : "Hold Call"}
                  >
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={handleToggleHold}
                      sx={{
                        color: callState.onHold ? "#f90" : "inherit",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                        },
                      }}
                    >
                      {callState.onHold ? <UnholdIcon /> : <HoldIcon />}
                    </IconButton>
                  </Tooltip>

                  {callState.state === CALL_STATES.ESTABLISHED && (
                    <Tooltip
                      title={
                        isAttendedTransfer
                          ? "Complete Transfer"
                          : "Transfer Call"
                      }
                    >
                      <IconButton
                        color={isAttendedTransfer ? "success" : "inherit"}
                        size="small"
                        onClick={
                          isAttendedTransfer
                            ? handleCompleteAttendedTransfer
                            : handleOpenTransferDialog
                        }
                        sx={{
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                          },
                        }}
                      >
                        <SwapCalls />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
            </Box>

            {/* Phone Number Input */}

            {/* Call Status and Feedback Display */}
            {(callState.state !== "idle" ||
              callFeedback ||
              isAttendedTransfer) && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: callState.state === "ringing"
                      ? "rgba(255, 152, 0, 0.15)"
                      : "rgba(255,255,255,0.1)",
                    borderRadius: 1,
                    px: 1.5,
                    py: 0.5,
                    mr: 2,
                    minHeight: "32px",
                    minWidth: "180px",
                    transition: "all 0.3s ease",
                    ...(callState.state === "ringing" && {
                      animation: `${ringingGlow} 1.5s ease-in-out infinite`,
                      border: "1px solid rgba(255, 152, 0, 0.5)",
                    }),
                  }}
                >
                  {callState.state !== "idle" ? (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                          fontSize: "0.875rem",
                        }}
                      >
                        {callState.remoteIdentity || "Unknown"}
                      </Typography>
                      {callState.state === "ringing" && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            animation: `${ringingPulse} 1s ease-in-out infinite`,
                          }}
                        >
                          {callState.direction === "inbound" ? (
                            <CallReceived sx={{ fontSize: "0.85rem", color: "success.light" }} />
                          ) : (
                            <CallMade sx={{ fontSize: "1rem", color: "#00b894" }} />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              color: callState.direction === "inbound"
                                ? "success.light"
                                : "warning.light",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                            }}
                          >
                            {callState.direction === "inbound"
                              ? "Incoming..."
                              : "Ringing..."}
                          </Typography>
                        </Box>
                      )}
                      {callState.state === "ongoing" && (
                        <CallDuration duration={callState.duration} />
                      )}
                      {/* CallPopup - Hidden in sticky mode (uses inline buttons instead) */}
                      {callState.state === "ringing" &&
                        callState.direction === "inbound" &&
                        !isStickyAppbarEnabled &&
                        !isCollapsed && (
                          <CallPopup
                            open={true}
                            call={callState}
                            client={null}
                            loading={false}
                            onAnswer={handleAnswer}
                            onReject={handleReject}
                            onOpenRecord={() => { }}
                          />
                        )}
                    </Box>
                  ) : isAttendedTransfer ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "success.main",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.75rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Consultation with {transferTarget} - Original caller on
                        hold
                      </Typography>
                      <ConsultationDuration />
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "error.light",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {callFeedback}
                    </Typography>
                  )}
                </Box>
              )}

            {/* Dialpad functionality moved to center section to avoid duplication */}
          </Box>
          {/* Audio Device Selector */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {audioDevices.length > 0 && (
              <Select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                sx={{
                  ml: 1,
                  maxWidth: 180,
                  minWidth: 120,
                  color: "#fff",
                  fontSize: "0.75rem",
                  "& .MuiSelect-select": {
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              >
                {audioDevices.map((device) => (
                  <MenuItem
                    key={device.deviceId}
                    value={device.deviceId}
                    sx={{
                      fontSize: "0.75rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {device.label ||
                      `Microphone ${device.deviceId.slice(0, 4)}`}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>

          {/* Center Section - Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Right Section: Clean Status & User Info */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "nowrap",
            }}
          >
            {/* Registration Status Box */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: presence === "BREAK" ? "rgba(220, 132, 0, 0.15)" : "#1e2326",
                border: presence === "BREAK" ? "1px solid rgba(192, 116, 2, 0.46)" : "none",
                borderRadius: 1,
                padding: "6px 12px",
                mr: 1,
                minWidth: "180px",
              }}
            >
              {reconnectionAttempts > 0 &&
                reconnectionAttempts < maxReconnectionAttempts ? (
                <>
                  <CircularProgress
                    size={12}
                    sx={{
                      mr: 1,
                      color: "#f90",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(225, 135, 0, 1)",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Reconnecting...
                  </Typography>
                </>
              ) : (
                <>
                  <Circle
                    sx={{
                      mr: 1,
                      fontSize: presence === "BREAK" ? 14 : 12,
                      color: getStatusColor(
                        isRegistered ? (presence === "BREAK" ? "paused" : "registered") : "unregistered"
                      ),
                      animation: presence === "BREAK" ? "pulse 1.5s ease-in-out infinite" : "none",
                      "@keyframes pulse": {
                        "0%, 100%": { opacity: 1 },
                        "50%": { opacity: 0.5 },
                      },
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: getStatusColor(presence),
                      fontSize: presence === "BREAK" ? "0.9rem" : "0.85rem",
                      fontWeight: presence === "BREAK" ? 600 : 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {isRegistered
                      ? presence === "BREAK"
                        ? currentPauseReason?.label
                          ? `Paused (${currentPauseReason.label})`
                          : "Paused"
                        : "Ready"
                      : "Not Ready"}
                  </Typography>
                  {isRegistered && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handlePresenceChange(
                            presence === "BREAK" ? "READY" : "BREAK"
                          )
                        }
                        sx={{
                          ml: 1,
                          color: presence === "BREAK" ? "#4caf50" : "rgba(222, 133, 1, 1)",
                          padding: "4px",
                        }}
                        title={
                          presence === "BREAK"
                            ? "Resume Work"
                            : "Set Break Status"
                        }
                      >
                        {presence === "BREAK" ? <PlayArrow /> : <PauseCircle />}
                      </IconButton>
                    </>
                  )}
                  {/* Connection Health moved to separate section for better visibility */}
                </>
              )}
            </Box>

            {/* Connection Health Display - Moved outside for better visibility */}
            {/* <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 1,
                padding: "4px 8px",
                border: "1px solid rgba(255,255,255,0.1)",
                minWidth: "100px",
                justifyContent: "center",
              }}
            > */}
            {/* Connection Health hidden in simplified UI */}
            {/* </Box> */}

            {/* User Info */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: registeredAgent
                  ? "#1e2326"
                  : user?.username
                    ? "#2a1e1e"
                    : "#4a1e1e", // Green if registered, orange if connecting, red if no user
                borderRadius: 1,
                padding: "4px 8px",
                maxWidth: "260px",
                minWidth: "200px",
                border: !user?.username
                  ? "1px solid #f44336"
                  : registeredAgent
                    ? "1px solid #4caf50"
                    : "1px solid #ff9800",
                flexShrink: 0,
              }}
            >
              <AccountCircle
                sx={{
                  flexShrink: 0,
                  color: !user?.username
                    ? "#f44336"
                    : registeredAgent
                      ? "#4caf50"
                      : "#ff9800",
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textTransform: "capitalize",
                    color: !user?.username
                      ? "#f44336"
                      : registeredAgent
                        ? "#4caf50"
                        : "#ff9800",
                  }}
                >
                  {registeredAgent ? (
                    <>
                      {user?.username}{" "}
                      <span
                        style={{
                          display: "inline-block",
                          width: "4px",
                          height: "100%",
                          color: "rgba(255, 158, 22, 0.94)",
                          margin: "0 4px",
                        }}
                      >
                        |
                      </span>
                      {registeredAgent?.username}
                    </>
                  ) : user?.username ? (
                    <>
                      {user?.username}{" "}
                      <span
                        style={{
                          display: "inline-block",
                          width: "4px",
                          height: "100%",
                          color: "rgba(255, 158, 22, 0.94)",
                          margin: "0 4px",
                        }}
                      >
                        |
                      </span>
                      {user?.extension || ""}
                    </>
                  ) : (
                    <span style={{ color: "#ff9800", fontStyle: "italic" }}>
                      Not Registered
                    </span>
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: !user?.username
                      ? "#f44336"
                      : registeredAgent
                        ? "#4caf50"
                        : "#ff9800",
                    fontSize: "0.6rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {isRegistered ? (
                    <>
                      ✅ Connected
                      {callMonitoringService.isConnected() && (
                        <span style={{ color: "#4caf50", marginLeft: "4px" }}>
                          • WS: Live
                        </span>
                      )}
                      {/* Auto-Answer Switch with Tooltip */}
                      <Tooltip
                        title={autoAnswerEnabled
                          ? `Auto-Answer is ON: Incoming calls will be answered automatically${autoAnswerDelay > 0 ? ` after ${autoAnswerDelay} second${autoAnswerDelay !== 1 ? 's' : ''}` : ' immediately'}`
                          : "Auto-Answer is OFF: You must manually answer calls"}
                        arrow
                        placement="bottom"
                      >
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            ml: 1.5,
                            mt: -0.5,
                            px: 0.8,
                            py: 0.3,
                            borderRadius: '12px',
                            backgroundColor: autoAnswerEnabled ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.1)',
                            border: `1px solid ${autoAnswerEnabled ? 'rgba(76, 175, 80, 0.3)' : 'rgba(207, 16, 32, 1)'}`,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <Switch
                            size="small"
                            checked={autoAnswerEnabled}
                            disabled
                            sx={{
                              width: 28,
                              height: 16,
                              padding: 0,
                              '& .MuiSwitch-thumb': {
                                width: 12,
                                height: 12,
                                boxShadow: autoAnswerEnabled
                                  ? '0 0 6px rgba(76, 175, 80, 0.8)'
                                  : '0 0 4px rgba(201, 0, 0, 0.6)',
                                backgroundColor: autoAnswerEnabled ? '#4caf50' : '#f44336',
                              },
                              '& .MuiSwitch-switchBase': {
                                padding: '2px',
                                '&.Mui-checked': {
                                  transform: 'translateX(12px)',
                                  color: '#4caf50',
                                  '& + .MuiSwitch-track': {
                                    backgroundColor: '#4caf50',
                                    opacity: 0.5,
                                  },
                                },
                                '&.Mui-disabled': {
                                  '& .MuiSwitch-thumb': {
                                    backgroundColor: autoAnswerEnabled ? '#4caf50' : '#f44336',
                                  },
                                },
                              },
                              '& .MuiSwitch-track': {
                                borderRadius: 8,
                                backgroundColor: autoAnswerEnabled ? '#4caf50' : '#f44336',
                                opacity: autoAnswerEnabled ? 0.3 : 0.25,
                              },
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              ml: 0.5,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              letterSpacing: '0.3px',
                              textTransform: 'capitalize',
                              color: autoAnswerEnabled ? '#4caf50' : '#f44336',
                            }}
                          >
                            Auto
                          </Typography>
                        </Box>
                      </Tooltip>
                    </>
                  ) : (
                    "❌ Not Registered 🛑"
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>

        </Toolbar>
      </AppBar>

      {/* Mini Drawer - Hidden when docked (isCollapsed) OR in sticky mode */}
      <Drawer
        variant="permanent"
        anchor="left"
        open={!isCollapsed && !isStickyAppbarEnabled}
        sx={{
          display: (isCollapsed || isStickyAppbarEnabled) ? "none" : "block",
          "& .MuiDrawer-paper": {
            width: 60,
            backgroundColor: "#2c3338",
            color: "#fff",
            overflowX: "hidden",
            display: (isCollapsed || isStickyAppbarEnabled) ? "none" : "block",
            top: 0,
            height: "100%",
          },
        }}
      >
        {/* Remove duplicate Menu Icon - main one is already in the AppBar */}
        <Box
          sx={{
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Empty space to maintain layout */}
        </Box>

        <List sx={{ p: 1 }}>
          {filteredMenuItems.map((item) => (
            <Tooltip
              key={item.id}
              title={item.isLocked ? item.lockedReason : item.text}
              placement="right"
            >
              <ListItemButton
                onClick={() => handleMenuClick(item.action, item)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  minHeight: 40,
                  justifyContent: "center",
                  backgroundColor:
                    activeSection === item.id ? "#128C7E" : "transparent",
                  opacity: item.isLocked ? 0.5 : 1,
                  "&:hover": {
                    backgroundColor:
                      activeSection === item.id
                        ? "#128C7E"
                        : "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color:
                      activeSection === item.id
                        ? "#fff"
                        : item.isLocked
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.7)",
                    minWidth: "auto",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {item.icon}
                  {item.isLocked && (
                    <LockIcon
                      sx={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    />
                  )}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Drawer>

      {/* Full Drawer - Shows on menu click */}
      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: "#2c3338",
            color: "#fff",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #444",
            backgroundColor: "#1e2326",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <IconButton onClick={() => setMenuOpen(false)} sx={{ color: "#fff" }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Call Center Menu</Typography>
        </Box>

        <List sx={{ p: 1 }}>
          {filteredMenuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <Tooltip
                title={item.isLocked ? item.lockedReason : ""}
                placement="right"
                disableHoverListener={!item.isLocked}
              >
                <ListItemButton
                  onClick={() => handleMenuClick(item.action, item)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor:
                      activeSection === item.id ? "#128C7E" : "transparent",
                    opacity: item.isLocked ? 0.5 : 1,
                    "&:hover": {
                      backgroundColor:
                        activeSection === item.id
                          ? "#128C7E"
                          : "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color:
                        activeSection === item.id
                          ? "#fff"
                          : item.isLocked
                            ? "rgba(255,255,255,0.4)"
                            : "rgba(255,255,255,0.7)",
                      minWidth: 40,
                      position: "relative",
                    }}
                  >
                    {item.icon}
                    {item.isLocked && (
                      <LockIcon
                        sx={{
                          position: "absolute",
                          bottom: -2,
                          right: 8,
                          fontSize: 14,
                          color: "rgba(255,255,255,0.6)",
                        }}
                      />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    secondary={item.isLocked ? "License upgrade required" : null}
                    primaryTypographyProps={{
                      sx: {
                        fontSize: "0.9rem",
                        color:
                          activeSection === item.id
                            ? "#fff"
                            : item.isLocked
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(255,255,255,0.7)",
                      },
                    }}
                    secondaryTypographyProps={{
                      sx: {
                        fontSize: "0.7rem",
                        color: "rgba(255,200,100,0.7)",
                      },
                    }}
                  />
                </ListItemButton>
              </Tooltip>
              {index === 2 && <Divider sx={{ my: 1, borderColor: "#444" }} />}
            </React.Fragment>
          ))}
        </List>

        <Box sx={{ mt: "auto", p: 1, borderTop: "1px solid #444" }}>
          <ListItemButton
            onClick={() => handleMenuClick(() => console.log("Settings"))}
            sx={{
              borderRadius: 1,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#fff", minWidth: 40 }}>
              <Settings />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              primaryTypographyProps={{
                sx: { fontSize: "0.9rem" },
              }}
            />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Dialpad */}
      <Dialog
        open={isDialpadOpen}
        onClose={handleCloseDialpad}
        sx={{ "& .MuiDialog-paper": { minWidth: 300 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Mayday Dialpad
          {callState.state !== CALL_STATES.IDLE && (
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              {callState.state}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={dialNumber}
            onChange={(e) => {
              const value = e.target.value;
              if (/^[0-9*#]*$/.test(value)) {
                if (value.length > dialNumber.length) {
                  const lastChar = value[value.length - 1];
                  dtmfService.playTone(lastChar);
                }
                setDialNumber(value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter phone number"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone />
                </InputAdornment>
              ),
              endAdornment: dialNumber && (
                <InputAdornment position="end">
                  <IconButton onClick={handleDialpadDelete} size="small">
                    <Backspace />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Grid container spacing={1} justifyContent="center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((num) => (
              <Grid item xs={4} key={num}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleDialpadInput(num)}
                  sx={{
                    height: "48px",
                    backgroundColor:
                      activeKey === num.toString() ? "#012030" : "#fff",
                    borderColor:
                      activeKey === num.toString() ? "#e3f2fd" : "#e0e0e0",
                    color: activeKey === num.toString() ? "#fff" : "#333",
                    fontWeight: "bold",
                    transition: "all 0.15s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    "&:hover": {
                      backgroundColor: "#f5f5f5",
                      borderColor: "#bdbdbd",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                      transform: "translateY(-1px)",
                    },
                    "&:active, &.active": {
                      backgroundColor: "#e3f2fd",
                      borderColor: "#2196f3",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      transform: "translateY(1px)",
                    },
                    ...(activeKey === num.toString() && {
                      transform: "translateY(1px)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }),
                  }}
                >
                  {num}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialpad} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleMakeCall}
            startIcon={<CallIcon />}
            color="success"
            variant="contained"
            disabled={!dialNumber || callState.state !== CALL_STATES.IDLE}
          >
            Call
          </Button>
        </DialogActions>
      </Dialog>

      {/* Section components */}
      <DashboardView
        open={activeSection === "dashboard"}
        onClose={handleCloseSection}
        title="Dashboard"
        isCollapsed={isCollapsed}
      />
      <FeatureGate feature={FEATURE_KEYS.WHATSAPP} showFallback={activeSection === "whatsapp"}>
        <WhatsAppElectronComponent
          open={activeSection === "whatsapp"}
          onClose={handleCloseSection}
          initialChat={whatsAppInitialChat}
          isCollapsed={isCollapsed}
        />
      </FeatureGate>
      <FeatureGate feature={FEATURE_KEYS.CALLS} showFallback={activeSection === "callHistory"}>
        <CallHistory
          open={activeSection === "callHistory"}
          onClose={handleCloseSection}
          onCallNumber={handleSetDialNumber}
        />
      </FeatureGate>
      {/* SessionAnalytics and Clients removed - datatool_server not used in this project */}
      <FeatureGate feature={FEATURE_KEYS.REPORTS} showFallback={activeSection === "reports"}>
        <Reports
          open={activeSection === "reports"}
          onClose={handleCloseSection}
        />
      </FeatureGate>
      {/* <Contacts
        open={activeSection === "contacts"}
        onClose={handleCloseSection}
        onWhatsAppChat={handleWhatsAppChat}
      /> */}
      {/* <Campaigns
        open={activeSection === "campaigns"}
        onClose={handleCloseSection}
      /> */}
      <AgentStatus
        open={activeSection === "agentStatus"}
        onClose={handleCloseSection}
      />
      {/* <EmailView
        open={activeSection === "email"}
        onClose={handleCloseSection}
      /> */}
      {/* <FacebookView
        open={activeSection === "facebook"}
        onClose={handleCloseSection}
      /> */}
      <PhonebarInfo
        open={activeSection === "info"}
        onClose={handleCloseSection}
      />

      {/* Agent Directory */}
      <AgentDirectory
        open={activeSection === "agentDirectory"}
        onClose={handleCloseAgentDirectory}
        onTransferCall={handleTransferFromDirectory}
      />

      {/* Transfer History */}
      <FeatureGate feature={FEATURE_KEYS.TRANSFERS} showFallback={activeSection === "transferHistory"}>
        <TransferHistory
          open={activeSection === "transferHistory"}
          onClose={handleCloseTransferHistory}
        />
      </FeatureGate>

      {/* App Updates Section */}
      {activeSection === "updates" && (
        <Dialog
          open={activeSection === "updates"}
          onClose={handleCloseSection}
          maxWidth="xs"
          fullWidth
        >
          <AppUpdater variant="dialog" />
        </Dialog>
      )}

      {/* Transfer Call Dialog */}
      <Dialog
        open={transferDialogOpen}
        onClose={handleCloseTransferDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">
              {isAttendedTransfer ? "Attended Transfer" : "Transfer Call"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Select
                size="small"
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="blind">Blind Transfer</MenuItem>
                <MenuItem value="attended">Attended Transfer</MenuItem>
              </Select>
              <Select
                size="small"
                value={transferFilter}
                onChange={(e) => setTransferFilter(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="all">All Agents</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="onCall">On Call</MenuItem>
              </Select>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {transferType === "blind"
              ? "Select an agent to transfer the current call directly (blind transfer):"
              : "Select an agent to consult with before transferring (attended transfer):"}
          </Typography>

          {transferType === "attended" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Attended Transfer:</strong> You'll call the agent first
                to discuss the caller's needs, then complete the transfer. The
                original caller will be put on hold during consultation.
              </Typography>
            </Alert>
          )}

          {/* Consultation Call Status */}
          {isAttendedTransfer && consultationCall && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2">
                  <strong>Consultation Active:</strong> You are now speaking
                  with {transferTarget}. The original caller is on hold. When
                  ready, click "Complete Transfer" to connect them.
                </Typography>
                <ConsultationDuration />
              </Box>
            </Alert>
          )}

          {/* Search Box */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search agents by name or extension..."
            value={transferSearchQuery}
            onChange={(e) => setTransferSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {filteredAvailableAgents.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {transferSearchQuery || transferFilter !== "all"
                  ? "No agents match your search criteria"
                  : "No other agents are currently available"}
              </Typography>
              {transferSearchQuery && (
                <Button
                  size="small"
                  onClick={() => setTransferSearchQuery("")}
                  sx={{ mt: 1 }}
                >
                  Clear Search
                </Button>
              )}
            </Box>
          ) : (
            <List sx={{ pt: 0, maxHeight: 400, overflow: "auto" }}>
              {availableAgentsLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {filteredAvailableAgents.map((agent) => (
                <ListItemButton
                  key={agent.extension}
                  selected={transferTarget === agent.extension}
                  onClick={() => setTransferTarget(agent.extension)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    border: transferTarget === agent.extension ? 1 : 0,
                    borderColor: "primary.main",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          agent.status === "On Call"
                            ? "error.light"
                            : "success.light",
                      }}
                    >
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {agent.name}
                        </Typography>
                        <Chip
                          label={agent.status}
                          size="small"
                          color={
                            agent.status === "On Call" ? "error" : "success"
                          }
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box
                        component="span"
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography variant="caption">
                          Ext: {agent.extension}
                        </Typography>
                        {agent.callsDone > 0 && (
                          <>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              •
                            </Typography>
                            <Typography variant="caption">
                              {agent.callsDone} calls today
                            </Typography>
                          </>
                        )}
                        {agent.currentCall && (
                          <>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              •
                            </Typography>
                            <Typography variant="caption" color="error.main">
                              On call: {agent.currentCall.callerId}
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectCall(agent.extension);
                      }}
                      color="primary"
                      size="small"
                      disabled={callState.state !== CALL_STATES.IDLE}
                    >
                      <Tooltip title="Call directly">
                        <Phone fontSize="small" />
                      </Tooltip>
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add agent to favorites or show more options
                        showNotification({
                          message: `${agent.name} added to favorites`,
                          severity: "info",
                          duration: 2000,
                        });
                      }}
                      color="secondary"
                      size="small"
                    >
                      <Tooltip title="Add to favorites">
                        <StarBorder fontSize="small" />
                      </Tooltip>
                    </IconButton>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          {isAttendedTransfer ? (
            <>
              <Button onClick={handleCancelAttendedTransfer} color="inherit">
                Cancel Transfer
              </Button>
              <Button
                onClick={handleCompleteAttendedTransfer}
                color="success"
                variant="contained"
                startIcon={<SwapCalls />}
              >
                Complete Transfer
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleCloseTransferDialog} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleTransferCall}
                color="primary"
                variant="contained"
                disabled={!transferTarget || isTransferring}
                startIcon={
                  isTransferring ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SwapCalls />
                  )
                }
              >
                {isTransferring ? "Transferring..." : "Transfer Call"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Pause Reasons Dialog */}
      <Dialog
        open={pauseDialogOpen}
        onClose={() => setPauseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: "background.paper",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "#ff9800",
            color: "white",
          }}
        >
          <PauseCircle />
          Select Pause Reason
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {pauseReasonsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : pauseReasons.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                No pause reasons available
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {pauseReasons.map((reason) => (
                <Grid item xs={6} sm={4} key={reason.code}>
                  <Paper
                    elevation={selectedPauseReason === reason.code ? 4 : 1}
                    onClick={() => setSelectedPauseReason(reason.code)}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      textAlign: "center",
                      border: 2,
                      borderColor:
                        selectedPauseReason === reason.code
                          ? reason.color || "#ff9800"
                          : "transparent",
                      bgcolor:
                        selectedPauseReason === reason.code
                          ? `${reason.color || "#ff9800"}15`
                          : "background.paper",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: 3,
                        borderColor: reason.color || "#ff9800",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        bgcolor: `${reason.color || "#ff9800"}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1,
                      }}
                    >
                      <PauseCircle
                        sx={{
                          fontSize: 28,
                          color: reason.color || "#ff9800",
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ color: reason.color || "#ff9800" }}
                    >
                      {reason.label}
                    </Typography>
                    {reason.maxDurationMinutes && (
                      <Typography variant="caption" color="text.secondary">
                        Max: {reason.maxDurationMinutes} min
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setPauseDialogOpen(false);
              setSelectedPauseReason(null);
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handlePauseWithReason(selectedPauseReason)}
            variant="contained"
            disabled={!selectedPauseReason}
            sx={{
              bgcolor: "#ff9800",
              "&:hover": { bgcolor: "#f57c00" },
            }}
            startIcon={<PauseCircle />}
          >
            Start Pause
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={logoutDialogOpen}
        onClose={() => {
          setLogoutDialogOpen(false);
          // Notify Electron to restore docked state if needed
          if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('logout-dialog-closed');
          }
        }}
        onConfirm={performLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout? This will disconnect you from the phone system."
        confirmText="Logout"
        cancelText="Cancel"
        variant="warning"
      />
    </>
  );
};

export default Appbar;
