// electron-softphone/src/components/Login.tsx
import React, { useState, useEffect } from "react";
import "../styles/Login.css";

import { sipService } from "../services/sipService";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useNotification } from "../contexts/NotificationContext";
import { storageService, clearLogoutFlag } from "../services/storageService";
import maydaylogo from "../assets/mhu_logo_bazo.png";
import {
  CircularProgress,
  Switch,
  FormControlLabel,
  LinearProgress,
  Box,
  Typography,
} from "@mui/material";
import CryptoJS from "crypto-js";
import appPkg from "../../package.json";
import AppUpdater from "./AppUpdater";
import { stickyAppbarService } from "../services/stickyAppbarService";
import serverConfig from "../config/serverConfig";

const { ipcRenderer } = window.require("electron");

// Encryption key - in production, this should be derived from device-specific data
const ENCRYPTION_KEY = "mhu-softphone-2024-secure-key-v1";

// Encrypt credentials for secure storage
const encryptCredentials = (credentials) => {
  try {
    const jsonString = JSON.stringify(credentials);
    const encrypted = CryptoJS.AES.encrypt(
      jsonString,
      ENCRYPTION_KEY
    ).toString();
    return encrypted;
  } catch (error) {
    console.error("Error encrypting credentials:", error);
    return null;
  }
};

// Decrypt credentials from secure storage
const decryptCredentials = (encryptedData) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error decrypting credentials:", error);
    return null;
  }
};

// Store encrypted credentials
const storeEncryptedCredentials = (email, password, host) => {
  try {
    const credentials = {
      email,
      password,
      host,
      timestamp: Date.now(),
    };

    const encrypted = encryptCredentials(credentials);
    if (encrypted) {
      localStorage.setItem("encryptedCredentials", encrypted);
      localStorage.setItem("rememberMe", "true");
      console.log("✅ Encrypted credentials stored successfully");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error storing encrypted credentials:", error);
    return false;
  }
};

// Retrieve and decrypt credentials
const getEncryptedCredentials = () => {
  try {
    const encrypted = localStorage.getItem("encryptedCredentials");
    if (!encrypted) return null;

    const credentials = decryptCredentials(encrypted);
    if (credentials && credentials.timestamp) {
      // Check if credentials are not older than 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (credentials.timestamp < thirtyDaysAgo) {
        console.log("Encrypted credentials expired, clearing...");
        clearEncryptedCredentials();
        return null;
      }
      return credentials;
    }
    return null;
  } catch (error) {
    console.error("Error retrieving encrypted credentials:", error);
    return null;
  }
};

// Clear encrypted credentials
const clearEncryptedCredentials = () => {
  try {
    localStorage.removeItem("encryptedCredentials");
    localStorage.removeItem("rememberMe");
    console.log(" Encrypted credentials cleared");
  } catch (error) {
    console.error("Error clearing encrypted credentials:", error);
  }
};

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const initialLoadRef = React.useRef(true);
  const [state, setState] = useState({
    host: serverConfig.apiUrl,
    email: "",
    password: "",
    rememberMe: false,
    loading: false,
    error: "",
    useRemoteUrl: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginProgress, setLoginProgress] = useState({
    step: 0,
    totalSteps: 5,
    currentStep: "",
    progress: 0,
  });
  const { showNotification } = useNotification();

  // CRITICAL: Disable sticky appbar mode when Login page is shown
  // This ensures the login form is fully visible and accessible
  useEffect(() => {
    const disableStickyForLogin = async () => {
      if (stickyAppbarService.isAvailable()) {
        const result = await stickyAppbarService.disableForAuth();
        if (result.wasEnabled) {
          console.log('[Login] Disabled sticky appbar for authentication');
        }
      }
    };

    disableStickyForLogin();
  }, []);

  useEffect(() => {
    const handlers = {
      registered: (data) => {
        console.log("SIP Registration successful", data);
        // Don't navigate immediately - let the login flow complete
        setLoginProgress((prev) => ({
          ...prev,
          step: 3,
          currentStep: "SIP registration confirmed",
          progress: 60,
        }));
      },
      unregistered: () => {
        console.log("SIP unregistered");
        // Only handle if we're not in the middle of login
        if (!state.loading) {
          // CRITICAL: Clear authentication flag if not during login
          if (window.isAuthenticating) {
            window.isAuthenticating = false;
          }

          setState((prev) => ({
            ...prev,
            loading: false,
            error: "SIP connection lost",
          }));
          showNotification({
            message: "Phone system connection lost",
            severity: "warning",
          });
        }
      },
      registration_failed: (error) => {
        console.error("SIP registration failed:", error);
        // Only handle if we're not in the middle of login
        if (!state.loading) {
          // CRITICAL: Clear authentication flag if not during login
          if (window.isAuthenticating) {
            window.isAuthenticating = false;
          }
          handleSIPRegistrationFailure(error);
        }
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      sipService.events.on(event, handler);
    });

    return () => {
      // Remove event listeners
      Object.entries(handlers).forEach(([event, handler]) => {
        sipService.events.off(event, handler);
      });
    };
  }, [showNotification, state.loading]); // Add state.loading to dependencies

  const handleSIPRegistrationSuccess = () => {
    // Navigate in React Router
    navigate("/appbar");
  };

  const handleSIPRegistrationFailure = (error) => {
    // CRITICAL: Clear authentication flag on SIP registration failure
    window.isAuthenticating = false;

    setState((prev) => ({
      ...prev,
      loading: false,
      error: `SIP registration failed: ${error.cause || error.message}`,
    }));
    showNotification({
      message: `Phone system registration failed: ${error.cause || error.message
        }`,
      severity: "error",
      duration: null,
    });
  };

  // Streamlined login process with clear steps
  const handleSubmit = async (e) => {
    e.preventDefault();

    // CRITICAL: Reset all logout flags and set authentication flag
    window.isLoggingOut = false;
    window.isDisconnecting = false;
    window.isCleaningUp = false;
    window.logoutInProgress = false;
    window.apiCallsBlocked = false;
    window.isAuthenticating = true;

    console.log(
      "🔓 Login process: All logout flags reset, authentication started"
    );

    // Reset progress
    setLoginProgress({
      step: 0,
      totalSteps: 5,
      currentStep: "Starting login process...",
      progress: 0,
    });

    setState((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      // STEP 1: Authenticate with backend
      setLoginProgress((prev) => ({
        ...prev,
        step: 1,
        currentStep: "Authenticating with server...",
        progress: 20,
      }));

      const loginResponse = await fetch(`${state.host}/api/users/agent-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${state.email}:${state.password}`)}`,
        },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
          isSoftphone: true,
        }),
      });

      const responseData = await loginResponse.json();

      if (!responseData.success) {
        throw new Error(responseData.message || "Login failed");
      }

      const { user, mongoUser, tokens } = responseData.data;

      // Store user data immediately
      storageService.setUserData({
        user,
        mongoUser,
        tokens,
      });

      storageService.setAuthToken(tokens.sip);
      localStorage.setItem("mongoToken", tokens.mongo);

      // Clear logout flag on successful login
      clearLogoutFlag();

      // CRITICAL: Persist the server host and protocol settings
      // This ensures serverConfig.apiUrl uses the correct protocol (http vs https)
      serverConfig.setServerHost(state.host);
      // STEP 2: Validate configuration
      setLoginProgress((prev) => ({
        ...prev,
        step: 2,
        currentStep: "Validating phone system configuration...",
        progress: 40,
      }));

      // CRITICAL: Validate all required data before proceeding
      if (!tokens.sip) {
        throw new Error(
          "SIP token is missing - cannot initialize phone system"
        );
      }

      if (!user?.pjsip?.server || !user?.extension || !user?.pjsip?.password) {
        throw new Error("Incomplete phone system configuration");
      }

      // STEP 3: Initialize SIP service
      setLoginProgress((prev) => ({
        ...prev,
        step: 3,
        currentStep: "Initializing phone system...",
        progress: 60,
      }));

      console.log("🚀 Starting SIP service initialization...");

      // Use the same server for WebSocket as the SIP registrar
      const wsUrl = serverConfig.isDevelopment
        ? `ws://${user.pjsip.server}:8088/ws`
        : serverConfig.sipWsUrl;

      console.log("SIP config:", {
        extension: user.extension,
        server: user.pjsip.server,
        ws_servers: wsUrl,
      });

      await sipService.initialize({
        extension: user.extension,
        pjsip: {
          server: user.pjsip.server,
          password: user.pjsip.password,
          ice_servers: user.pjsip.ice_servers,
          ws_servers: wsUrl,
        },
        apiUrl: state.host,
        token: tokens.sip,
      });

      console.log("✅ SIP service initialized successfully");

      // STEP 4: Wait for SIP registration with timeout
      setLoginProgress((prev) => ({
        ...prev,
        step: 4,
        currentStep: "Connecting to phone system...",
        progress: 80,
      }));

      const registrationResult = await waitForSIPRegistration(30000); // 30 second timeout

      if (!registrationResult.success) {
        throw new Error(
          `Phone system connection failed: ${registrationResult.error}`
        );
      }

      // STEP 5: Notify backend and complete login
      setLoginProgress((prev) => ({
        ...prev,
        step: 5,
        currentStep: "Finalizing connection...",
        progress: 100,
      }));

      // Small delay to ensure SIP is fully registered
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Notify backend that agent is online
      try {
        const response = await fetch(
          `${serverConfig.apiUrl}/api/users/agent-online`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokens.sip}`,
            },
            body: JSON.stringify({
              extension: user.extension,
              contactUri: `sip:${user.extension}@${user.pjsip.server}`,
            }),
          }
        );

        if (!response.ok) {
          console.warn(
            "Backend notification failed, but continuing with login"
          );
        } else {
          const data = await response.json();
          if (data.success) {
            console.log(
              "✅ Backend notified of agent online status successfully"
            );
          }
        }
      } catch (backendError) {
        console.warn(
          "Backend notification failed, but continuing with login:",
          backendError
        );
        // Continue with login even if backend notification fails
      }

      // Complete login
      console.log("✅ Login process completed successfully");

      // Store encrypted credentials if remember me is checked
      if (state.rememberMe) {
        const success = storeEncryptedCredentials(
          state.email,
          state.password,
          state.host
        );
        if (success) {
          console.log(
            "✅ Credentials saved securely for future logins (Remember Me enabled)"
          );
        } else {
          console.warn("⚠️ Failed to save credentials securely");
        }
      } else {
        // Clear any existing encrypted credentials if remember me is unchecked
        console.log(
          "ℹ️ Remember Me is disabled, clearing any existing credentials"
        );
        clearEncryptedCredentials();
      }

      // CRITICAL: Clear authentication flag after successful login
      window.isAuthenticating = false;

      onLoginSuccess(user);

      // Navigate after successful completion
      handleSIPRegistrationSuccess();
    } catch (error) {
      console.error("Login error:", error);

      // CRITICAL: Clear all flags on login failure
      window.isAuthenticating = false;
      window.isLoggingOut = false;
      window.isDisconnecting = false;
      window.isCleaningUp = false;
      window.logoutInProgress = false;
      window.apiCallsBlocked = false;

      console.log("🔓 Login failed: All flags reset for retry");

      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to login",
      }));
      showNotification({
        message: error.message || "Login failed",
        severity: "error",
      });
    }
  };

  // Robust SIP registration waiting function
  const waitForSIPRegistration = (timeoutMs = 30000) => {
    return new Promise((resolve) => {
      let resolved = false;
      const startTime = Date.now();

      // Method 1: Event-based registration (preferred)
      const onRegistered = (data) => {
        if (!resolved) {
          resolved = true;
          console.log("✅ SIP registration confirmed via event");
          resolve({ success: true, method: "event", data });
        }
      };

      // Method 2: Polling with timeout
      const checkRegistration = () => {
        if (resolved) return;

        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
          if (!resolved) {
            resolved = true;
            console.error("❌ SIP registration timeout");

            // CRITICAL: Clear all flags on timeout
            window.isAuthenticating = false;
            window.isLoggingOut = false;
            window.isDisconnecting = false;
            window.isCleaningUp = false;
            window.logoutInProgress = false;
            window.apiCallsBlocked = false;

            resolve({
              success: false,
              error: "Registration timeout - phone system not responding",
              method: "timeout",
            });
          }
          return;
        }

        // Check multiple registration indicators
        const registrationState = sipService.state?.registrationState;
        const registererState = sipService.state?.registerer?.state;
        const isRegistered = sipService.state?.registerer?.registered;

        const isActuallyRegistered =
          registrationState === "Registered" ||
          registererState === "Registered" ||
          isRegistered === true;

        if (isActuallyRegistered) {
          if (!resolved) {
            resolved = true;
            console.log("✅ SIP registration confirmed via polling");
            resolve({ success: true, method: "polling" });
          }
        } else {
          // Continue polling
          setTimeout(checkRegistration, 1000);
        }
      };

      // Start both approaches
      sipService.events.on("registered", onRegistered);
      checkRegistration();

      // Cleanup function
      const cleanup = () => {
        sipService.events.off("registered", onRegistered);

        // CRITICAL: Clear all flags if cleanup happens without resolution
        if (!resolved) {
          window.isAuthenticating = false;
          window.isLoggingOut = false;
          window.isDisconnecting = false;
          window.isCleaningUp = false;
          window.logoutInProgress = false;
          window.apiCallsBlocked = false;
        }
      };

      // Ensure cleanup happens
      setTimeout(() => {
        if (!resolved) {
          cleanup();
        }
      }, timeoutMs + 1000);
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Remember me functionality - load encrypted credentials
  useEffect(() => {
    const rememberMe = localStorage.getItem("rememberMe") === "true";

    if (rememberMe) {
      const credentials = getEncryptedCredentials();
      if (credentials && credentials.email && credentials.host) {
        setState((prev) => ({
          ...prev,
          host: credentials.host,
          email: credentials.email,
          password: credentials.password,
          rememberMe: true,
        }));
        console.log(
          "✅ Encrypted credentials loaded successfully for Remember Me"
        );
      } else {
        // Clear remember me flag if credentials are invalid or expired
        console.log(
          "⚠️ Remember Me was enabled but credentials are invalid or expired"
        );
        setState((prev) => ({
          ...prev,
          rememberMe: false,
        }));
        clearEncryptedCredentials();
      }
    } else {
      console.log("ℹ️ Remember Me is not enabled");
    }
    // Mark initial load as complete to allow credential clearing on user toggle
    initialLoadRef.current = false;
  }, []);

  // Handle remember me toggle - clear encrypted credentials when unchecked
  // Skip the first render to prevent race condition with credential restoration
  const isFirstRememberMeRenderRef = React.useRef(true);
  useEffect(() => {
    // Skip the first render - this prevents clearing credentials before they're loaded
    if (isFirstRememberMeRenderRef.current) {
      isFirstRememberMeRenderRef.current = false;
      return;
    }
    // Only clear when user explicitly unchecks (not on initial mount)
    if (!state.rememberMe) {
      clearEncryptedCredentials();
    }
  }, [state.rememberMe]);

  useEffect(() => {
    // Clear any lingering logout flag when Login component mounts
    if (window.isLoggingOut) {
      console.log("Clearing logout flag from previous session");
      window.isLoggingOut = false;
    }

    // Note: We don't clear encrypted credentials on logout anymore
    // The "Remember Me" functionality should persist across logout/login cycles
    // Credentials are only cleared when:
    // 1. User unchecks "Remember Me" checkbox
    // 2. Credentials expire (after 30 days)
    // 3. User explicitly logs out with "Forget Me" option (if implemented)

    // Check for existing session
    const checkSession = () => {
      const token = storageService.getAuthToken();
      const userData = storageService.getUserData();

      if (token && userData?.user) {
        // If we have both token and user data, attempt to reconnect SIP
        sipService
          .initialize({
            extension: userData.user.extension,
            pjsip: userData.user.pjsip,
            apiUrl: state.host,
            token: token,
          })
          .catch((error) => {
            console.error("Session restore failed:", error);
            storageService.clear();
          });
      }
    };

    checkSession();
  }, [state.host]);

  useEffect(() => {
    const loadUrlPreference = async () => {
      const savedPreference = localStorage.getItem("useRemoteUrl");
      if (savedPreference !== null) {
        const useRemote = savedPreference === "true";
        setState((prev) => ({ ...prev, useRemoteUrl: useRemote }));
        // Don't send message here, just update state
      } else {
        const { useRemoteUrl } = await ipcRenderer.invoke("get-url-preference");
        setState((prev) => ({ ...prev, useRemoteUrl: useRemoteUrl }));
        // Store the initial preference
        localStorage.setItem("useRemoteUrl", useRemoteUrl.toString());
      }
    };

    loadUrlPreference();
  }, []);

  const handleUrlPreferenceChange = async (e) => {
    const useRemote = e.target.checked;
    setState((prev) => ({ ...prev, useRemoteUrl: useRemote }));
    localStorage.setItem("useRemoteUrl", useRemote.toString());

    // Send message to main process and wait for window reload
    try {
      await ipcRenderer.send("set-url-preference", useRemote);
    } catch (error) {
      console.error("Failed to switch URL mode:", error);
      showNotification({
        message: "Failed to switch URL mode",
        severity: "error",
      });
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="title"
          style={{
            marginTop: "20px",
          }}
        >Bazo Tech</h1>
        <img src={maydaylogo} alt="Mayday Logo" className="logo" />
        <h2 className="subtitle">Sign In</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="host">Host</label>
            <input
              type="text"
              name="host"
              id="host"
              value={state.host}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              value={state.email}
              onChange={handleChange}
              required
            />
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              marginBottom: "16px",
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              value={state.password}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "8px 35px 8px 8px",
                boxSizing: "border-box",
                borderRadius: "4px",
                border: "1px solid #cec",
                fontSize: "16px",
                outline: "none",
                height: "48px",
              }}
            />
            <FontAwesomeIcon
              icon={showPassword ? faEyeSlash : faEye}
              onClick={togglePasswordVisibility}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#666",
                zIndex: 1,
              }}
            />
          </div>

          {/* Login Progress Display */}
          {state.loading && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ mb: 1, color: "#0376ac", fontWeight: "medium" }}
              >
                {loginProgress.currentStep}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={loginProgress.progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(0,0,0,0.1)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#0376ac",
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ mt: 1, display: "block", color: "#666" }}
              >
                Step {loginProgress.step} of {loginProgress.totalSteps}
              </Typography>
            </Box>
          )}

          <div className="settings-group" style={{ marginBottom: "16px" }}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.useRemoteUrl}
                  onChange={handleUrlPreferenceChange}
                  color="primary"
                />
              }
              style={{
                marginBottom: "1rem",
                display: "block",
                fontStyle: "italic",
                color: "#0376ac",
              }}
              label="Admin Mode"
            />
          </div>

          <div className="remember-me">
            <label style={{ fontSize: "14px", fontStyle: "italic" }}>
              <input
                type="checkbox"
                name="rememberMe"
                checked={state.rememberMe}
                onChange={handleChange}
                style={{
                  cursor: "pointer",
                  // Checkbox color
                  accentColor: "#0376ac",
                }}
              />
              Remember me!
            </label>
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="submit"
              disabled={state.loading}
              className="login-button"
            >
              {state.loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  <CircularProgress
                    size={24}
                    thickness={4}
                    sx={{ color: "#fff" }}
                  />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        {state.error && <div className="error-message">{state.error}</div>}

        <div className="version" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span>MaydayBar v{appPkg?.version || ""}</span>
          <AppUpdater variant="icon" />
        </div>
      </div>
    </div>
  );
};

Login.propTypes = {
  onLoginSuccess: PropTypes.func.isRequired,
};

export default Login;
